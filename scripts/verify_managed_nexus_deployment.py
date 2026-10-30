#!/usr/bin/env python3
"""Validate the checked-in managed Nexus deployment contract and semantics."""
from __future__ import annotations

import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "platform/managed-nexus-deployment.schema.json"
EXAMPLE = ROOT / "platform/managed-nexus-deployment.example.json"


def fail(message: str) -> None:
    print(f"managed-nexus-deployment: {message}", file=sys.stderr)
    raise SystemExit(1)


def validate(document: dict, schema: dict) -> None:
    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        fail("contract schema must use JSON Schema 2020-12")
    required = set(schema["required"])
    if set(document) != required | {"$schema"}:
        fail("document fields do not match the closed top-level contract")
    if document["schemaVersion"] != "conxian.managed-nexus-deployment.v1":
        fail("unsupported schema version")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,62}", document["tenantId"]):
        fail("invalid tenant id")
    if document["environment"] not in {"development", "staged", "production"}:
        fail("unsupported environment")

    provider = document["provider"]
    if set(provider) != {"name", "region", "failureDomains"}:
        fail("provider fields do not match the contract")
    if provider["name"] not in {"aws", "gcp"}:
        fail("unsupported provider")
    if not isinstance(provider["failureDomains"], list) or not provider["failureDomains"]:
        fail("at least one failure domain is required")
    if len(set(provider["failureDomains"])) != len(provider["failureDomains"]):
        fail("failure domains must be unique")

    release = document["release"]
    if set(release) != {"image", "imageDigest", "sourceCommit"}:
        fail("release fields do not match the contract")
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", release["imageDigest"]):
        fail("release image must use an immutable sha256 digest")
    if not re.fullmatch(r"[0-9a-f]{40}", release["sourceCommit"]):
        fail("release source commit must be a full Git SHA")

    topology = document["topology"]
    if set(topology) != {"replicas", "nodePublicIngress", "loadBalancer", "healthPath"}:
        fail("topology fields do not match the contract")
    if not isinstance(topology["replicas"], int) or not 1 <= topology["replicas"] <= 64:
        fail("replica count is outside the supported range")
    if topology["nodePublicIngress"] is not False:
        fail("Nexus nodes must not expose direct public ingress")
    if not re.fullmatch(r"/[A-Za-z0-9_./-]{1,127}", topology["healthPath"]):
        fail("invalid health path")

    bitcoin = document["bitcoin"]
    if set(bitcoin) != {"network", "minimumConfirmations", "headerSource"}:
        fail("Bitcoin fields do not match the contract")
    if bitcoin["network"] not in {"mainnet", "testnet", "signet"}:
        fail("unsupported Bitcoin network")
    if not isinstance(bitcoin["minimumConfirmations"], int) or not 1 <= bitcoin["minimumConfirmations"] <= 144:
        fail("invalid Bitcoin confirmation policy")
    if urlparse(bitcoin["headerSource"]).scheme != "https":
        fail("Bitcoin header source must use HTTPS")

    zkvm = document["zkvm"]
    if set(zkvm) != {"backends", "programDigests"}:
        fail("zkVM fields do not match the contract")
    if not zkvm["backends"] or not set(zkvm["backends"]) <= {"sp1", "risc0"}:
        fail("unsupported or empty zkVM backend set")
    if len(set(zkvm["backends"])) != len(zkvm["backends"]):
        fail("zkVM backends must be unique")
    if not zkvm["programDigests"] or any(
        not re.fullmatch(r"sha256:[0-9a-f]{64}", digest)
        for digest in zkvm["programDigests"].values()
    ):
        fail("zkVM programs must use immutable sha256 digests")

    reference = re.compile(r"ref://[A-Za-z0-9_./:-]{3,512}")
    if not document["secrets"] or any(not reference.fullmatch(value) for value in document["secrets"].values()):
        fail("secrets must be non-empty ref:// references")
    evidence = document["evidence"]
    if set(evidence) != {"sink", "retentionDays"} or not reference.fullmatch(evidence["sink"]):
        fail("evidence sink must be a ref:// reference")
    if not isinstance(evidence["retentionDays"], int) or not 30 <= evidence["retentionDays"] <= 3650:
        fail("evidence retention is outside the supported range")

    sla = document["sla"]
    if set(sla) != {"availabilityTarget", "rtoMinutes", "rpoMinutes"}:
        fail("SLA fields do not match the contract")
    if not isinstance(sla["availabilityTarget"], (int, float)) or not 0.9 <= sla["availabilityTarget"] <= 0.99999:
        fail("availability target is outside the supported range")
    if not isinstance(sla["rtoMinutes"], int) or not 1 <= sla["rtoMinutes"] <= 1440:
        fail("RTO is outside the supported range")
    if not isinstance(sla["rpoMinutes"], int) or not 0 <= sla["rpoMinutes"] <= 1440:
        fail("RPO is outside the supported range")

    if document["environment"] == "production":
        if document["topology"]["replicas"] < 3:
            fail("production requires at least three replicas")
        if len(document["provider"]["failureDomains"]) < 2:
            fail("production requires at least two failure domains")
        if not document["topology"]["loadBalancer"]:
            fail("production requires a managed load balancer")
        if document["bitcoin"]["network"] != "mainnet":
            fail("production requires Bitcoin mainnet")
        if document["bitcoin"]["minimumConfirmations"] < 6:
            fail("production requires at least six Bitcoin confirmations")


def main() -> int:
    try:
        schema = json.loads(SCHEMA.read_text())
        document = json.loads(EXAMPLE.read_text())
    except (OSError, json.JSONDecodeError) as error:
        fail(f"cannot load contract: {error}")
    validate(document, schema)
    print("managed-nexus-deployment: PASS (schema + staged example)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
