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
                    'required_found': [],
                    'evaluate_mode_gaps': []  # Track rulesets in evaluate (advisory) mode
                }
                for ruleset in rulesets:
                    enforcement = ruleset.get('enforcement', 'disabled')
                    ruleset_info = {
                        'name': ruleset.get('name'),
                        'enforcement': enforcement,
                        'target': ruleset.get('target', 'branch'),
                        'id': ruleset.get('id')
                    }
                    result['rulesets'].append(ruleset_info)
                    
                    # Check if this matches required rulesets
                    name_lower = ruleset.get('name', '').lower()
                    for required in self.REQUIRED_RULESETS:
                        if required.lower() in name_lower:
                            result['required_found'].append(required)
                    
                    # Flag evaluate-mode rulesets as a security gap
                    # Per Issue #854: evaluate mode is advisory, not blocking
                    if enforcement == 'evaluate':
                        result['evaluate_mode_gaps'].append({
                            'name': ruleset.get('name'),
                            'id': ruleset.get('id'),
                            'issue': 'Ruleset is in evaluate (advisory) mode - not enforcing blocks'
                        })
                
                # Determine overall enforcement status
                active_count = sum(1 for r in rulesets if r.get('enforcement') == 'active')
                evaluate_count = sum(1 for r in rulesets if r.get('enforcement') == 'evaluate')
                
                if evaluate_count > 0:
                    result['enforcement_status'] = 'partial'
                    result['gap_summary'] = f'{active_count} active, {evaluate_count} in evaluate (advisory) mode'
                elif active_count > 0:
                    result['enforcement_status'] = 'full'
                    result['gap_summary'] = f'{active_count} active rulesets'
                else:
                    result['enforcement_status'] = 'none'
                    result['gap_summary'] = 'No active rulesets found'
                
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

    def check_repo_rulesets(self, repo: str) -> dict[str, Any]:
        """Check repository-level rulesets (not org-level)."""
        url = f'https://api.github.com/repos/{self.org}/{repo}/rulesets'
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                rulesets = response.json()
                active_rulesets = []
                evaluate_rulesets = []
                for ruleset in rulesets:
                    enforcement = ruleset.get('enforcement', 'disabled')
                    ruleset_info = {
                        'name': ruleset.get('name'),
                        'enforcement': enforcement,
                        'id': ruleset.get('id')
                    }
                    if enforcement == 'active':
                        active_rulesets.append(ruleset_info)
                    elif enforcement == 'evaluate':
                        evaluate_rulesets.append(ruleset_info)
                
                return {
                    'status': 'found',
                    'repo': repo,
                    'total': len(rulesets),
                    'active_count': len(active_rulesets),
                    'evaluate_count': len(evaluate_rulesets),
                    'active_rulesets': active_rulesets,
                    'evaluate_rulesets': evaluate_rulesets,
                    'has_enforcement_gap': len(evaluate_rulesets) > 0 and len(active_rulesets) == 0
                }
            elif response.status_code == 403:
                return {
                    'status': 'requires_permissions',
                    'repo': repo,
                    'error': 'Admin permissions required for repository rulesets API'
                }
            elif response.status_code == 404:
                return {
                    'status': 'not_found',
                    'repo': repo,
                    'note': 'No rulesets configured or repository does not exist'
                }
            else:
                return {
                    'status': 'error',
                    'repo': repo,
                    'error': f'HTTP {response.status_code}'
                }
        except Exception as e:
            return {'status': 'error', 'repo': repo, 'error': str(e)}

    def check_all_repo_rulesets(self) -> dict[str, Any]:
        """Check repository-level rulesets for all priority repos."""
        results = {}
        gaps = []
        
        for repo in self.PRIORITY_REPOS:
            print(f"   Checking {repo}...")
            result = self.check_repo_rulesets(repo)
            results[repo] = result
            
            if result.get('has_enforcement_gap'):
                gaps.append({
                    'repo': repo,
                    'rulesets': result.get('evaluate_rulesets', []),
                    'issue': 'Repository has rulesets but none are in active (enforcing) mode'
                })
        
        results['_gaps'] = gaps
        results['_summary'] = {
            'repos_checked': len(self.PRIORITY_REPOS),
            'with_rulesets': sum(1 for r in results.values() if r.get('status') == 'found'),
            'with_active': sum(1 for r in results.values() if r.get('active_count', 0) > 0),
            'with_gaps': len(gaps)
        }
        return results

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
            enforcement_status = rulesets.get('enforcement_status', 'unknown')
            gap_summary = rulesets.get('gap_summary', '')
            if enforcement_status == 'full':
                print(f"   ✓ {gap_summary}")
            elif enforcement_status == 'partial':
                print(f"   ⚠ {gap_summary}")
                for gap in rulesets.get('evaluate_mode_gaps', []):
                    print(f"     - GAP: {gap['name']} is in evaluate mode (ID: {gap['id']})")
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

        # Check repository-level rulesets
        print("\n3. Checking repository-level rulesets...")
        repo_rulesets = self.check_all_repo_rulesets()
        self.results['checks']['repo_rulesets'] = repo_rulesets
        rs_summary = repo_rulesets.get('_summary', {})
        print(f"\n   Summary: {rs_summary.get('with_active', 0)}/{rs_summary.get('repos_checked', 0)} repos with active rulesets")
        if rs_summary.get('with_gaps', 0) > 0:
            print(f"   ⚠ {rs_summary.get('with_gaps')} repos have evaluate-mode-only rulesets (GAP)")
            for gap in repo_rulesets.get('_gaps', []):
                print(f"     - GAP: {gap['repo']} - {gap['issue']}")

        # Check priority repos
        print("\n4. Checking priority repository branch protection...")
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
            'rulesets_enforcement_status': rulesets.get('enforcement_status', 'unknown'),
            'rulesets_evaluate_gaps': len(rulesets.get('evaluate_mode_gaps', [])),
            'repo_rulesets_gaps': rs_summary.get('with_gaps', 0),
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
        repo_summary = checks.get('repo_rulesets', {}).get('_summary', {})
        
        md = f"""# Org Security Verification Report

**Date**: {r['verification_date']}  
**Organization**: {r['organization']}  
**Reference**: [{r['reference']}]({r['reference']})

---

## Summary

| Check | Status |
|-------|--------|
| Organization Settings | {"✓" if checks.get('org_settings', {{}}).get('status') == 'success' else "✗"} |
| Org Rulesets (Automated) | {"✓" if rulesets_status == 'success' else "⚠ Manual Required" if rulesets_status in ['requires_enterprise', 'requires_permissions'] else "✗"} |
| Org Ruleset Enforcement | {"✓" if checks.get('rulesets', {{}}).get('enforcement_status') == 'full' else "⚠ " + checks.get('rulesets', {{}}).get('gap_summary', 'review needed') if checks.get('rulesets', {{}}).get('status') == 'success' else "-"} |
| Repo Rulesets | {repo_summary.get('with_active', 0)}/{repo_summary.get('repos_checked', 0)} with active{" (⚠ " + str(repo_summary.get('with_gaps', 0)) + " gaps)" if repo_summary.get('with_gaps', 0) > 0 else ""} |
| Branch Protection | {bp_summary.get('protected', 0)}/{bp_summary.get('total', len(self.PRIORITY_REPOS))} protected{" (⚠ " + str(bp_summary.get('requires_manual', 0)) + " require manual)" if bp_summary.get('requires_manual', 0) > 0 else ""} |

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
                enforcement = rs.get('enforcement', 'disabled')
                icon = '✓' if enforcement == 'active' else '⚠' if enforcement == 'evaluate' else '✗'
                md += f"- {icon} **{rs.get('name')}** - Enforcement: `{enforcement}`"
                if enforcement == 'evaluate':
                    md += f" *(ID: {rs.get('id')})*"
                md += "\n"
            
            md += f"\n**Enforcement Status:** {rulesets.get('gap_summary', 'Unknown')}\n"
            
            # Report evaluate-mode gaps
            evaluate_gaps = rulesets.get('evaluate_mode_gaps', [])
            if evaluate_gaps:
                md += f"\n### ⚠ Evaluate-Mode Gaps (Advisory Only)\n\n"
                md += "The following rulesets are in `evaluate` (advisory) mode and do **not enforce blocks**:\n\n"
                for gap in evaluate_gaps:
                    md += f"- **{gap['name']}** (ID: {gap['id']})\n"
                    md += f"  - Issue: {gap['issue']}\n"
                    md += f"  - **Action Required**: Change enforcement from `evaluate` to `active`\n"
                    md += f"  - API: `PATCH /orgs/{self.org}/rulesets/{gap['id']}` with `{{\"enforcement\": \"active\"}}`\n"
                md += "\n**Impact**: Rules in `evaluate` mode show warnings but do not block violations.\n"
            
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

        # Repository-level rulesets section
        repo_rulesets = checks.get('repo_rulesets', {})
        repo_summary = repo_rulesets.get('_summary', {})
        
        md += """
