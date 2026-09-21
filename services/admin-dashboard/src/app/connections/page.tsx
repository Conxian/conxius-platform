import { getConnectionEvidence } from "../../lib/connection-evidence";

export const metadata = {
  title: "Connections | Conxian Admin",
  description: "Evidence-scoped connection status for platform services and providers.",
};

export default function ConnectionsPage() {
  const connections = getConnectionEvidence();
  const configured = connections.filter((connection) => connection.state === "configured").length;

  return (
    <div className="reality-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">ITIL 4 · Service configuration management</p>
          <h1>Connection evidence</h1>
          <p>Configuration presence is not the same as a verified live connection. This page reports only what the platform can safely establish.</p>
        </div>
        <div className="reality-card">
          <span className="eyebrow">Configured variables</span>
          <strong className="reality-value">{configured}/{connections.length}</strong>
        </div>
      </header>

      <div className="source-state">
        <span className="source-state__dot" aria-hidden="true" />
        <div>
          <strong>Fail-closed operating rule</strong>
          <p>No credentials, response bodies, balances, keys, or provider claims are displayed here. A configured variable still requires endpoint health and contract evidence.</p>
        </div>
      </div>

      <section className="evidence-list" aria-labelledby="connections-title">
        <div className="section-heading">
          <p className="eyebrow">Service configuration items</p>
          <h2 id="connections-title">End-to-end connection register</h2>
        </div>
        {connections.map((connection) => (
          <article className="evidence-row" key={connection.name}>
            <div>
              <strong>{connection.name}</strong>
              <p>{connection.contract}</p>
              <p><span className="service-tile__owner">Owner: {connection.owner}</span> · {connection.boundary}</p>
              <p>Next: {connection.nextAction}</p>
            </div>
            <span>{connection.state === "configured" ? "configured · unverified" : "not configured"}</span>
          </article>
        ))}
      </section>

      <section className="reality-grid" aria-label="ITIL operating practices">
        {[
          ["Incident management", "Capture impact, source, timestamp, and safe remediation without hiding provider failures."],
          ["Service request management", "Expose only supported requests with an owner, approval path, and completion evidence."],
          ["Problem management", "Link recurring failures to a known error, root-cause owner, and corrective change."],
          ["Change enablement", "Require scoped proposals, checks, rollback evidence, and post-change verification."],
          ["Monitoring and events", "Use Gateway, Nexus, and provider observations; never fabricate healthy telemetry."],
          ["Continual improvement", "Turn unresolved gaps into owned actions with evidence deadlines and review history."],
        ].map(([title, copy]) => (
          <article className="reality-card" key={title}>
            <p className="eyebrow">ITIL practice</p>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
