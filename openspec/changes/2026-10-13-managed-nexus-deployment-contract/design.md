# Design

The contract is desired state, not proof of deployment. A later provider adapter may translate it into Terraform, CloudFormation, or another reviewed implementation, but the adapter must emit separately signed deployment and runtime evidence.

Production nodes remain private behind a managed load balancer, span at least two failure domains, and use immutable image and zkVM program digests. Secret fields contain references only. Provider adapters must fail closed when a referenced secret, release artifact, health contract, or evidence sink is unavailable.

Nexus owns state observation and proof verification. Platform owns the deployment request, promotion gates, evidence collection, and SLA reporting. Gateway owns tenant-facing routing and banking integration.

