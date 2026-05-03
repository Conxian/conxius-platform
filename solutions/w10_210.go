{
  "bounty_classification": {
    "internal_only": [
      {
        "id": "CON-129",
        "title": "CSF Mainnet Readiness Gate",
        "reason": "Internal security and readiness review, not suitable for external contributors"
      },
      {
        "id": "CON-167",
        "title": "Maintainer Payout Enablement Checklist for Alex-Funded Bounties",
        "reason": "Internal operational task for maintainers only"
      },
      {
        "id": "CON-135",
        "title": "Internal Audit Preparation",
        "reason": "Security-sensitive internal process"
      }
    ],
    "security_sensitive": [
      {
        "id": "CON-142",
        "title": "Node Key Management Hardening",
        "reason": "Directly affects mainnet security; requires gated access"
      },
      {
        "id": "CON-158",
        "title": "Transaction Validation Edge Cases",
        "reason": "Potential vulnerability if disclosed prematurely"
      }
    ],
    "payout_gated": [
      {
        "id": "CON-171",
        "title": "Mainnet Launch Documentation",
        "reason": "Payouts only after mainnet go-live verification"
      },
      {
        "id": "CON-175",
        "title": "Staking UI Integration",
        "reason": "Requires mainnet contracts to be deployed for testing"
      }
    ],
    "externally_claimable": [
      {
        "id": "CON-188",
        "title": "Improve P2P Peer Discovery Logging",
        "reason": "Safe to open; no security impact, improves debugging"
      },
      {
        "id": "CON-192",
        "title": "Add Unit Tests for Block Propagation",
        "reason": "Low risk, improves code quality"
      },
      {
        "id": "CON-195",
        "title": "Documentation: Node Setup Guide for Testnet",
        "reason": "Publicly useful, no mainnet risk"
      },
      {
        "id": "CON-199",
        "title": "Refactor Config File Parsing",
        "reason": "Code improvement with no security implications"
      }
    ]
  },
  "decision_summary": {
    "can_open_before_mainnet": [
      "CON-188",
      "CON-192",
      "CON-195",
      "CON-199"
    ],
    "must_remain_internal": [
      "CON-129",
      "CON-167",
      "CON-135"
    ],
    "security_gated": [
      "CON-142",
      "CON-158"
    ],
    "payout_delayed": [
      "CON-171",
      "CON-175"
    ]
  },
  "wallet": "TU8NBT5iGyMNkLwWmWmgy7tFMbKnafLHcu"
}
