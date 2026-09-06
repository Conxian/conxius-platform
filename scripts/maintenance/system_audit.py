import os
import subprocess
import json
import re
import sys

def run_cmd(cmd, cwd=None):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    except Exception as e:
        return "", str(e), 1

def scan_hardcoded_secrets():
    out_tracked, _, _ = run_cmd("git ls-files")
    out_others, _, _ = run_cmd("git ls-files --others --exclude-standard")
    all_files = set(out_tracked.splitlines() + out_others.splitlines())

    ignored_extensions = (
        '.md', '.example', '.schema', '.lock', '.svg', '.png', '.jpg', '.jpeg',
        '.ico', '.woff', '.woff2', '.ttf', '.eot'
    )
    ignored_files = {
        'scripts/maintenance/system_audit.py',
        'scripts/maintenance/hardened_audit.py',
        'pnpm-lock.yaml',
        'Cargo.lock',
        'docker-compose.yml',
        'scripts/provision-secrets.sh',
        '.github/workflows/multi-env-test.yml',
        '.github/workflows/cross-repo-integration-mvp.yml',
        '.github/workflows/synergy-test.yml'
    }

    scanned_files = [
        f for f in all_files
        if not f.endswith(ignored_extensions) and f not in ignored_files and not f.startswith('docs/')
    ]

    patterns = [
        (r"password\s*[:=]\s*['\"][^'\"]+['\"]", "Hardcoded password assignment"),
        (r"api_key\s*[:=]\s*['\"][^'\"]+['\"]", "Hardcoded API key assignment"),
        (r"secret\s*[:=]\s*['\"][^'\"]+['\"]", "Hardcoded secret assignment"),
        (r"xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}", "Slack Token"),
        (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token"),
        (r"sk_live_[a-zA-Z0-9]{24}", "Stripe Live Secret Key")
    ]

    found = []
    for filepath in scanned_files:
        if not os.path.exists(filepath):
            continue
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
                for pattern, desc in patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        if 'test' in filepath.lower() or 'mock' in content.lower() or 'redact' in content.lower():
                            continue
                        found.append((filepath, desc))
        except Exception:
            pass

    if found:
        print("WARNING: Potential hardcoded secrets found:")
        for path, desc in found:
            print(f"  - {path}: {desc}")
        return False
    else:
        print("PASSED: No hardcoded secrets found in codebase.")
        return True

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

    cmd = r"git ls-files | grep -E '(^|/)service-key-registry\.json.*$|(^|/)\.m2m/|(^|/)\.secrets/'"
    out, err, code = run_cmd(cmd)
    if out:
        print(f"CRITICAL: Found tracked M2M service-key registry or secrets directory:\n{out}")
        all_passed = False
    else:
        print("PASSED: No M2M service-key registries or secret directories tracked.")

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
    secrets_ok = scan_hardcoded_secrets()
    if not secrets_ok:
        all_passed = False

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

    # Workspace Hygiene (Check for redundant lockfiles/workspaces in services)
    redundant_files = ["pnpm-lock.yaml", "pnpm-workspace.yaml"]
    workspace_hygiene_passed = True
    for svc in services:
        for f in redundant_files:
            path = os.path.join(svc, f)
            if os.path.exists(path):
                print(f"  FAILED: Redundant workspace file found in service: {path}")
                all_passed = False
                workspace_hygiene_passed = False
    if workspace_hygiene_passed:
        print("PASSED: No redundant workspace files found in services.")

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
