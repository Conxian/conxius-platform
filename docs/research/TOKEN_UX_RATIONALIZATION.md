# Token UX Rationalization: Simplifying Sovereign Finance for the Global South

## 1. Problem Statement (CON-649)
The current Conxius platform exposes 5 distinct tokens (CXD, CXLP, CXVG, CXS, CXTR) directly to users. In the context of retail users and the Global South, this multi-token model creates significant cognitive load, confusion, and adoption friction. Users struggle to distinguish between utility, governance, staking, and treasury tokens, leading to a perceived high barrier to entry.

## 2. The Canonical Token Model (Abstractions)
To simplify the user experience while maintaining the underlying protocol complexity, we will implement a tiered abstraction model:

### Tier 1: User-Safe Abstractions (Public UI)
- **"Account Value" (Primary Metric)**: A unified USD/BTC denominated value of all held assets.
- **"Cash" (CXD)**: The primary stable/utility token for transacting.
- **"Earnings/Growth" (CXS/CXLP)**: Unified view of staking and liquidity positions.
- **"Voting Power" (CXVG)**: Abstracted representation of governance weight.

### Tier 2: Protocol Transparency (Advanced View)
- The 5-token model remains visible only in "Advanced Settings" or "Technical Audit" views.
- **CXD**: Operational utility.
- **CXLP**: Liquidity provision.
- **CXVG**: Governance weight.
- **CXS**: Staking/Insurance.
- **CXTR**: Protocol treasury.

## 3. Implementation Evidence

### UX/UI Changes
- **Unified Balance Card**: Implemented \`UnifiedBalanceCard.tsx\` to provide a simplified top-level account overview.
- **Dashboard Refactor**: Updated \`overview/page.tsx\` to prioritize the Unified Balance over raw technical metrics.
- **Token Select Rationalization**: Updated \`TokenSelect.tsx\` to include user-safe labels (e.g., "CASH", "GOVERNANCE") alongside technical symbols, and moved them under an "Advanced" category.

### Copy Updates
- Updated dashboard titles from "ARCHITECTURE" to "DASHBOARD".
- Updated system descriptions to use "Sovereign Control Plane" terminology.

## 4. Backward Compatibility
- All SIP-010 contracts remain unchanged in \`lib/contracts.ts\`.
- API endpoints in the Gateway Engine (\`lib-conxian-core\`) continue to return raw token balances for technical auditability.
- The "Rationalization" layer lives in the UI (\`conxian-ui\`).

## 5. Success Metrics
- Reduction in "What token do I use?" support tickets.
- Increased onboarding completion rate in target regions.
- Positive sentiment in user comprehension surveys.
