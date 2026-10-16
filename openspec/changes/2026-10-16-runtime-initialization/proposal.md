# Dashboard container runtime alignment

Refs: Conxian/conxian-business#1390, Conxian/conxian-business#1423.

Use the approved Node 24 runtime for dependency installation, build and standalone
execution. Retain the repository's declared package-manager version and frozen
lockfile. Add image build/start verification without production credentials.

Preserve the current deployment, durable registry, service identity, authorization
and release gates. A started dashboard does not qualify upstream operations.
