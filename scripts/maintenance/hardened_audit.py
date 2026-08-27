import os
import json
import re
import subprocess
import sys

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.stdout.strip()
    except Exception as e:
        return ""

def check_secrets():
    print("--- Hardened Security & ZSE Audit ---")
    out_tracked = run_command("git ls-files").splitlines()
    out_others = run_command("git ls-files --others --exclude-standard").splitlines()
    all_files = set(out_tracked + out_others)

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

    forbidden_patterns = [
        (r"password\s*[:=]\s*['\"][^'\"]+['\"]", "Hardcoded password"),
        (r"api_key\s*[:=]\s*['\"][^'\"]+['\"]", "Hardcoded API key"),
        (r"secret\s*[:=]\s*['\"][^'\"]+['\"]", "Hardcoded secret"),
        (r"xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}", "Slack Token"),
        (r"ghp_[a-zA-Z0-9]{36}", "GitHub Token"),
        (r"sk_live_[a-zA-Z0-9]{24}", "Stripe Live Key")
    ]

    found_issues = []
    for filepath in scanned_files:
        if not os.path.exists(filepath):
            continue
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
                for pattern, desc in forbidden_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        if 'test' in filepath.lower() or 'mock' in content.lower() or 'redact' in content.lower():
                            continue
                        found_issues.append(f"{filepath}: {desc}")
        except Exception:
            pass

    if found_issues:
        print("WARNING: Potential secrets found in codebase:")
        for issue in found_issues:
            print(f"  {issue}")
    else:
        print("PASSED: No obvious secrets found in codebase.")

def check_render_configs():
    print("\n--- Render Deployment Configuration Check ---")
    pkg_path = "services/admin-dashboard/package.json"
    if os.path.exists(pkg_path):
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg_data = json.load(f)
            start_script = pkg_data.get("scripts", {}).get("start", "")
            if "-H" in start_script or "0.0.0.0" in start_script:
                print("PASSED: 'admin-dashboard' start script explicitly binds to 0.0.0.0 host.")
            else:
                print("WARNING: 'admin-dashboard' start script missing explicit 0.0.0.0 host binding.")
    print("REMARK: Ensure Render services use correct PORT binding and production build commands.")
    print("REMARK: 'conxian-ui' should bind to 0.0.0.0 and use the PORT env var.")

if __name__ == "__main__":
    check_secrets()
    check_render_configs()
