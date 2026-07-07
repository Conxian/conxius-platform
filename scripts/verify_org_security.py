#!/usr/bin/env python3
"""
Org Security Verification Script

This script verifies that org-level GitHub rulesets and security settings
are properly configured per Issue #854 and ORG_SECURITY_GOVERNANCE.md.

Usage:
    python scripts/verify_org_security.py [--org ORG_NAME] [--token TOKEN] [--output FORMAT]

Requirements:
    pip install requests

Reference:
    https://github.com/Conxian/conxius-platform/issues/854
    .github/ORG_SECURITY_GOVERNANCE.md
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Any, Optional

try:
    import requests
except ImportError:
    print("Error: 'requests' library is required. Install with: pip install requests")
    sys.exit(1)


class OrgSecurityVerifier:
    """Verifies org-level GitHub security settings."""

    PRIORITY_REPOS = [
        '.github',
        'Conxian',
        'conxius-wallet',
        'conxian-gateway',
        'conxian-nexus',
        'lib-conxian-core',
        'conxius-platform',
        'conxius-enclave-sdk',
        'conxian_ui',
        'conxian-labs-site',
    ]

    REQUIRED_RULESETS = [
        'org-default-branch-protection',
        'org-secret-scanning-enforcement',
        'org-dependency-review',
        'org-push-protection',
    ]

    def __init__(self, org: str, token: str):
        self.org = org
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
        self.results = {
            'verification_date': datetime.now().isoformat(),
            'organization': org,
            'reference': 'https://github.com/Conxian/conxius-platform/issues/854',
            'checks': {},
            'summary': {}
        }

    def check_org_settings(self) -> dict[str, Any]:
        """Check basic organization settings."""
        url = f'https://api.github.com/orgs/{self.org}'
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                settings = response.json()
                return {
                    'status': 'success',
                    'login': settings.get('login'),
                    'description': settings.get('description', 'N/A'),
                    'public_repos': settings.get('public_repos', 0),
                    'total_private_repos': settings.get('total_private_repos', 0),
                }
            else:
                return {
                    'status': 'error',
                    'error': f'HTTP {response.status_code}: {response.text}'
                }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    def check_rulesets(self) -> dict[str, Any]:
        """Check organization rulesets (requires GitHub Enterprise)."""
        url = f'https://api.github.com/orgs/{self.org}/rulesets'
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                rulesets = response.json()
                result = {
                    'status': 'success',
                    'ruleset_count': len(rulesets),
                    'rulesets': [],
                    'required_found': []
                }
                for ruleset in rulesets:
                    result['rulesets'].append({
                        'name': ruleset.get('name'),
                        'enforcement': ruleset.get('enforcement'),
                        'target': ruleset.get('target', 'branch')
                    })
                    # Check if this matches required rulesets
                    name_lower = ruleset.get('name', '').lower()
                    for required in self.REQUIRED_RULESETS:
                        if required.lower() in name_lower:
                            result['required_found'].append(required)
                return result
            elif response.status_code == 404:
                return {
                    'status': 'unavailable',
                    'error': 'Rulesets API requires GitHub Enterprise',
                    'note': 'Verify rulesets manually in organization settings'
                }
            else:
                return {
                    'status': 'error',
                    'error': f'HTTP {response.status_code}'
                }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    def check_branch_protection(self, repo: str, branch: str = 'main') -> dict[str, Any]:
        """Check branch protection for a repository."""
        url = f'https://api.github.com/repos/{self.org}/{repo}/branches/{branch}/protection'
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                protection = response.json()
                return {
                    'status': 'protected',
                    'require_pr_reviews': protection.get('required_pull_request_reviews', {}).get('required', False),
                    'required_approving_review_count': protection.get('required_pull_request_reviews', {}).get('required_approving_review_count'),
                    'dismiss_stale_reviews': protection.get('dismiss_stale_reviews', False),
                    'require_linear_history': protection.get('require_linear_history', False),
                    'block_force_pushes': protection.get('block_force_pushes', False),
                    'allow_force_pushes': protection.get('allow_force_pushes', {}).get('enabled', False),
                    'required_status_checks': protection.get('required_status_checks', []),
                }
            elif response.status_code == 404:
                # Try default branch
                default_url = f'https://api.github.com/repos/{self.org}/{repo}'
                resp = requests.get(default_url, headers=self.headers)
                if resp.status_code == 200:
                    default_branch = resp.json().get('default_branch', 'unknown')
                    return {
                        'status': 'no_protection',
                        'default_branch': default_branch,
                        'note': f'No protection configured for {default_branch}'
                    }
                return {'status': 'error', 'error': f'HTTP {resp.status_code}'}
            else:
                return {'status': 'error', 'error': f'HTTP {response.status_code}'}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    def check_all_priority_repos(self) -> dict[str, Any]:
        """Check branch protection on all priority repositories."""
        results = {}
        for repo in self.PRIORITY_REPOS:
            print(f"Checking {repo}...")
            result = self.check_branch_protection(repo)
            results[repo] = result
            if result['status'] == 'protected':
                print(f"  ✓ Protected")
            elif result['status'] == 'no_protection':
                print(f"  ✗ Not protected ({result.get('default_branch', 'unknown')})")
            else:
                print(f"  ? {result.get('error', 'Unknown error')}")
        return results

    def check_secret_scanning(self, repo: str) -> dict[str, Any]:
        """Check if secret scanning is enabled on a repository."""
        url = f'https://api.github.com/repos/{self.org}/{repo}/code-scanning'
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                alerts = response.json()
                return {
                    'status': 'enabled',
                    'alert_count': len(alerts) if isinstance(alerts, list) else 0
                }
            elif response.status_code == 404:
                return {'status': 'disabled', 'note': 'No code scanning configured'}
            else:
                return {'status': 'unknown', 'error': f'HTTP {response.status_code}'}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    def check_workflow_exists(self, repo: str, workflow_name: str) -> bool:
        """Check if a specific workflow exists in the repository."""
        url = f'https://api.github.com/repos/{self.org}/{repo}/actions/workflows'
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                workflows = response.json().get('workflows', [])
                for wf in workflows:
                    if workflow_name.lower() in wf.get('name', '').lower():
                        return True
                return False
            return False
        except Exception:
            return False

    def run_verification(self) -> dict[str, Any]:
        """Run full verification."""
        print(f"\n{'='*60}")
        print(f"Org Security Verification")
        print(f"Organization: {self.org}")
        print(f"Date: {self.results['verification_date']}")
        print(f"{'='*60}\n")

        # Check org settings
        print("1. Checking organization settings...")
        org_settings = self.check_org_settings()
        self.results['checks']['org_settings'] = org_settings
        if org_settings.get('status') == 'success':
            print(f"   ✓ Organization: {org_settings.get('login')}")
        else:
            print(f"   ✗ {org_settings.get('error', 'Unknown error')}")

        # Check rulesets
        print("\n2. Checking organization rulesets...")
        rulesets = self.check_rulesets()
        self.results['checks']['rulesets'] = rulesets
        if rulesets.get('status') == 'success':
            print(f"   ✓ Found {rulesets.get('ruleset_count', 0)} rulesets")
            for req in rulesets.get('required_found', []):
                print(f"     - {req}")
        elif rulesets.get('status') == 'unavailable':
            print(f"   ⚠ Rulesets API unavailable (requires GitHub Enterprise)")
            print(f"     Manual verification required in organization settings")
        else:
            print(f"   ✗ {rulesets.get('error', 'Unknown error')}")

        # Check priority repos
        print("\n3. Checking priority repository branch protection...")
        branch_protection = self.check_all_priority_repos()
        self.results['checks']['branch_protection'] = branch_protection

        protected_count = len([r for r in branch_protection.values() if r.get('status') == 'protected'])
        print(f"\n   Summary: {protected_count}/{len(self.PRIORITY_REPOS)} repositories protected")

        # Summary
        self.results['summary'] = {
            'org_verified': org_settings.get('status') == 'success',
            'rulesets_available': rulesets.get('status') == 'success',
            'rulesets_require_manual': rulesets.get('status') == 'unavailable',
            'branch_protection_protected': protected_count,
            'branch_protection_total': len(self.PRIORITY_REPOS),
            'verification_complete': True
        }

        return self.results

    def generate_report(self, format: str = 'markdown') -> str:
        """Generate verification report."""
        if format == 'json':
            return json.dumps(self.results, indent=2)
        elif format == 'markdown':
            return self._generate_markdown_report()
        else:
            return str(self.results)

    def _generate_markdown_report(self) -> str:
        """Generate markdown report."""
        r = self.results
        checks = r.get('checks', {})
        
        md = f"""# Org Security Verification Report

