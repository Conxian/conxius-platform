{
  "bounty_decision_matrix": {
    "internal_only": [
      {
        "id": "CON-129",
        "title": "CSF Mainnet Readiness Gate",
        "decision": "Keep internal-only. Contains security-sensitive readiness criteria that should not be publicly visible before mainnet go-live.",
        "reason": "Exposing readiness gates could allow malicious actors to target known gaps."
      },
      {
        "id": "CON-167",
        "title": "Maintainer Payout Enablement Checklist for Alex-Funded Bounties",
        "decision": "Keep internal-only. Contains payout mechanism details and maintainer access patterns.",
        "reason": "Payout gating and maintainer workflows should remain private until mainnet is live."
      },
      {
        "id": "CON-135",
        "title": "Internal Security Audit Findings",
        "decision": "Keep internal-only. Contains vulnerability details.",
        "reason": "Security-sensitive information must not be publicly claimable."
      }
    ],
    "security_sensitive": [
      {
        "id": "CON-142",
        "title": "Node Key Rotation Implementation",
        "decision": "Gate behind maintainer approval. Do not open publicly before mainnet.",
        "reason": "Key management code requires careful review and controlled rollout."
      },
      {
        "id": "CON-158",
        "title": "Transaction Validation Hardening",
        "decision": "Keep internal-only until mainnet launch. Then open with reduced scope.",
        "reason": "Validation logic changes could introduce consensus bugs if not properly tested."
      }
    ],
    "payout_gated": [
      {
        "id": "CON-171",
        "title": "Documentation Improvements for Staking",
        "decision": "Open publicly but with payout gating. Only pay after mainnet go-live verification.",
        "reason": "Documentation is safe to share, but payout should be conditional on mainnet compatibility."
      },
      {
        "id": "CON-175",
        "title": "Testnet Monitoring Dashboard",
        "decision": "Open publicly. Payout can be processed before mainnet as it's testnet-only.",
        "reason": "No mainnet risk. Dashboard helps community monitor testnet health."
      }
    ],
    "externally_claimable": [
      {
        "id": "CON-180",
        "title": "Simple CLI Tool for Balance Checking",
        "decision": "Open publicly. Low risk, community-friendly task.",
        "reason": "No security implications. Helps onboard new developers."
      },
      {
        "id": "CON-183",
        "title": "Bug Bounty: Minor UI Fixes in Explorer",
        "decision": "Open publicly with clear scope and payout limits.",
        "reason": "UI fixes are safe and visible to all. Payout can be processed immediately."
      },
      {
        "id": "CON-186",
        "title": "Create Integration Test for P2P Message Relay",
        "decision": "Open publicly but require maintainer review before payout.",
        "reason": "Tests are valuable but need review to ensure they don't introduce flakiness."
      }
    ]
  },
  "summary": {
    "total_issues_reviewed": 10,
    "internal_only": 3,
    "security_sensitive": 2,
    "payout_gated": 2,
    "externally_claimable": 3,
    "recommendation": "Open 5 bounties publicly before mainnet (CON-175, CON-180, CON-183, CON-186 with review, CON-171 with payout gating). Keep 5 closed/internal until after mainnet go-live."
  },
  "wallet": "TU8NBT5iGyMNkLwWmWmgy7tFMbKnafLHcu"
}
