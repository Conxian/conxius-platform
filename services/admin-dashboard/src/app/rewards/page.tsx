"use client";

import { useEffect, useState } from "react";

type RewardResponse = {
  total_revenue_sats?: number;
  revenue_sources?: Array<{ name: string; amount_sats: number; percentage: number; description: string }>;
  last_updated?: string;
};

export default function RewardsPage() {
  const [data, setData] = useState<RewardResponse | null>(null);
  const [state, setState] = useState<"loading" | "live" | "unavailable">("loading");

  async function loadSources() {
    setState("loading");
    try {
      const response = await fetch("/api/v1/rewards/sources", { cache: "no-store" });
      if (!response.ok) throw new Error("Source unavailable");
      setData((await response.json()) as RewardResponse);
      setState("live");
    } catch {
      setData(null);
      setState("unavailable");
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  return (
    <div className="reality-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Provider evidence / optional capability</p>
          <h1>Reward sources</h1>
          <p>Read-only visibility into an external provider. This platform does not own revenue, treasury, yield, pricing, or payouts.</p>
        </div>
        <button className="action-button" onClick={loadSources} disabled={state === "loading"}>
          {state === "loading" ? "Checking…" : "Check source"}
        </button>
      </header>

      <section className={`source-state source-state--${state}`} aria-live="polite">
        <span className="source-state__dot" aria-hidden="true" />
        <div>
          <strong>{state === "live" ? "Provider response received" : state === "loading" ? "Checking configured source" : "Source unavailable"}</strong>
          <p>{state === "live" ? `Last reported ${data?.last_updated ?? "without timestamp"}. Values are provider-owned and not platform accounting.` : "No values are fabricated when the external source is unavailable or unverified."}</p>
        </div>
      </section>

      {state === "live" && data ? (
        <div className="reality-grid">
          <article className="reality-card">
            <span className="eyebrow">Provider-reported total</span>
            <strong className="reality-value">{data.total_revenue_sats?.toLocaleString() ?? "—"}</strong>
            <p>sats · informational only</p>
          </article>
          <article className="reality-card">
            <span className="eyebrow">Observed source records</span>
            <strong className="reality-value">{data.revenue_sources?.length ?? 0}</strong>
            <p>reported by the external provider</p>
          </article>
        </div>
      ) : (
        <section className="empty-state">
          <span className="eyebrow">No verified data</span>
          <h2>There is nothing to display yet.</h2>
          <p>Connect and verify the owning provider before showing financial or reward data. Platform availability is not evidence of treasury ownership.</p>
        </section>
      )}

      {state === "live" && data?.revenue_sources?.length ? (
        <section className="evidence-list">
          <div className="section-heading"><span className="eyebrow">Observed records</span><h2>Source evidence</h2></div>
          {data.revenue_sources.map((source) => (
            <article className="evidence-row" key={source.name}>
              <div><strong>{source.name}</strong><p>{source.description}</p></div>
              <span>{source.percentage}% · {source.amount_sats.toLocaleString()} sats</span>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
