export type SidlOutcome = "success" | "client_error" | "server_error";

export type PaymentHeaderCategory = "missing" | "invalid" | "accepted";

type ObserveSidlInput = {
  endpoint: string;
  method: string;
  startedAt: number;
  status: number;
  errorCategory?: string;
  paymentHeaderCategory?: PaymentHeaderCategory;
  error?: unknown;
};

type Labels = Record<string, string>;

type CounterSeries = {
  labels: Labels;
  value: number;
};

type HistogramSeries = {
  labels: Labels;
  bucketValues: number[];
  count: number;
  sum: number;
};

type SidlMetricsStore = {
  sidlRequestsTotal: Map<string, CounterSeries>;
  sidlRequestDurationSeconds: Map<string, HistogramSeries>;
  sidlFailuresTotal: Map<string, CounterSeries>;
  sidlCheckoutPaymentHeaderTotal: Map<string, CounterSeries>;
};

const STORE_KEY = "__conxianSidlMetricsStore" as const;
const PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";
const DURATION_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5] as const;

function getMetricsStore(): SidlMetricsStore {
  const scope = globalThis as unknown as Record<string, unknown>;
  const existing = scope[STORE_KEY];

  if (existing && typeof existing === "object") {
    return existing as SidlMetricsStore;
  }

  const initialized: SidlMetricsStore = {
    sidlRequestsTotal: new Map<string, CounterSeries>(),
    sidlRequestDurationSeconds: new Map<string, HistogramSeries>(),
    sidlFailuresTotal: new Map<string, CounterSeries>(),
    sidlCheckoutPaymentHeaderTotal: new Map<string, CounterSeries>(),
  };

  scope[STORE_KEY] = initialized;
  return initialized;
}

function labelsKey(labels: Labels): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

function escapeLabelValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, "\\\"");
}

function labelsToPrometheus(labels: Labels): string {
  const formatted = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${escapeLabelValue(value)}"`)
    .join(",");

  return `{${formatted}}`;
}

function incrementCounter(store: Map<string, CounterSeries>, labels: Labels, delta = 1): void {
  const key = labelsKey(labels);
  const existing = store.get(key);

  if (existing) {
    existing.value += delta;
    return;
  }

  store.set(key, {
    labels: { ...labels },
    value: delta,
  });
}

function observeHistogram(store: Map<string, HistogramSeries>, labels: Labels, value: number): void {
  const key = labelsKey(labels);
  const normalizedValue = Number.isFinite(value) && value >= 0 ? value : 0;

  let existing = store.get(key);
  if (!existing) {
    existing = {
      labels: { ...labels },
      bucketValues: new Array<number>(DURATION_BUCKETS.length).fill(0),
      count: 0,
      sum: 0,
    };
    store.set(key, existing);
  }

  existing.count += 1;
  existing.sum += normalizedValue;

  DURATION_BUCKETS.forEach((bucket, index) => {
    if (normalizedValue <= bucket) {
      existing.bucketValues[index] += 1;
    }
  });
}

function classifyOutcome(status: number): SidlOutcome {
  if (status >= 500) return "server_error";
  if (status >= 400) return "client_error";
  return "success";
}

function fallbackErrorCategory(status: number): string | null {
  if (status >= 500) return "server-error";
  if (status >= 400) return "client-error";
  return null;
}

function normalizeMethod(method: string): string {
  return method.toUpperCase();
}

function elapsedSeconds(startedAt: number): number {
  const seconds = (performance.now() - startedAt) / 1000;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
}

function toErrorDescriptor(error: unknown): { errorName: string; errorMessage: string } | null {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  if (error === undefined || error === null) {
    return null;
  }

  return {
    errorName: "non-error",
    errorMessage: String(error),
  };
}

function writeStructuredLog(input: ObserveSidlInput, outcome: SidlOutcome, durationSeconds: number): void {
  const payload: Record<string, unknown> = {
    event: "sidl.endpoint",
    endpoint: input.endpoint,
    method: normalizeMethod(input.method),
    status: input.status,
    outcome,
    latencyMs: Math.round(durationSeconds * 1000),
    observedAtIso: new Date().toISOString(),
  };

  if (input.errorCategory) {
    payload.errorCategory = input.errorCategory;
  }
  if (input.paymentHeaderCategory) {
    payload.paymentHeaderCategory = input.paymentHeaderCategory;
  }

  const errorDescriptor = toErrorDescriptor(input.error);
  if (errorDescriptor) {
    payload.errorName = errorDescriptor.errorName;
    payload.errorMessage = errorDescriptor.errorMessage;
  }

  const encoded = JSON.stringify(payload);

  if (input.status >= 500 || errorDescriptor) {
    console.error(encoded);
    return;
  }

  if (input.status >= 400) {
    console.warn(encoded);
    return;
  }

  console.info(encoded);
}

