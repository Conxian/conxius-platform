import os
import subprocess
import json

def run_cmd(cmd, cwd=None):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    except Exception as e:
        return "", str(e), 1

def audit_gateway():
    print("--- Auditing Gateway (Rust) ---")
    gateway_path = "services/lib-conxian-core/gateway"

    if not os.path.exists(gateway_path):
        print(f"CRITICAL: Gateway path {gateway_path} not found.")
        return

    # Check if gateway can build
    print("Verifying Gateway build...")
    out, err, code = run_cmd("cargo check", cwd=gateway_path)
    if code != 0:
        print(f"FAILED: Gateway build check failed.\n{err}")
    else:
        print("PASSED: Gateway build check.")

    # Alignment checks from verify_full_alignment.py
    print("Verifying implementation alignment...")
    required_logic = {
        "AI Allocation": "get_ai_allocation",
        "UBI Identity": "get_ubi_identity",
        "Nexus State": "get_nexus_state",
        "Nostr Telemetry": "handle_nostr_telemetry",
        "ALEX Method B": "construct_alex_tx"
    }

    engine_src = os.path.join(gateway_path, "src/engine/mod.rs")
    if os.path.exists(engine_src):
        with open(engine_src, "r") as f:
            content = f.read()
            for name, symbol in required_logic.items():
                if symbol in content:
                    print(f"PASSED: Logic for {name} ({symbol}) verified.")
                else:
                    print(f"FAILED: Logic for {name} ({symbol}) missing in engine/mod.rs")
    else:
        print(f"FAILED: {engine_src} not found.")

def audit_ui():
    print("\n--- Auditing UI (Next.js) ---")
    ui_path = "services/conxian-ui"

    # Check for Phase 6 components
    required_components = [
        "AiAllocationCard.tsx",
        "UbiIdentityCard.tsx",
        "NexusSyncStatus.tsx",
        "NostrTelemetryCard.tsx",
        "AlexMethodB.tsx",
        "OpsLoansCard.tsx",
        "PosSyncStatus.tsx"
    ]
    comp_dir = os.path.join(ui_path, "src/components/ui")
    for comp in required_components:
        if os.path.exists(os.path.join(comp_dir, comp)):
            print(f"PASSED: Component {comp} exists.")
        else:
            print(f"FAILED: Component {comp} is missing.")

def audit_security():
    print("\n--- Security & Hygiene Audit ---")
    # Check for .env files that might be tracked
    out, err, code = run_cmd("git ls-files | grep '.env$'")
    if out:
        print(f"CRITICAL: Found tracked .env files:\n{out}")
    else:
        print("PASSED: No sensitive .env files tracked in root.")

    # Check for hardcoded secrets
    forbidden_patterns = ["password:", "api_key:", "secret:", "PRIVATE KEY"]
    for pattern in forbidden_patterns:
        out, err, code = run_cmd(f"grep -ri '{pattern}' services/ --exclude-dir=node_modules --exclude-dir=target --exclude=*.md | head -n 3")
        if out:
            print(f"WARNING: Potential secret pattern '{pattern}' found (sample):\n{out}")

    # Check for world-writable scripts
    out, err, code = run_cmd("find scripts/ -perm /o+w")
    if out:
        print(f"WARNING: World-writable scripts found:\n{out}")
    else:
        print("PASSED: Script permissions look secure.")

def audit_submodules():
    print("\n--- Submodule Alignment Audit ---")
    out, err, code = run_cmd("git submodule status")
    print(out)
    if "dirty" in out:
        print("FAILED: Submodules are in a dirty state.")
    else:
        print("PASSED: Submodules are clean and aligned.")

if __name__ == "__main__":
    audit_gateway()
    audit_ui()
    audit_security()
    audit_submodules()
