import os
import json
import urllib.request
import urllib.error
import sys

# --- 1. Configuration & Aesthetics ---
NAMESPACE = "ubi:btc:"
DRY_RUN = True  # Default to Safety First

# ANSI Colors for Conxian Vibe
GOLD = '\033[33m'
GREEN = '\033[32m'
RED = '\033[31m'
RESET = '\033[0m'

def log(msg, color=RESET):
    print(f"{color}{msg}{RESET}")

# Loading Configuration
GITHUB_TOKEN = None
LINEAR_TOKEN = None
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                if key == 'GITHUB_TOKEN': GITHUB_TOKEN = val
                if key == 'LINEAR_TOKEN': LINEAR_TOKEN = val

# --- 2. GitHub Sentinel Client ---
class GitHubSentinel:
    def __init__(self, token):
        self.token = token
        self.base_url = "https://api.github.com"

    def _request(self, url, data=None, method='GET'):
        headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Conxian-Sovereign-Bridge/1.1"
        }
        req = urllib.request.Request(url, headers=headers, method=method)
        json_data = json.dumps(data).encode('utf-8') if data else None
        if data: req.add_header('Content-Type', 'application/json')

        try:
            with urllib.request.urlopen(req, data=json_data, timeout=30) as resp:
                return json.loads(resp.read().decode('utf-8')), resp.getcode()
        except urllib.error.HTTPError as e:
            return None, e.code
        except Exception as e:
            log(f"[-] Connection Error: {str(e)}", RED)
            return None, 500

    def audit_issue(self, repo, issue_number):
        url = f"{self.base_url}/repos/{repo}/issues/{issue_number}"
        data, code = self._request(url)
        if code == 200:
            return data
        return None

    def get_claim_command(self, repo, issue_number):
        url = f"{self.base_url}/repos/{repo}/issues/{issue_number}/comments"
        comments, code = self._request(url)
        if code == 200:
            for c in comments:
                if "/claim" in c['body'].lower():
                    return c['user']['login']
        return None

    def execute_assignment(self, repo, issue_number, username):
        url = f"{self.base_url}/repos/{repo}/issues/{issue_number}/assignees"
        _, code = self._request(url, data={"assignees": [username]}, method='POST')
        return code == 201

# --- 3. Linear Synchronization ---
class LinearBridge:
    def __init__(self, token):
        self.token = token
        self.url = "https://api.linear.app/graphql"

    def sync_claimed(self, issue_id):
        if not self.token:
            log("[!] Linear sync skipped: No LINEAR_TOKEN provided.", GOLD)
            return False
        
        # Linear GraphQL Mutation for Status Update
        query = {
            "query": f'mutation {{ issueUpdate(id: "{issue_id}", input: {{ stateId: "Claimed" }}) {{ success }} }}'
        }
        log(f"[*] Syncing Linear state for {issue_id}...", GOLD)
        # TODO: Real GraphQL request implementation
        return True

# --- 4. Main Workflow ---
def run_bridge(repo, issue_num):
    if not GITHUB_TOKEN:
        log("[!] Fatal: GITHUB_TOKEN not found in .env", RED)
        sys.exit(1)

    gh = GitHubSentinel(GITHUB_TOKEN)
    ln = LinearBridge(LINEAR_TOKEN)

    log(f"[*] Initializing Sovereign Bridge for {repo} #{issue_num}...", GOLD)
    
    # Audit Issue State
    issue = gh.audit_issue(repo, issue_num)
    if not issue:
        log(f"[-] Issue #{issue_num} not found or inaccessible.", RED)
        return

    log(f"[+] Verified: '{issue['title']}'", GREEN)
    
    if issue['state'] != 'open' or issue['assignees']:
        log(f"[!] Gate Closed: Issue is already assigned or closed.", RED)
        return

    # Trigger Logic
    claimant = gh.get_claim_command(repo, issue_num)
    if not claimant:
        log("[?] No /claim command detected. Standing by.", GOLD)
        return

    identity = f"{NAMESPACE}{claimant.lower()}"
    log(f"[!] Claim detected from: {claimant} ({identity})", GREEN)

    if DRY_RUN:
        log(f"[DRY-RUN] Would authorize claim for {claimant}", GOLD)
        return

    # Final Execution
    if gh.execute_assignment(repo, issue_num, claimant):
        log(f"[SUCCESS] {claimant} assigned to {repo} #{issue_num}", GREEN)
        ln.sync_claimed(f"CON-{issue_num}")
    else:
        log("[-] Assignment failed. Check API permissions.", RED)

if __name__ == "__main__":
    # Target Configuration
    TARGET_REPO = "Conxian/conxius-platform"
    TARGET_ISSUE = 100
    
    run_bridge(TARGET_REPO, TARGET_ISSUE)