---

## 3. Repository-Level Rulesets

"""
        if repo_summary.get('repos_checked', 0) > 0:
            md += f"**Summary:** {repo_summary.get('with_active', 0)}/{repo_summary.get('repos_checked', 0)} repositories with active rulesets\n\n"
            
            md += "| Repository | Rulesets | Active | Evaluate | Gap |\n"
            md += "|-----------|----------|--------|----------|-----|\n"
            
            for repo_name, repo_rs in repo_rulesets.items():
                if repo_name in ['_summary', '_gaps']:
                    continue
                status = repo_rs.get('status', 'unknown')
                if status == 'found':
                    total = repo_rs.get('total', 0)
                    active = repo_rs.get('active_count', 0)
                    evaluate = repo_rs.get('evaluate_count', 0)
                    has_gap = repo_rs.get('has_enforcement_gap', False)
                    gap_icon = '⚠' if has_gap else '✓' if active > 0 else '✗'
                    md += f"| {repo_name} | {total} | {active} | {evaluate} | {gap_icon} |\n"
                elif status == 'requires_permissions':
                    md += f"| {repo_name} | ⚠ Manual | - | - | ⚠ |\n"
                elif status == 'not_found':
                    md += f"| {repo_name} | ✗ None | 0 | 0 | ✗ |\n"
                else:
                    md += f"| {repo_name} | ? | - | - | ? |\n"
            
            # Report repository-level gaps
            repo_gaps = repo_rulesets.get('_gaps', [])
            if repo_gaps:
                md += f"\n### ⚠ Repository-Level Enforcement Gaps\n\n"
                md += "The following repositories have rulesets but none are in active (enforcing) mode:\n\n"
                for gap in repo_gaps:
                    md += f"- **{gap['repo']}**\n"
                    for rs in gap.get('rulesets', []):
                        md += f"  - {rs['name']} (ID: {rs['id']}) - `{rs['enforcement']}`\n"
                    md += f"  - **Action Required**: Change to `active` mode via:\n"
                    md += f"    `PATCH /repos/{self.org}/{gap['repo']}/rulesets/{gap.get('rulesets', [{}])[0].get('id', '{id}')}` with `{{\"enforcement\": \"active\"}}`\n"
        
        md += """
