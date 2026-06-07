import os
import json
import sys

def verify_alignment():
    print("--- Verifying Multidimensional Platform Alignment ---")

    # 1. Check Admin Dashboard Routes
    routes = [
        "services/admin-dashboard/src/app/api/multidimensional/metrics/route.ts",
        "services/admin-dashboard/src/app/multidimensional/page.tsx",
        "services/admin-dashboard/src/app/multidimensional/layout.tsx"
    ]
    for r in routes:
        if os.path.exists(r):
            print(f"PASSED: Route {r} exists.")
        else:
            print(f"FAILED: Route {r} is missing.")
            sys.exit(1)

    # 2. Check ElizaOS Plugin Integration
    plugin_client = "services/elizaos-plugin-conxian/src/conxianClient.ts"
    with open(plugin_client, "r") as f:
        content = f.read()
        if "getMultidimensionalMetrics" in content:
            print(f"PASSED: {plugin_client} includes multidimensional client logic.")
        else:
            print(f"FAILED: {plugin_client} missing multidimensional client logic.")
            sys.exit(1)

    plugin_actions = "services/elizaos-plugin-conxian/src/actions.ts"
    with open(plugin_actions, "r") as f:
        content = f.read()
        if "CONXIAN_MULTIDIMENSIONAL_METRICS" in content:
            print(f"PASSED: {plugin_actions} includes multidimensional action.")
        else:
            print(f"FAILED: {plugin_actions} missing multidimensional action.")
            sys.exit(1)

    print("--- Multidimensional Alignment Verified ---")

if __name__ == "__main__":
    verify_alignment()
