# Bounty Payout Enablement Runbook

> Maintainer-only operational guide for enabling/disabling bounty payouts on mainnet

## Overview

This runbook defines the exact steps, verification checks, and rollback procedures for enabling bounty payouts funded by ALEX on Stacks mainnet.

---

## 1. Pre-Enablement Checklist

Before enabling payout-ready mode, verify ALL of the following:

### 1.1 Infrastructure Verification

| Check | Command | Expected Result |
|-------|---------|-----------------|
| ConxianCSF deployed on mainnet | `make verify-deployment` | ✅ All services healthy |
| Gateway endpoints accessible | `curl -s https://gateway.conxian.io/health` | `{"status":"ok"}` |
| Database migrations complete | `make db-status` | ✅ No pending migrations |

### 1.2 ALEX Funding Source Verification

| Check | Verification |
|-------|-------------|
| ALEX launch path active | Confirm `ALEX_CONTRACT_ADDRESS` in `.env.production` |
| Sufficient funds available | Verify treasury balance ≥ bounty pool threshold |
| Multi-sig approval complete | At least 2/3 maintainers signed |

### 1.3 Security Controls

| Check | Status |
|-------|--------|
| Signer wallet ownership verified | [ ] |
| Approval controls tested | [ ] |
| Monitoring alerts configured | [ ] |
| Incident owner assigned | [ ] |

---

## 2. Enablement Procedure

### 2.1 Enable Payout-Ready Mode

```bash
# Step 1: Set environment variable
export BOUNTY_PAYOUT_ENABLED=true

# Step 2: Apply configuration
make config-apply ENV=production

# Step 3: Verify change took effect
make verify-payout-status
```

### 2.2 Verification Evidence Required

After enablement, collect and document:

1. **Transaction Log**: Record the enablement transaction hash
2. **Balance Snapshot**: Screenshot of treasury before/after
3. **Test Payout**: Execute a minimal test payout (if applicable)
4. **Alert Confirmation**: Verify monitoring alerts are active

### 2.3 Post-Enablement Validation

```bash
# Run health checks
make health-check --env=production

# Verify payout API responds
curl -X POST https://gateway.conxian.io/api/bounty/payout/test \
  -H "Authorization: Bearer $MAINTAINER_TOKEN"
```

---

## 3. Rollback Procedure

If bounty payouts must be **disabled** (premature enablement, post-deploy issue, security incident):

### 3.1 Immediate Rollback

```bash
# Step 1: Disable payout mode
export BOUNTY_PAYOUT_ENABLED=false

# Step 2: Apply configuration
make config-apply ENV=production

# Step 3: Verify disabled
make verify-payout-status
# Expected: BOUNTY_PAYOUT_ENABLED=false
```

### 3.2 Post-Rollback Actions

| Action | Owner | Deadline |
|--------|-------|----------|
| Incident report filed | On-call maintainer | 24 hours |
| Root cause analysis | Tech lead | 72 hours |
| Stakeholder notification | Project manager | 4 hours |

### 3.3 Rollback Verification

- [ ] Payout API returns 403 Forbidden
- [ ] No new payouts processed
- [ ] Pending payouts frozen
- [ ] Treasury balance unchanged

---

## 4. Contributor-Facing Messaging

While payout mode is **disabled**:

> "Bounty claims are being reviewed. Payouts will be enabled after mainnet stabilization. Thank you for your patience."

After payout mode is **enabled**:

> "Bounty payouts are now active on mainnet. Claimed and verified contributions will be processed within 5 business days."

---

## 5. Emergency Contacts

| Role | Contact |
|------|---------|
| On-call Maintainer | #ops-alerts (Slack) |
| Security Team | security@conxian.io |
| ALEX Protocol | #alex-support |

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-03-30 | OpenClaw Bot | Initial runbook creation |

---

*This document is maintained by the Conxian Platform operations team. For updates, submit a PR to `docs/operations/`.*
