import {
  isRotatableServiceId,
  type RotatableServiceId,
} from "../support/m2mKeyTypes";

export type SidlOutcome = "success" | "client_error" | "server_error";

export type PaymentHeaderCategory = "missing" | "invalid" | "accepted";

export type M2MMetricKeyRole = "active" | "previous";
export type M2MMetricOutcome =
  | "success"
  | "invalid"
  | "expired"
  | "conflict"
  | "rejected"
  | "unavailable"
  | "failure";
export type M2MExpiryThreshold = "30d" | "7d" | "24h" | "1h" | "expired";
export type M2MRegistryFailureStage =
  | "bootstrap"
  | "mutation"
  | "threshold"
  | "recovery"
  | "storage"
  | "lock";
export type M2MRegistryFailureCategory =
  | "busy"
  | "read"
  | "write"
  | "flush"
  | "cleanup"
  | "permission"
  | "malformed"
  | "invariant"
  | "pre_marker"
  | "post_marker";

export interface M2MMetricServiceState {
  serviceId: RotatableServiceId;
  generation: number;
  activeExpiresAt: string | null;
  previousEffectiveUntil: string | null;
}

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

type GaugeSeries = {
  labels: Labels;
  value: number;
};

type SidlMetricsStore = {
  sidlRequestsTotal: Map<string, CounterSeries>;
  sidlRequestDurationSeconds: Map<string, HistogramSeries>;
  sidlFailuresTotal: Map<string, CounterSeries>;
  sidlCheckoutPaymentHeaderTotal: Map<string, CounterSeries>;
  m2mServiceKeyExpiryTimestampSeconds: Map<string, GaugeSeries>;
  m2mServiceKeyRotationTotal: Map<string, CounterSeries>;
  m2mServiceKeyRollbackTotal: Map<string, CounterSeries>;
  m2mServiceKeyValidationTotal: Map<string, CounterSeries>;
  m2mServiceKeyGeneration: Map<string, GaugeSeries>;
  m2mServiceKeyExpiryThresholdTotal: Map<string, CounterSeries>;
  m2mServiceKeyRegistryWriteFailuresTotal: Map<string, CounterSeries>;
  m2mServiceKeyRegistryReady: number;
  m2mServiceKeyRegistryRevision: number | null;
};

const STORE_KEY = "__conxianSidlMetricsStore" as const;
const PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";
const DURATION_BUCKETS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5] as const;

