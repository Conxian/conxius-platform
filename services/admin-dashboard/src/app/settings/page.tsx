import { getConnectionEvidence, type ConnectionState } from "../../lib/connection-evidence";

const stateLabels: Record<ConnectionState, string> = {
  configured: "Configured",
  "not-configured": "Not configured",
  "external-evidence": "External evidence",
};

function StateBadge({ state }: { state: ConnectionState }) {
  return <span className={`status-badge status-${state}`}>{stateLabels[state]}</span>;
}

export default function ConxianStatusPage() {
  const connections = getConnectionEvidence();
  const configured = connections.filter((connection) => connection.state === "configured").length;
  const unresolved = connections.length - configured;

  return (
    <main className="settings-page status-page">
      <header className="settings-header">
        <p className="eyebrow">ConxianStatus · public operational view</p>
        <h1>Service status</h1>
        <p className="settings-intro">A transparent view of Conxian Labs services and dependencies. Configuration alone never counts as healthy; each service needs current authenticated evidence.</p>
      </header>

      <section className="status-hero" aria-labelledby="status-summary-title">
        <div>
          <p className="eyebrow">Current posture</p>
          <h2 id="status-summary-title">Operational surfaces are evidence-scoped</h2>
          <p>No active incident is declared from this static inventory. Provider-specific health remains unverified where the owning service has not supplied a live contract response.</p>
        </div>
        <div className="status-summary" aria-label="Status summary">
          <div><strong>{configured}</strong><span>configured</span></div>
          <div><strong>{unresolved}</strong><span>needs evidence</span></div>
        </div>
      </section>

      <section className="settings-panel" aria-labelledby="dependency-title">
        <div className="settings-panel-heading">
          <div><p className="eyebrow">Dependency register</p><h2 id="dependency-title">Service connections</h2></div>
          <span className="inventory-count">Checked at build time</span>
        </div>
        <div className="connection-list">
          {connections.map((connection) => (
            <article className="connection-row" key={connection.name}>
              <div><h3>{connection.name}</h3><p>{connection.contract}</p></div>
              <div className="connection-meta"><span>{connection.owner}</span><StateBadge state={connection.state} /></div>
              <p className="connection-action">{connection.nextAction}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="settings-panel settings-guidance" aria-labelledby="incident-title">
        <p className="eyebrow">Incident communication</p>
        <h2 id="incident-title">No incident declared</h2>
        <p>For an outage or degraded dependency, record the affected service, observed timestamps, evidence URL, customer impact, owner, mitigation, and next update. Do not paste credentials or personal data into an incident record.</p>
        <div className="status-links"><a href="/support">Open support</a><a href="/services">Review service catalog</a></div>
      </section>
    </main>
  );
}

export { ConxianStatusPage };
