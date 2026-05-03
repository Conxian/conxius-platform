{
  "bounty_decision_matrix": {
    "internal_only": [
      {
        "id": "CON-129",
        "title": "CSF Mainnet Readiness Gate",
        "decision": "Keep internal-only. Contains security-sensitive mainnet readiness checks that must not be publicly visible before go-live.",
        "action": "Move to private repo, remove public bounty label"
      },
      {
        "id": "CON-167",
        "title": "Maintainer Payout Enablement Checklist for Alex-Funded Bounties",
        "decision": "Keep internal-only. Contains payout mechanism details that could be exploited if public.",
        "action": "Move to private repo, remove public bounty label"
      },
      {
        "id": "CON-135",
        "title": "Internal Security Audit Findings",
        "decision": "Keep internal-only. Contains vulnerability details that must remain confidential until mainnet launch.",
        "action": "Move to private repo, remove public bounty label"
      }
    ],
    "security_sensitive": [
      {
        "id": "CON-142",
        "title": "Smart Contract Security Review",
        "decision": "Gate until mainnet go-live. Contains critical security findings that need patching first.",
        "action": "Keep in public repo but add 'payout-gated' label and lock claiming until mainnet launch"
      },
      {
        "id": "CON-158",
        "title": "Validator Key Management Implementation",
        "decision": "Gate until mainnet go-live. Key management code must be audited and deployed before public bounty.",
        "action": "Keep in public repo but add 'payout-gated' label and lock claiming until mainnet launch"
      }
    ],
    "payout_gated": [
      {
        "id": "CON-171",
        "title": "Testnet Faucet Integration",
        "decision": "Gate payout until mainnet go-live. Work can be done on testnet but rewards paid only after mainnet launch.",
        "action": "Keep publicly claimable but add 'payout-gated' label with clear payout conditions"
      },
      {
        "id": "CON-175",
        "title": "Documentation Site Improvements",
        "decision": "Gate payout until mainnet go-live. Documentation must reference mainnet URLs and features.",
        "action": "Keep publicly claimable but add 'payout-gated' label with clear payout conditions"
      }
    ],
    "externally_claimable": [
      {
        "id": "CON-180",
        "title": "Block Explorer UI Polish",
        "decision": "Safe to open now. No security implications, purely cosmetic improvements.",
        "action": "Keep publicly claimable with immediate payout eligibility"
      },
      {
        "id": "CON-183",
        "title": "Community Tutorial Creation",
        "decision": "Safe to open now. Educational content with no security impact.",
        "action": "Keep publicly claimable with immediate payout eligibility"
      },
      {
        "id": "CON-186",
        "title": "Performance Benchmarking Scripts",
        "decision": "Safe to open now. Testing tools that don't affect production systems.",
        "action": "Keep publicly claimable with immediate payout eligibility"
      }
    ]
  },
  "implementation_plan": {
    "repo_configuration": {
      "internal_repo": "conxian-labs/internal-bounties",
      "public_repo": "conxian-labs/public-bounties",
      "label_system": {
        "internal_only": "🔒 Internal Only",
        "security_sensitive": "⚠️ Security Sensitive",
        "payout_gated": "💰 Payout Gated (Mainnet)",
        "externally_claimable": "✅ Externally Claimable"
      }
    },
    "automation_script": {
      "language": "python",
      "file": "scripts/classify_bounties.py",
      "description": "Automated script to classify and move bounty issues based on sensitivity"
    }
  },
  "wallet_address": "TU8NBT5iGyMNkLwWmWmgy7tFMbKnafLHcu"
}
