#!/usr/bin/env python3
"""Fail closed when the universal platform contract owns client/protocol economics or wallet custody."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
# This guard protects the universal platform contract surface. Legacy product,
# governance, and adapter implementations are tracked separately for migration.
SCAN_ROOTS = (ROOT / "platform",)
REQUIRED_WALLET_CONTRACT_KEYS = {
    "schemaVersion", "ownerRepository", "consumer", "boundary", "platformMay",
    "platformMustNot", "requiredEvidence", "resourcePolicy", "availability",
}
FORBIDDEN = (
    "CONXIAN_PRIVATE_KEY", "NOSTR_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY",
    "private_key", "treasury", "yield_split", "liquidity_desk", "liquidity-desk",
    "protocol_fee", "founder_vesting", "custody", "sign_transaction",
)
ALLOWLIST = {
    ROOT / "platform" / "neutral-m2m-intent.schema.json",
    ROOT / "platform" / "services.catalog.json",
    ROOT / "platform" / "wallet-capability-sdk.contract.json",
}
IGNORED_DIRS = {"__tests__", "tests", "docs", "openspec", ".next", "node_modules"}
LEGACY_SURFACES = {
    ROOT / "src" / "governance",
    ROOT / "src" / "conxian_nexus",
    ROOT / "services" / "admin-dashboard" / "src" / "lib" / "governance",
    ROOT / "services" / "admin-dashboard" / "src" / "app" / "page.tsx",
    ROOT / "services" / "elizaos-plugin-conxian" / "src" / "actions.ts",
    ROOT / "services" / "elizaos-plugin-conxian" / "src" / "conxianClient.ts",
}

violations = []
wallet_contract = ROOT / "platform" / "wallet-capability-sdk.contract.json"
if not wallet_contract.exists():
    violations.append("platform/wallet-capability-sdk.contract.json: missing")
else:
    import json
    document = json.loads(wallet_contract.read_text())
    missing = REQUIRED_WALLET_CONTRACT_KEYS - document.keys()
    if missing:
        violations.append(f"platform/wallet-capability-sdk.contract.json: missing keys {sorted(missing)}")
    if document.get("boundary") != "sdk-only" or document.get("resourcePolicy", {}).get("destructiveMigration") is not False:
        violations.append("platform/wallet-capability-sdk.contract.json: wallet boundary must remain SDK-only and non-destructive")

for base in SCAN_ROOTS:
    if not base.exists():
        continue
    for path in base.rglob("*"):
        if any(part in IGNORED_DIRS for part in path.parts) or any(path.is_relative_to(legacy) for legacy in LEGACY_SURFACES):
            continue
        if not path.is_file() or path in ALLOWLIST or path.suffix not in {".ts", ".tsx", ".js", ".py", ".rs", ".json"}:
            continue
        for number, line in enumerate(path.read_text(errors="ignore").splitlines(), 1):
            lowered = line.lower()
            if any(token.lower() in lowered for token in FORBIDDEN):
                violations.append(f"{path.relative_to(ROOT)}:{number}: {line.strip()}")

if violations:
    print("Platform economy boundary violations detected:", file=sys.stderr)
    print("\n".join(violations), file=sys.stderr)
    sys.exit(1)
print("Platform economy boundary verified: no wallet custody or client/protocol economics detected.")