**Date**: {r['verification_date']}  
**Organization**: {r['organization']}  
**Reference**: [{r['reference']}]({r['reference']})

---

## Summary

| Check | Status |
|-------|--------|
| Organization Settings | {'✓' if checks.get('org_settings', {}).get('status') == 'success' else '✗'} |
| Rulesets (Automated) | {'✓' if checks.get('rulesets', {}).get('status') == 'success' else '⚠' if checks.get('rulesets', {}).get('status') == 'unavailable' else '✗'} |
| Branch Protection | {checks.get('branch_protection', {}).get('protected_count', 0)}/{checks.get('branch_protection', {}).get('total_count', len(self.PRIORITY_REPOS))} |

---

## 1. Organization Settings

"""
        org = checks.get('org_settings', {})
        if org.get('status') == 'success':
            md += f"""- **Login**: {org.get('login')}
- **Description**: {org.get('description', 'N/A')}
- **Public Repos**: {org.get('public_repos', 0)}
- **Private Repos**: {org.get('total_private_repos', 0)}
"""
        else:
            md += f"- **Error**: {org.get('error', 'Unknown')}\n"

        md += """
---

## 2. Organization Rulesets

"""
        rulesets = checks.get('rulesets', {})
        if rulesets.get('status') == 'success':
            md += f"**Found {rulesets.get('ruleset_count', 0)} rulesets:**\n\n"
            for rs in rulesets.get('rulesets', []):
                md += f"- **{rs.get('name')}** - Enforcement: {rs.get('enforcement')}\n"
            md += f"\n**Required rulesets found:**\n"
            for req in rulesets.get('required_found', []):
                md += f"- ✓ {req}\n"
        elif rulesets.get('status') == 'unavailable':
            md += """⚠ **Rulesets API requires GitHub Enterprise**

