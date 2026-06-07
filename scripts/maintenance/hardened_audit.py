import os
import re
import sys
import subprocess

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        return e.output

def check_secrets():
    print("--- Hardened Security & ZSE Audit ---")
    # More aggressive patterns
    forbidden_patterns = [
        r"password\s*[:=]\s*['\"].+['\"]",
        r"api_key\s*[:=]\s*['\"].+['\"]",
        r"secret\s*[:=]\s*['\"].+['\"]",
        r"PRIVATE KEY",
        r"BEGIN RSA PRIVATE KEY",
        r"xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}", # Slack tokens
        r"ghp_[a-zA-Z0-9]{36}" # GitHub tokens
    ]

    found_issues = []
    for pattern in forbidden_patterns:
        # Use grep to find matches, excluding common false positives
        cmd = f"grep -rnE \"{pattern}\" . --exclude-dir={{.git,node_modules,target,dist}} --exclude=\"hardened_audit.py\" --exclude=\"system_audit.py\""
        output = run_command(cmd)
        if output.strip():
            found_issues.append(output.strip())

    if found_issues:
        print("WARNING: Potential secrets found in codebase:")
        for issue in found_issues:
            print(issue)
    else:
        print("PASSED: No obvious secrets found in codebase.")

def check_render_configs():
    print("\n--- Render Deployment Configuration Check ---")
    # This would normally use the Render API, but here we'll just check local artifacts if any
    # Since we have the Render tool, I'll recommend the user runs the verification tool
    print("REMARK: Ensure Render services use correct PORT binding and production build commands.")
    print("REMARK: 'conxian-ui' should bind to 0.0.0.0 and use the PORT env var.")

if __name__ == "__main__":
    check_secrets()
    check_render_configs()
