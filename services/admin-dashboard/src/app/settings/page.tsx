import { getConnectionEvidence } from "../../lib/connection-evidence";
import { getLiveProviderStatus, type LiveState } from "../../lib/live-provider-status";

const labels: Record<LiveState, string> = { reachable: "Reachable", degraded: "Degraded", unavailable: "Unavailable", "not-configured": "Not configured" };

export const dynamic = "force-dynamic";

export default async function ConxianStatusPage() {
  const [evidence, live] = await Promise.all([Promise.resolve(getConnectionEvidence()), getLiveProviderStatus()]);
  const liveByName = new Map(live.map((item) => [item.name, item]));
  const reachable = live.filter((item) => item.state === "reachable").length;

  return (
    <main className="settings-page status-page">
      <header className="settings-header"><p className="eyebrow">ConxianStatus · live operational view</p><h1>Platform status</h1><p className="settings-intro">Bounded connectivity evidence for platform services and external providers. Configuration alone never counts as healthy.</p></header>
      <section className="status-hero" aria-labelledby="status-summary-title"><div><p className="eyebrow">Current posture</p><h2 id="status-summary-title">Live evidence, safely reported</h2><p>Each configured endpoint is checked with a five-second timeout. Credentials and response bodies are never exposed.</p><div className="status-links"><a href="/connections">Connection contracts</a><a href="/operations">Operations</a><a href="/api/status">Machine-readable status</a></div></div><div className="status-summary" aria-label="Status summary"><div><strong>{reachable}</strong><span>reachable</span></div><div><strong>{live.length - reachable}</strong><span>needs attention</span></div></div></section>
      <section className="settings-panel" aria-labelledby="dependency-title"><div className="settings-panel-heading"><div><p className="eyebrow">Dependency register</p><h2 id="dependency-title">Service connections</h2></div><span className="inventory-count">Checked live at request time</span></div><div className="connection-list">{evidence.map((connection) => { const current = liveByName.get(connection.name); const state = current?.state ?? "not-configured"; return <article className="connection-row" key={connection.name}><div><h3>{connection.name}</h3><p>{connection.contract}</p><p>{current?.detail ?? connection.nextAction}</p></div><div className="connection-meta"><span>{current?.latencyMs == null ? "—" : `${current.latencyMs} ms`}</span><span className={`status-badge status-${state}`}>{labels[state]}</span></div></article>; })}</div></section>
      <section className="settings-panel settings-guidance" aria-labelledby="boundary-title"><p className="eyebrow">Platform boundary</p><h2 id="boundary-title">What this page can prove</h2><p>The platform can report whether a declared endpoint responded within a bounded window. Provider execution, protocol authority, custody, wallet operations, and business data remain owned by their respective services.</p><div className="status-links"><a href="/support">Open support</a><a href="/services">Review service catalog</a></div></section>
    </main>
  );
}

export { ConxianStatusPage };
