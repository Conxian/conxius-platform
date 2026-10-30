# Spec delta

## Requirement: versioned managed Nexus intent

The platform SHALL accept only `conxian.managed-nexus-deployment.v1` manifests with immutable release and zkVM program digests.

## Requirement: production topology

Production intent SHALL request at least three replicas across at least two failure domains, private node ingress, a managed load balancer, and at least six Bitcoin confirmations.

## Requirement: secret isolation

The manifest SHALL contain only `ref://` secret references. Provider credentials and secret values SHALL NOT appear in the contract.

## Requirement: evidence boundary

Validation of desired state SHALL NOT be presented as deployment, availability, failover, recovery, or SLA evidence.

