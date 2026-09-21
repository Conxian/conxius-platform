import { ServiceFabric } from "../../components/service-fabric";

export const metadata = {
  title: "Service Fabric | Conxian Admin",
  description: "Evidence-scoped organization service and capability ownership.",
};

export default function ServicesPage() {
  return (
    <div className="reality-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Reality-first operations</p>
          <h1>Service fabric</h1>
          <p>One view of the repositories that compose the organization, with ownership and execution boundaries made explicit.</p>
        </div>
      </div>
      <ServiceFabric />
    </div>
  );
}
