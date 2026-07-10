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
                    'status': 'requires_enterprise',
                    'error': 'Rulesets API requires GitHub Enterprise Cloud',
                    'note': 'Manual verification required in organization settings',
                    'manual_checklist': [
                        'Go to https://github.com/organizations/{}/settings/rules'.format(self.org),
                        'Verify org-default-branch-protection ruleset exists and is active',
                        'Verify org-secret-scanning-enforcement ruleset exists and is active',
                        'Verify org-dependency-review ruleset exists and is active',
                        'Verify org-push-protection ruleset exists and is active'
                    ]
                }
            elif response.status_code == 403:
                return {
                    'status': 'requires_permissions',
                    'error': 'Admin permissions required for rulesets API',
                    'note': 'Token needs admin:org scope or org owner role',
                    'manual_checklist': [
                        'Request org admin to verify rulesets configuration',
                        'Or use an admin token with org ruleset read permissions',
                        'Manual check: https://github.com/organizations/{}/settings/rules'.format(self.org)
                    ]
                }
            else:
                return {
                    'status': 'error',
                    'error': f'HTTP {response.status_code}: {response.text}'
                }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    def check_branch_protection(self, repo: str, branch: str = 'main') -> dict[str, Any]:
        """Check branch protection for a repository."""
        # First, get the default branch if not specified
        default_url = f'https://api.github.com/repos/{self.org}/{repo}'
        try:
            resp = requests.get(default_url, headers=self.headers)
            if resp.status_code == 200:
                repo_info = resp.json()
                default_branch = repo_info.get('default_branch', branch)
            elif resp.status_code == 404:
                return {
                    'status': 'not_found',
                    'error': f'Repository {repo} not found',
                    'note': 'Check if repository name is correct'
                }
            elif resp.status_code == 403:
                return {
                    'status': 'requires_permissions',
                    'error': 'Admin permissions required for branch protection API',
                    'note': 'Token needs admin:repo_hook scope or repository admin role',
                    'manual_checklist': [
                        f'Go to https://github.com/{self.org}/{repo}/settings/branches',
                        'Verify branch protection rules are configured',
                        'Document: PR reviews required, linear history, force push blocked'
                    ]
                }
            else:
                return {'status': 'error', 'error': f'HTTP {resp.status_code}'}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

        # Now check branch protection for the default branch
        url = f'https://api.github.com/repos/{self.org}/{repo}/branches/{default_branch}/protection'
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                protection = response.json()
                return {
                    'status': 'protected',
                    'default_branch': default_branch,
                    'require_pr_reviews': protection.get('required_pull_request_reviews', {}).get('required', False),
                    'required_approving_review_count': protection.get('required_pull_request_reviews', {}).get('required_approving_review_count'),
                    'dismiss_stale_reviews': protection.get('dismiss_stale_reviews', False),
                    'require_linear_history': protection.get('require_linear_history', False),
                    'block_force_pushes': protection.get('block_force_pushes', False),
                    'allow_force_pushes': protection.get('allow_force_pushes', {}).get('enabled', False),
                    'required_status_checks': protection.get('required_status_checks', []),
                }
            elif response.status_code == 404:
                return {
                    'status': 'no_protection',
                    'default_branch': default_branch,
                    'note': f'No protection configured for {default_branch}'
                }
            elif response.status_code == 403:
                return {
                    'status': 'requires_permissions',
                    'default_branch': default_branch,
                    'error': 'Admin permissions required for branch protection API',
                    'note': 'Token needs admin:repo_hook scope or repository admin role',
                    'manual_checklist': [
                        f'Go to https://github.com/{self.org}/{repo}/settings/branches',
                        'Verify branch protection rules are configured',
                        'Document: PR reviews required, linear history, force push blocked'
                    ]
                }
            else:
                return {'status': 'error', 'error': f'HTTP {response.status_code}'}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    def check_all_priority_repos(self) -> dict[str, Any]:
        """Check branch protection on all priority repositories."""
        results = {}
        protected_count = 0
        requires_manual_count = 0
        not_protected_count = 0
        
        for repo in self.PRIORITY_REPOS:
            print(f"Checking {repo}...")
            result = self.check_branch_protection(repo)
            results[repo] = result
            
            if result['status'] == 'protected':
                print(f"  ✓ Protected ({result.get('default_branch', 'unknown')})")
                protected_count += 1
            elif result['status'] == 'no_protection':
                print(f"  ✗ Not protected ({result.get('default_branch', 'unknown')})")
                not_protected_count += 1
            elif result['status'] == 'requires_permissions':
                print(f"  ⚠ Requires admin permissions")
                requires_manual_count += 1
            elif result['status'] == 'not_found':
                print(f"  ✗ Repository not found")
            else:
                print(f"  ? {result.get('error', 'Unknown error')}")
        
        results['_summary'] = {
            'protected': protected_count,
            'not_protected': not_protected_count,
            'requires_manual': requires_manual_count,
            'total': len(self.PRIORITY_REPOS)
        }
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
        elif rulesets.get('status') == 'requires_enterprise':
            print(f"   ⚠ Rulesets API requires GitHub Enterprise Cloud")
            print(f"   Manual verification required:")
            for step in rulesets.get('manual_checklist', []):
                print(f"     - {step}")
        elif rulesets.get('status') == 'requires_permissions':
            print(f"   ⚠ Admin permissions required for rulesets API")
            print(f"   Manual verification required:")
            for step in rulesets.get('manual_checklist', []):
                print(f"     - {step}")
        else:
            print(f"   ✗ {rulesets.get('error', 'Unknown error')}")

        # Check priority repos
        print("\n3. Checking priority repository branch protection...")
        branch_protection = self.check_all_priority_repos()
        self.results['checks']['branch_protection'] = branch_protection

        summary = branch_protection.get('_summary', {})
        protected_count = summary.get('protected', 0)
        requires_manual = summary.get('requires_manual', 0)
        total = summary.get('total', len(self.PRIORITY_REPOS))
        
        print(f"\n   Summary: {protected_count}/{total} repositories protected")
        if requires_manual > 0:
            print(f"   ⚠ {requires_manual} repositories require manual verification (admin permissions needed)")

        # Summary
        self.results['summary'] = {
            'org_verified': org_settings.get('status') == 'success',
            'rulesets_available': rulesets.get('status') == 'success',
            'rulesets_requires_manual': rulesets.get('status') in ['requires_enterprise', 'requires_permissions'],
            'branch_protection_protected': protected_count,
            'branch_protection_requires_manual': requires_manual,
            'branch_protection_total': total,
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
        
        # Calculate summary status
        rulesets_status = checks.get('rulesets', {}).get('status', 'unknown')
        bp_summary = checks.get('branch_protection', {}).get('_summary', {})
        
        md = f"""# Org Security Verification Report

**Date**: {r['verification_date']}  
**Organization**: {r['organization']}  
**Reference**: [{r['reference']}]({r['reference']})

---

## Summary

| Check | Status |
|-------|--------|
| Organization Settings | {'✓' if checks.get('org_settings', {}).get('status') == 'success' else '✗'} |
| Rulesets (Automated) | {'✓' if rulesets_status == 'success' else '⚠ Manual Required' if rulesets_status in ['requires_enterprise', 'requires_permissions'] else '✗'} |
| Branch Protection | {bp_summary.get('protected', 0)}/{bp_summary.get('total', len(self.PRIORITY_REPOS))} protected{' (⚠ ' + str(bp_summary.get('requires_manual', 0)) + ' require manual)' if bp_summary.get('requires_manual', 0) > 0 else ''} |

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
        elif rulesets.get('status') == 'requires_enterprise':
            md += """⚠ **Rulesets API requires GitHub Enterprise Cloud**

Automated verification is not available. Manual verification required.

**Manual Verification Steps:**

1. Go to your organization settings
2. Navigate to **Rules → Rulesets**
3. Verify the following rulesets are configured and active:

| Ruleset Name | Expected Enforcement |
|--------------|---------------------|
| `org-default-branch-protection` | Active |
| `org-secret-scanning-enforcement` | Active |
| `org-dependency-review` | Active |
| `org-push-protection` | Active |

**Required Ruleset Settings (per ORG_SECURITY_GOVERNANCE.md):**

- ✓ Require pull request reviews (1 approval minimum)
- ✓ Dismiss stale reviews enabled
- ✓ Require linear history enabled
- ✓ Block force pushes enabled
- ✓ Block deletions enabled
- ✓ Secret scanning enabled (all repositories)
- ✓ Push protection enabled (public repositories)
- ✓ Dependency review enabled

See: [.github/ORG_SECURITY_GOVERNANCE.md](.github/ORG_SECURITY_GOVERNANCE.md)
"""
        elif rulesets.get('status') == 'requires_permissions':
            md += """⚠ **Admin permissions required for rulesets API**

Your token does not have sufficient permissions to access the rulesets API.

**Options:**

1. **Request org admin assistance**: Ask an org admin to verify and document the ruleset configuration
2. **Use an admin token**: Generate a token with `admin:org` scope
3. **Manual verification**: Check the rulesets manually in org settings

**Manual Verification Steps:**

1. Go to https://github.com/organizations/{}/settings/rules
2. Document the current ruleset configuration
3. Verify all required rulesets are active per ORG_SECURITY_GOVERNANCE.md

See: [.github/ORG_SECURITY_GOVERNANCE.md](.github/ORG_SECURITY_GOVERNANCE.md)
""".format(self.org)
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
            if repo == '_summary':
                continue
            status = protection.get('status', 'unknown')
            if status == 'protected':
                details = f"PR: {protection.get('require_pr_reviews', False)}, Linear: {protection.get('require_linear_history', False)}, ForcePush: {protection.get('block_force_pushes', False)}"
            elif status == 'no_protection':
                details = f"No protection on {protection.get('default_branch', 'branch')}"
            elif status == 'requires_permissions':
                details = "Admin permissions required - manual check needed"
            elif status == 'not_found':
                details = protection.get('error', 'Unknown')
            else:
                details = protection.get('error', 'Unknown')
            
            icon = '✓' if status == 'protected' else '✗' if status in ['no_protection', 'not_found'] else '⚠'
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