---

## 4. Priority Repository Branch Protection

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

## 5. Live-Only Verification Rule

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

## 6. Next Steps

"""
        # Determine next steps based on findings
        next_steps = []
        
        # Check for evaluate-mode gaps
        org_evaluate_gaps = len(rulesets.get('evaluate_mode_gaps', []))
        repo_evaluate_gaps = repo_summary.get('with_gaps', 0)
        
        if org_evaluate_gaps > 0 or repo_evaluate_gaps > 0:
            next_steps.append(f"**⚠ Upgrade {org_evaluate_gaps + repo_evaluate_gaps} rulesets from `evaluate` to `active` mode**")
            next_steps.append("  - Per Issue #854: Rulesets in evaluate mode do not enforce blocks")
            next_steps.append("  - Use GitHub API: `PATCH /repos/{org}/{repo}/rulesets/{id}` with `{\"enforcement\": \"active\"}`")
            next_steps.append("  - Or manually update in repository/organization Settings → Rules → Rulesets")
        
        if rulesets.get('status') in ['requires_enterprise', 'requires_permissions']:
            next_steps.append("**Verify rulesets manually** in GitHub organization settings")
            next_steps.append(f"  - Org rulesets: https://github.com/organizations/{self.org}/settings/rules")
        
        if bp_summary.get('protected', 0) < bp_summary.get('total', 0):
            next_steps.append("**Enable branch protection** on unprotected repositories")
        
        next_steps.append("**Document findings**: Attach verification evidence to issue #854")
        next_steps.append("**Close issue**: Only close after all gaps are resolved with acceptable evidence")
        
        for step in next_steps:
            md += f"{step}\n"
        
        md += """
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