function renderCounterMetric(name: string, help: string, values: Map<string, CounterSeries>): string {
  const lines: string[] = [];
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} counter`);

  const ordered = Array.from(values.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [, series] of ordered) {
    lines.push(`${name}${labelsToPrometheus(series.labels)} ${series.value}`);
  }

  return lines.join("\n");
}

function renderHistogramMetric(name: string, help: string, values: Map<string, HistogramSeries>): string {
  const lines: string[] = [];
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} histogram`);

  const ordered = Array.from(values.entries()).sort(([a], [b]) => a.localeCompare(b));

  for (const [, series] of ordered) {
    const baseLabels = series.labels;

    DURATION_BUCKETS.forEach((bucket, index) => {
      lines.push(
        `${name}_bucket${labelsToPrometheus({
          ...baseLabels,
          le: String(bucket),
        })} ${series.bucketValues[index]}`
      );
    });

    lines.push(
      `${name}_bucket${labelsToPrometheus({
        ...baseLabels,
        le: "+Inf",
      })} ${series.count}`
    );

    lines.push(`${name}_sum${labelsToPrometheus(baseLabels)} ${series.sum}`);
    lines.push(`${name}_count${labelsToPrometheus(baseLabels)} ${series.count}`);
  }

  return lines.join("\n");
}

function observe(input: ObserveSidlInput): void {
  const store = getMetricsStore();

  const method = normalizeMethod(input.method);
  const outcome = classifyOutcome(input.status);
  const durationSeconds = elapsedSeconds(input.startedAt);

  incrementCounter(store.sidlRequestsTotal, {
    endpoint: input.endpoint,
    method,
    outcome,
    status_code: String(input.status),
  });

  observeHistogram(
    store.sidlRequestDurationSeconds,
    {
      endpoint: input.endpoint,
      method,
      outcome,
    },
    durationSeconds
  );

  const errorCategory = input.errorCategory ?? fallbackErrorCategory(input.status);
  if (errorCategory) {
    incrementCounter(store.sidlFailuresTotal, {
      endpoint: input.endpoint,
      method,
      category: errorCategory,
    });
  }

  if (input.paymentHeaderCategory) {
    incrementCounter(store.sidlCheckoutPaymentHeaderTotal, {
      endpoint: input.endpoint,
      category: input.paymentHeaderCategory,
    });
  }

  writeStructuredLog(
    {
      ...input,
      method,
      errorCategory: errorCategory ?? undefined,
    },
    outcome,
    durationSeconds
  );
}

export function startSidlTimer(): number {
  return performance.now();
}

export function observeSidlResponse(input: Omit<ObserveSidlInput, "error">): void {
  observe(input);
}

export function observeSidlException(input: {
  endpoint: string;
  method: string;
  startedAt: number;
  error: unknown;
  status?: number;
  errorCategory?: string;
  paymentHeaderCategory?: PaymentHeaderCategory;
}): void {
  observe({
    endpoint: input.endpoint,
    method: input.method,
    startedAt: input.startedAt,
    status: input.status ?? 500,
    errorCategory: input.errorCategory ?? "unhandled-exception",
    paymentHeaderCategory: input.paymentHeaderCategory,
    error: input.error,
  });
}

export function sidlMetricsContentType(): string {
  return PROMETHEUS_CONTENT_TYPE;
}

export function sidlMetricsSnapshot(): Promise<string> {
  const store = getMetricsStore();

  const metrics = [
    renderCounterMetric(
      "admin_dashboard_sidl_requests_total",
      "Total SIDL endpoint requests processed by admin-dashboard.",
      store.sidlRequestsTotal
    ),
    renderHistogramMetric(
      "admin_dashboard_sidl_request_duration_seconds",
      "Latency of SIDL endpoint requests in admin-dashboard.",
      store.sidlRequestDurationSeconds
    ),
    renderCounterMetric(
      "admin_dashboard_sidl_failures_total",
      "Total SIDL endpoint failures grouped by category.",
      store.sidlFailuresTotal
    ),
    renderCounterMetric(
      "admin_dashboard_sidl_checkout_payment_header_total",
      "Observed checkout payment-signature header categories.",
      store.sidlCheckoutPaymentHeaderTotal
    ),
  ];

  return Promise.resolve(`${metrics.join("\n\n")}\n`);
}
