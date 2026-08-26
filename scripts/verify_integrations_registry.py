import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "platform" / "integrations.registry.json"
SECRET_RE = re.compile(r"(KEY|TOKEN|PASSWORD|SECRET|PRIVATE_KEY|DATABASE_URL|ROLE_ARN|PRIVATE|USER)", re.I)

def main() -> None:
    data = json.loads(REGISTRY.read_text())
    integrations = data["integrations"]
    ids = [item["id"] for item in integrations]
    assert len(ids) == len(set(ids)), "duplicate integration ids"
    for item in integrations:
        assert item["canonicalEnv"] in item["aliases"] + [item["canonicalEnv"]]
        assert item["owner"] and item["role"] and item["fallback"]
        assert not any(not SECRET_RE.search(env) for env in item["secretEnvs"] if env)
        assert all(re.fullmatch(r"[A-Z][A-Z0-9_]+", env) for env in [item["canonicalEnv"], *item["aliases"], *item["secretEnvs"]])
    canonical = [item["canonicalEnv"] for item in integrations]
    assert len(canonical) == len(set(canonical)), "duplicate canonical environment variables"
    text = REGISTRY.read_text()
    assert "SECRET_VALUE" not in text and "PRIVATE_KEY_VALUE" not in text
    print(f"integration registry valid: {len(integrations)} integrations")

if __name__ == "__main__":
    main()
