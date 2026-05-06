import os
import subprocess
import json
import sys

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
        return False

    # Check if gateway can build
    print("Verifying Gateway build...")
    out, err, code = run_cmd("cargo check", cwd=gateway_path)
    if code != 0:
        print(f"FAILED: Gateway build check failed.\n{err}")
        return False
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
                    return False
    else:
        print(f"FAILED: {engine_src} not found.")
        return False
    return True

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
    all_passed = True
    for comp in required_components:
        if os.path.exists(os.path.join(comp_dir, comp)):
            print(f"PASSED: Component {comp} exists.")
        else:
            print(f"FAILED: Component {comp} is missing.")
            all_passed = False
    return all_passed

def audit_security():
    print("\n--- Security & Hygiene Audit ---")
    all_passed = True

    # 1. Check for tracked sensitive files (including submodules)
    print("Checking for tracked sensitive files...")
    # Use git ls-files --recurse-submodules if supported, or handle submodules
    cmd = "git ls-files --recurse-submodules | grep -E '\\.env.*$' | grep -vE '\\.example$|\\.schema$'"
    out, err, code = run_cmd(cmd)
    if out:
        print(f"CRITICAL: Found tracked sensitive .env files:\n{out}")
        all_passed = False
    else:
        print("PASSED: No sensitive .env files tracked.")

    cmd = "git ls-files --recurse-submodules | grep -E '\\.pem$|\\.key$|\\.p12$|\\.pfx$|\\.keystore$'"
    out, err, code = run_cmd(cmd)
    if out:
        print(f"CRITICAL: Found tracked private keys/certificates:\n{out}")
        all_passed = False
    else:
        print("PASSED: No private keys tracked.")

    # 2. Check for tracked generated artifacts
    print("Checking for tracked generated artifacts...")
    artifacts = [
        "node_modules",
        "target",
        "dist",
        "build",
        ".next",
        "test-results",
        "playwright-report",
        "blob-report"
    ]

    for artifact in artifacts:
        # Check both as root directory and in subdirectories
        cmd = f"git ls-files --recurse-submodules | grep -E '(^|/){artifact}/'"
        out, err, code = run_cmd(cmd)
        if out:
            print(f"CRITICAL: Found tracked generated artifact: {artifact}")
            all_passed = False

    if all_passed:
        print("PASSED: No generated artifacts tracked.")

    # 3. Check for hardcoded secrets (Audit only - do not print lines to avoid CI leakage)
    print("Scanning for potential hardcoded secrets...")
    # We use a refined list of patterns and exclusions to minimize false positives while maintaining safety
    forbidden_patterns = ["password:", "api_key:", "secret:", "PRIVATE KEY"]
    for pattern in forbidden_patterns:
        # Exclude common false positives in docs, schemas, and infrastructure templates
        cmd = f"grep -riq '{pattern}' . --exclude-dir={{node_modules,.git,.next,target}} --exclude={{*.md,*.schema,*.example,Cargo.lock,pnpm-lock.yaml,system_audit.py,multi-env-test.yml,docker-compose.yml}}"
        out, err, code = run_cmd(cmd)
        if code == 0:
            print(f"WARNING: Potential secret pattern '{pattern}' found in the codebase. Refusing to print lines to avoid log leakage. Please review manually.")

    # 4. Check for world-writable scripts
    print("Checking script permissions...")
    out, err, code = run_cmd("find scripts/ -perm /o+w")
    if out:
        print(f"WARNING: World-writable scripts found:\n{out}")
        all_passed = False
    else:
        print("PASSED: Script permissions look secure.")

    return all_passed

def audit_submodules():
    print("\n--- Submodule Alignment Audit ---")
    out, err, code = run_cmd("git submodule status")
    print(out)
    if "dirty" in out:
        print("FAILED: Submodules are in a dirty state.")
        return False
    else:
        print("PASSED: Submodules are clean and aligned.")
        return True

if __name__ == "__main__":
    success = True
    # If any audit fails, the whole script should return non-zero
    if not audit_gateway(): success = False
    if not audit_ui(): success = False
    if not audit_security(): success = False
    if not audit_submodules(): success = False

    if not success:
        print("\n--- AUDIT FAILED ---")
        sys.exit(1)
    else:
        print("\n--- AUDIT PASSED ---")
        sys.exit(0)
