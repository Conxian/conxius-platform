#!/usr/bin/env python3
"""Validate the organization domain registry without performing DNS mutations."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
registry = json.loads((ROOT / "platform/domains.registry.json").read_text())
services = registry["services"]
repositories = registry["repositories"]

assert registry["canonicalWebHost"] == "www.conxian-labs.com"
assert registry["canonicalDomain"] == "conxian-labs.com"
assert len({s["id"] for s in services}) == len(services)
assert len({s["hostname"] for s in services}) == len(services)
assert all(s["repository"].startswith("Conxian/") for s in services)
assert all(s["healthPath"].startswith("/") for s in services)
assert len({r["repository"] for r in repositories}) == len(repositories)
assert "conxia-labs.com" in registry["domainPolicy"]
print(f"domain registry valid: {len(services)} services, {len(repositories)} repositories")
