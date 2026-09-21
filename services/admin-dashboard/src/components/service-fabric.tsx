import Link from "next/link";

type Service = {
  name: string;
  role: string;
  owner: string;
  state: "Active" | "Evidence-scoped" | "External" | "Archived";
  boundary: string;
};

const services: Service[] = [
  { name: "conxius-platform", role: "Platform composition and lifecycle", owner: "Conxian/conxius-platform", state: "Active", boundary: "Orchestration, lifecycle, evidence" },
  { name: "admin-dashboard", role: "Operator interface", owner: "conxius-platform", state: "Active", boundary: "Read-only operational visibility" },
  { name: "admin-pulse-bos", role: "Pulse component source", owner: "conxius-platform", state: "Active", boundary: "Typed UI components" },
  { name: "elizaos-plugin-conxian", role: "Agent adapter", owner: "conxius-platform", state: "Active", boundary: "Gateway-authenticated actions" },
  { name: "lib-conxian-core", role: "Core SDK", owner: "Conxian/lib-conxian-core", state: "Evidence-scoped", boundary: "Canonical types and primitives" },
  { name: "conxius-enclave-sdk", role: "Security SDK", owner: "Conxian/conxius-enclave-sdk", state: "Evidence-scoped", boundary: "Attestation and verification" },
  { name: "conxian-gateway", role: "Routing provider", owner: "Conxian/conxian-gateway", state: "Evidence-scoped", boundary: "Provider adapters and results" },
  { name: "conxian-nexus", role: "Proof and observation", owner: "Conxian/conxian-nexus", state: "Evidence-scoped", boundary: "Sync, finality, verification" },
  { name: "conxius-wallet", role: "Wallet SDK provider", owner: "Conxian/conxius-wallet", state: "External", boundary: "Custody and signing stay external" },
  { name: "conxian_market", role: "Economic product", owner: "Conxian/conxian_market", state: "External", boundary: "Pricing, fees, settlement" },
  { name: "conxian_ui", role: "Client experience", owner: "Conxian/conxian_ui", state: "External", boundary: "User-facing workflows" },
  { name: "conxian-business", role: "Governance service", owner: "Conxian/conxian-business", state: "Evidence-scoped", boundary: "Doctrine, approvals, policy" },
  { name: "Conxian", role: "Protocol surface", owner: "Conxian/Conxian", state: "External", boundary: "Protocol-owned state transitions" },
  { name: "conxius-orbit", role: "Archived compatibility", owner: "Conxian/conxius-orbit", state: "Archived", boundary: "No active authority" },
];

export function ServiceFabric() {
  return (
    <section className="service-fabric" aria-labelledby="service-fabric-title">
      <div className="section-heading">
        <p className="eyebrow">Organization service map</p>
        <h2 id="service-fabric-title">Every capability has an owner</h2>
        <p>All repositories remain preserved. The platform reports boundaries and evidence; it does not claim ownership of external execution.</p>
      </div>
      <div className="service-fabric__grid">
        {services.map((service) => (
          <article className="service-tile" key={service.name}>
            <div className="service-tile__top">
              <h3>{service.name}</h3>
              <span className={`service-state service-state--${service.state.toLowerCase().replace("-", "-")}`}>{service.state}</span>
            </div>
            <p>{service.role}</p>
            <small>{service.boundary}</small>
            <small className="service-tile__owner">Owner: {service.owner}</small>
          </article>
        ))}
      </div>
      <Link className="reality-status__link" href="/status">Review platform status and evidence</Link>
    </section>
  );
}
