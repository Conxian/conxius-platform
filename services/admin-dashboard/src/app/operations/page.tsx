import { getConnectionEvidence } from "../../lib/connection-evidence";

export const metadata = {
  title: "Service Operations | Conxian Admin",
  description: "ITIL 4-aligned incident, request, problem, change, and improvement controls.",
};

const practices = [
  ["Incident management", "Detect and restore service when Gateway, Nexus, or a provider fails.", "Open incident"],
  ["Service request management", "Route supported operational requests to the correct repository owner.", "Create request"],
  ["Problem management", "Track recurring failures, root-cause ownership, and corrective actions.", "Review problems"],
  ["Change enablement", "Require an OpenSpec proposal, impact scope, rollback, and post-change evidence.", "Review changes"],
  ["Monitoring and event management", "Observe health, freshness, and contract evidence without synthetic status.", "View events"],
  ["Continual improvement", "Turn gaps into accountable actions with evidence and review dates.", "Open backlog"],
];

export default function OperationsPage() {
  const connections = getConnectionEvidence();
  return (
    <div className="reality-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">ITIL 4 · Service management</p>
          <h1>Service operations</h1>
          <p>A practical control surface for operating the services we can actually serve. Actions remain gated by owner, contract, authorization, and evidence.</p>
        </div>
        <div className="reality-card connection-summary">
          <span className="eyebrow">Known service items</span>
          <strong className="reality-value">{connections.length}</strong>
        </div>
      </header>
      <section className="source-state">
        <span className="source-state__dot" aria-hidden="true" />
        <div>
          <strong>Operational truth</strong>
          <p>Configured connections are not asserted healthy until the provider returns authenticated, fresh, contract-valid evidence.</p>
        </div>
      </section>
      <section className="reality-grid" aria-label="ITIL service management practices">
        {practices.map(([title, description, action]) => (
          <article className="reality-card" key={title}>
            <p className="eyebrow">Practice</p>
            <h3>{title}</h3>
            <p>{description}</p>
            <button className="action-button" type="button" disabled aria-disabled="true">{action} · evidence required</button>
          </article>
        ))}
      </section>
      <section className="evidence-list" aria-labelledby="operations-sources">
        <div className="section-heading">
          <p className="eyebrow">Configuration items</p>
          <h2 id="operations-sources">Operational source register</h2>
        </div>
        {connections.map((connection) => (
          <div className="evidence-row" key={connection.name}>
            <div><strong>{connection.name}</strong><p>{connection.owner} · {connection.contract}</p></div>
            <span>{connection.state}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
