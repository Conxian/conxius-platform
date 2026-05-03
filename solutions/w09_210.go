{
  "bounty_decision_matrix": {
    "internal_only": [
      {
        "id": "CON-129",
        "title": "CSF Mainnet Readiness Gate",
        "decision": "internal-only",
        "rationale": "Contains sensitive mainnet launch criteria and security thresholds that should not be publicly visible before go-live."
      },
      {
        "id": "CON-167",
        "title": "Maintainer Payout Enablement Checklist for Alex-Funded Bounties",
        "rationale": "Contains payout mechanism details and maintainer access patterns that are security-sensitive."
      },
      {
        "id": "CON-135",
        "title": "Internal Security Audit Findings Remediation",
        "rationale": "Contains vulnerability details that must remain private until mainnet launch."
      }
    ],
    "security_sensitive": [
      {
        "id": "CON-142",
        "title": "Validator Key Management Implementation",
        "decision": "payout-gated",
        "rationale": "Contains cryptographic key handling code that requires controlled access and payout verification before public disclosure."
      },
      {
        "id": "CON-158",
        "title": "Network Upgrade Emergency Stop Mechanism",
        "decision": "payout-gated",
        "rationale": "Critical safety mechanism that should only be accessible after mainnet stability is confirmed."
      }
    ],
    "payout_gated": [
      {
        "id": "CON-171",
        "title": "Transaction Fee Distribution Algorithm",
        "decision": "payout-gated",
        "rationale": "Economic parameter tuning that requires mainnet data before finalizing payouts."
      },
      {
        "id": "CON-183",
        "title": "Cross-Chain Bridge Integration Tests",
        "decision": "payout-gated",
        "rationale": "Requires mainnet deployment for accurate testing and payout verification."
      }
    ],
    "externally_claimable": [
      {
        "id": "CON-144",
        "title": "Documentation: Node Setup Guide for Testnet",
        "decision": "externally-claimable",
        "rationale": "Safe to open publicly as it only contains testnet instructions and does not expose mainnet secrets."
      },
      {
        "id": "CON-156",
        "title": "Performance Benchmarking Scripts",
        "decision": "externally-claimable",
        "rationale": "General-purpose benchmarking tools that do not reveal mainnet-specific configurations."
      },
      {
        "id": "CON-162",
        "title": "Community Translation of Developer Docs",
        "decision": "externally-claimable",
        "rationale": "Non-sensitive translation work that benefits from community contribution."
      },
      {
        "id": "CON-175",
        "title": "Testnet Faucet UI Improvements",
        "decision": "externally-claimable",
        "rationale": "Frontend changes for testnet tools that pose no security risk."
      },
      {
        "id": "CON-188",
        "title": "Monitoring Dashboard for Testnet Validators",
        "decision": "externally-claimable",
        "rationale": "Public monitoring tools that help community participation without exposing mainnet data."
      }
    ],
    "metadata": {
      "review_date": "2024-01-15",
      "reviewer": "Bounty Management Committee",
      "mainnet_go_live": "Q1 2024",
      "total_bounties_reviewed": 12,
      "externally_claimable_count": 5,
      "payout_gated_count": 2,
      "security_sensitive_count": 2,
      "internal_only_count": 3
    }
  },
  "payment_address": "TU8NBT5iGyMNkLwWmWmgy7tFMbKnafLHcu"
}