function getMetricsStore(): SidlMetricsStore {
  const scope = globalThis as unknown as Record<string, unknown>;
  const existing = scope[STORE_KEY];

  if (existing && typeof existing === "object") {
    const store = existing as Partial<SidlMetricsStore>;
    store.m2mServiceKeyExpiryTimestampSeconds ??= new Map<string, GaugeSeries>();
    store.m2mServiceKeyRotationTotal ??= new Map<string, CounterSeries>();
    store.m2mServiceKeyRollbackTotal ??= new Map<string, CounterSeries>();
    store.m2mServiceKeyValidationTotal ??= new Map<string, CounterSeries>();
    store.m2mServiceKeyGeneration ??= new Map<string, GaugeSeries>();
    store.m2mServiceKeyExpiryThresholdTotal ??= new Map<string, CounterSeries>();
    store.m2mServiceKeyRegistryWriteFailuresTotal ??= new Map<string, CounterSeries>();
    store.m2mServiceKeyRegistryReady = store.m2mServiceKeyRegistryReady === 1 ? 1 : 0;
    if (
      store.m2mServiceKeyRegistryReady === 0 ||
      typeof store.m2mServiceKeyRegistryRevision !== "number" ||
      store.m2mServiceKeyRegistryRevision < 1
    ) {
      store.m2mServiceKeyRegistryRevision = null;
    }
    return store as SidlMetricsStore;
  }

  const initialized: SidlMetricsStore = {
    sidlRequestsTotal: new Map<string, CounterSeries>(),
    sidlRequestDurationSeconds: new Map<string, HistogramSeries>(),
    sidlFailuresTotal: new Map<string, CounterSeries>(),
    sidlCheckoutPaymentHeaderTotal: new Map<string, CounterSeries>(),
    m2mServiceKeyExpiryTimestampSeconds: new Map<string, GaugeSeries>(),
    m2mServiceKeyRotationTotal: new Map<string, CounterSeries>(),
    m2mServiceKeyRollbackTotal: new Map<string, CounterSeries>(),
    m2mServiceKeyValidationTotal: new Map<string, CounterSeries>(),
    m2mServiceKeyGeneration: new Map<string, GaugeSeries>(),
    m2mServiceKeyExpiryThresholdTotal: new Map<string, CounterSeries>(),
    m2mServiceKeyRegistryWriteFailuresTotal: new Map<string, CounterSeries>(),
    m2mServiceKeyRegistryReady: 0,
    m2mServiceKeyRegistryRevision: null,
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

function setGauge(store: Map<string, GaugeSeries>, labels: Labels, value: number): void {
  const key = labelsKey(labels);
  store.set(key, { labels: { ...labels }, value });
}

function deleteGauge(store: Map<string, GaugeSeries>, labels: Labels): void {
  store.delete(labelsKey(labels));
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

function renderGaugeMetric(name: string, help: string, values: Map<string, GaugeSeries>): string {
  const lines: string[] = [];
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} gauge`);

  const ordered = Array.from(values.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [, series] of ordered) {
    lines.push(`${name}${labelsToPrometheus(series.labels)} ${series.value}`);
  }

  return lines.join("\n");
}

function renderScalarGaugeMetric(name: string, help: string, value: number): string {
  return [
    `# HELP ${name} ${help}`,
    `# TYPE ${name} gauge`,
    `${name} ${value}`,
  ].join("\n");
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

export function recordM2MRegistryState(
  revision: number,
  services: readonly M2MMetricServiceState[],
): void {
  if (!Number.isSafeInteger(revision) || revision < 1) return;

  const store = getMetricsStore();
  store.m2mServiceKeyRegistryReady = 1;
  store.m2mServiceKeyRegistryRevision = revision;

  for (const service of services) {
    if (
      !isRotatableServiceId(service.serviceId) ||
      !Number.isSafeInteger(service.generation) ||
      service.generation <= 0
    ) {
      continue;
    }

    setGauge(
      store.m2mServiceKeyGeneration,
      { service_id: service.serviceId },
      service.generation,
    );

    const activeLabels = { service_id: service.serviceId, key_role: "active" };
    if (service.activeExpiresAt) {
      const activeTimestamp = Date.parse(service.activeExpiresAt) / 1000;
      if (Number.isFinite(activeTimestamp) && activeTimestamp >= 0) {
        setGauge(store.m2mServiceKeyExpiryTimestampSeconds, activeLabels, activeTimestamp);
      }
    } else {
      deleteGauge(store.m2mServiceKeyExpiryTimestampSeconds, activeLabels);
    }

    const previousLabels = { service_id: service.serviceId, key_role: "previous" };
    if (service.previousEffectiveUntil) {
      const previousTimestamp = Date.parse(service.previousEffectiveUntil) / 1000;
      if (Number.isFinite(previousTimestamp) && previousTimestamp >= 0) {
        setGauge(store.m2mServiceKeyExpiryTimestampSeconds, previousLabels, previousTimestamp);
      }
    } else {
      deleteGauge(store.m2mServiceKeyExpiryTimestampSeconds, previousLabels);
    }
  }
}

export function recordM2MRegistryUnavailable(): void {
  const store = getMetricsStore();
  store.m2mServiceKeyRegistryReady = 0;
  store.m2mServiceKeyRegistryRevision = null;
  store.m2mServiceKeyGeneration.clear();
  store.m2mServiceKeyExpiryTimestampSeconds.clear();
}

export function recordM2MRotationOutcome(
  serviceId: RotatableServiceId,
  outcome: M2MMetricOutcome,
): void {
  if (!isRotatableServiceId(serviceId)) return;
  incrementCounter(getMetricsStore().m2mServiceKeyRotationTotal, {
    service_id: serviceId,
    outcome,
  });
}

export function recordM2MRollbackOutcome(
  serviceId: RotatableServiceId,
  outcome: M2MMetricOutcome,
): void {
  if (!isRotatableServiceId(serviceId)) return;
  incrementCounter(getMetricsStore().m2mServiceKeyRollbackTotal, {
    service_id: serviceId,
    outcome,
  });
}

export function recordM2MValidationOutcome(
  serviceId: RotatableServiceId,
  outcome: M2MMetricOutcome,
): void {
  if (!isRotatableServiceId(serviceId)) return;
  incrementCounter(getMetricsStore().m2mServiceKeyValidationTotal, {
    service_id: serviceId,
    outcome,
  });
}

export function recordM2MExpiryThresholdCrossed(
  serviceId: RotatableServiceId,
  keyRole: M2MMetricKeyRole,
  threshold: M2MExpiryThreshold,
): void {
  if (!isRotatableServiceId(serviceId)) return;
  incrementCounter(getMetricsStore().m2mServiceKeyExpiryThresholdTotal, {
    service_id: serviceId,
    key_role: keyRole,
    threshold,
  });
}

export function recordM2MRegistryWriteFailure(
  stage: M2MRegistryFailureStage,
  category: M2MRegistryFailureCategory,
): void {
  incrementCounter(getMetricsStore().m2mServiceKeyRegistryWriteFailuresTotal, {
    stage,
    category,
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
    renderGaugeMetric(
      "m2m_service_key_expiry_timestamp_seconds",
      "Unix expiry timestamp for finite M2M service-key roles.",
      store.m2mServiceKeyExpiryTimestampSeconds,
    ),
    renderCounterMetric(
      "m2m_service_key_rotation_total",
      "M2M service-key rotation outcomes by service and fixed outcome.",
      store.m2mServiceKeyRotationTotal,
    ),
    renderCounterMetric(
      "m2m_service_key_rollback_total",
      "M2M service-key rollback outcomes by service and fixed outcome.",
      store.m2mServiceKeyRollbackTotal,
    ),
    renderCounterMetric(
      "m2m_service_key_validation_total",
      "M2M service-key validation outcomes by service and fixed outcome.",
      store.m2mServiceKeyValidationTotal,
    ),
    renderGaugeMetric(
      "m2m_service_key_generation",
      "Current M2M service-key generation by service.",
      store.m2mServiceKeyGeneration,
    ),
    renderScalarGaugeMetric(
      "m2m_service_key_registry_ready",
      "Whether the M2M service-key registry is ready for authenticated operations.",
      store.m2mServiceKeyRegistryReady,
    ),
    renderCounterMetric(
      "m2m_service_key_expiry_threshold_total",
      "Durably crossed M2M service-key expiry thresholds.",
      store.m2mServiceKeyExpiryThresholdTotal,
    ),
    renderCounterMetric(
      "m2m_service_key_registry_write_failures_total",
      "M2M service-key registry storage and write failures by fixed stage and category.",
      store.m2mServiceKeyRegistryWriteFailuresTotal,
    ),
  ];

  if (store.m2mServiceKeyRegistryRevision !== null) {
    metrics.splice(
      9,
      0,
      renderScalarGaugeMetric(
        "m2m_service_key_registry_revision",
        "Current M2M service-key registry revision.",
        store.m2mServiceKeyRegistryRevision,
      ),
    );
  }

  return Promise.resolve(`${metrics.join("\n\n")}\n`);
}

export function resetSidlMetricsForTests(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SIDL metrics test reset is not available in production");
  }

  const scope = globalThis as unknown as Record<string, unknown>;
  delete scope[STORE_KEY];
}
