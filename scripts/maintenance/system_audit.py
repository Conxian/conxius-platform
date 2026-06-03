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

def audit_security():
    print("\n--- Security & Hygiene Audit ---")
    all_passed = True

    # 1. Check for tracked sensitive files
    print("Checking for tracked sensitive files...")
    cmd = r"git ls-files | grep -E '\.env.*$' | grep -vE '\.example$|\.schema$'"
    out, err, code = run_cmd(cmd)
    if out:
        print(f"CRITICAL: Found tracked sensitive .env files:\n{out}")
        all_passed = False
    else:
        print("PASSED: No sensitive .env files tracked.")

    cmd = r"git ls-files | grep -E '\.pem$|\.key$|\.p12$|\.pfx$|\.keystore$'"
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
        cmd = f"git ls-files | grep -E '(^|/){artifact}/'"
        out, err, code = run_cmd(cmd)
        if out:
            print(f"CRITICAL: Found tracked generated artifact: {artifact}")
            all_passed = False

    if all_passed:
        print("PASSED: No generated artifacts tracked.")

    # 3. Check for hardcoded secrets
    print("Scanning for potential hardcoded secrets...")
    forbidden_patterns = ["password:", "api_key:", "secret:", "PRIVATE KEY"]
    for pattern in forbidden_patterns:
        # Exclude common false positives
        cmd = f"grep -riq '{pattern}' . --exclude-dir={{node_modules,.git,.next,target}} --exclude={{*.md,*.schema,*.example,Cargo.lock,pnpm-lock.yaml,system_audit.py,multi-env-test.yml,docker-compose.yml}}"
        out, err, code = run_cmd(cmd)
        if code == 0:
            print(f"WARNING: Potential secret pattern '{pattern}' found in the codebase. Please review manually.")

    return all_passed

def audit_governance():
    print("\n--- Governance & Service Audit ---")
    all_passed = True

    # Root Level
    required_root = ["README.md", "LICENSE", "SECURITY.md", "CONTRIBUTING.md", "CODEOWNERS", "CHANGELOG.md"]
    print("Checking root governance files...")
    for f in required_root:
        if os.path.exists(f):
            print(f"PASSED: Root {f} exists.")
        else:
            print(f"FAILED: Root {f} is missing.")
            all_passed = False

    # Services
    services = [
        "services/admin-dashboard",
        "services/elizaos-plugin-conxian",
        "services/admin-pulse-bos"
    ]
    required_service_files = ["README.md", "SECURITY.md", "LICENSE", "package.json"]

    for svc in services:
        print(f"Checking service: {svc}")
        if not os.path.exists(svc):
            print(f"FAILED: Service directory {svc} is missing.")
            all_passed = False
            continue

        for f in required_service_files:
            if os.path.exists(os.path.join(svc, f)):
                print(f"  PASSED: {f} exists in {svc}.")
            else:
                print(f"  FAILED: {f} is missing in {svc}.")
                all_passed = False

    # Implementation Drift Checks (Replacement for legacy Gateway/UI checks)
    print("\nVerifying implementation alignment (Drift Check)...")
    drift_checks = [
        ("services/admin-pulse-bos/src/SovereignFinancialOffice.tsx", "Sovereign Financial Office"),
        ("services/admin-dashboard/src/app/page.tsx", "Infrastructure Pulse"),
        ("services/elizaos-plugin-conxian/src/index.ts", "conxianPlugin")
    ]

    for path, snippet in drift_checks:
        if os.path.exists(path):
            with open(path, "r") as f:
                if snippet in f.read():
                    print(f"PASSED: Implementation drift check for {path}.")
                else:
                    print(f"FAILED: Snippet '{snippet}' missing in {path}.")
                    all_passed = False
        else:
            print(f"FAILED: {path} is missing (Drift Check).")
            all_passed = False

    return all_passed

if __name__ == "__main__":
    security_ok = audit_security()
    governance_ok = audit_governance()

    if not security_ok or not governance_ok:
        print("\n--- AUDIT FAILED ---")
        sys.exit(1)

    print("\n--- ALL AUDITS PASSED ---")
    sys.exit(0)