Manual verification required. To verify rulesets manually:

1. Go to your organization settings
2. Navigate to **Rules → Rulesets**
3. Verify the following rulesets are configured and active:
   - `org-default-branch-protection`
   - `org-secret-scanning-enforcement`
   - `org-dependency-review`
   - `org-push-protection`

See: [.github/ORG_SECURITY_GOVERNANCE.md](.github/ORG_SECURITY_GOVERNANCE.md)
"""
        else:
            md += f"- **Error**: {rulesets.get('error', 'Unknown')}\n"

        md += """
---

## 3. Priority Repository Branch Protection

"""
        bp = checks.get('branch_protection', {})
        md += "| Repository | Status | Details |\n"
        md += "|------------|--------|--------|\n"
        
        for repo, protection in bp.items():
            status = protection.get('status', 'unknown')
            if status == 'protected':
                details = f"PR: {protection.get('require_pr_reviews', False)}, Linear: {protection.get('require_linear_history', False)}"
            elif status == 'no_protection':
                details = f"No protection on {protection.get('default_branch', 'branch')}"
            else:
                details = protection.get('error', 'Unknown')
            
            icon = '✓' if status == 'protected' else '✗' if status == 'no_protection' else '?'
            md += f"| {repo} | {icon} | {details} |\n"

        md += """
---

## 4. Live-Only Verification Rule

> **Critical**: Per issue #854, verification **must** include settings-level evidence.
> Documentation and workflow presence alone do not satisfy the verification requirement.

### Acceptable Evidence

- GitHub API response showing ruleset configuration
- GitHub Settings UI screenshot with timestamp
- Terraform/IaC configuration with apply confirmation
- Secret scanning alerts showing active blocking

### Unacceptable Evidence

- Documentation file presence alone
- Workflow file existence alone
- CODEOWNERS file presence alone

---

## 5. Next Steps

1. **If rulesets API unavailable**: Verify rulesets manually in GitHub organization settings
2. **If branch protection missing**: Enable branch protection on unprotected repositories
3. **Document findings**: Attach verification evidence to issue #854
4. **Close issue**: Only close after live verification is complete with acceptable evidence

---

*Generated by `scripts/verify_org_security.py`*
"""
        return md


def main():
    parser = argparse.ArgumentParser(
        description='Verify org-level GitHub security settings'
    )
    parser.add_argument(
        '--org',
        default=os.environ.get('GITHUB_ORG', 'Conxian'),
        help='Organization name (default: Conxian or GITHUB_ORG env var)'
    )
    parser.add_argument(
        '--token',
        default=os.environ.get('GITHUB_TOKEN'),
        help='GitHub token (default: GITHUB_TOKEN env var)'
    )
    parser.add_argument(
        '--output',
        choices=['json', 'markdown', 'both'],
        default='both',
        help='Output format (default: both)'
    )
    parser.add_argument(
        '--repo',
        help='Check a specific repository only'
    )

    args = parser.parse_args()

    if not args.token:
        print("Error: GitHub token required. Set GITHUB_TOKEN environment variable or use --token")
        print("Required scope: repo (for private repos) or public_repo (for public repos only)")
        sys.exit(1)

    verifier = OrgSecurityVerifier(args.org, args.token)

    if args.repo:
        # Check specific repo
        result = verifier.check_branch_protection(args.repo)
        print(json.dumps(result, indent=2))
    else:
        # Run full verification
        results = verifier.run_verification()

        if args.output == 'json':
            print(verifier.generate_report('json'))
        elif args.output == 'markdown':
            print(verifier.generate_report('markdown'))
        else:
            print(verifier.generate_report('markdown'))
            print("\n" + "="*60)
            print("JSON Output:")
            print("="*60)
            print(verifier.generate_report('json'))


if __name__ == '__main__':
    main()
