# Customer Request Intake and Routing Workflow (CON-1261)

## 1. Objective
Establish a formal, repeatable workflow for capturing and routing customer requests (pilots, partners, clients) into Linear to ensure product development is driven by external demand.

## 2. Definitions
- **Customer Request**: An explicit ask for functionality, support, or integration from an external party (e.g., "We need an RSK adapter for our treasury").
- **External Signal**: A high-activation event from the usage-validation layer (CON-1263).

## 3. Intake Channels
- **Direct Inquiry**: Email, LinkedIn, or Pilot calls.
- **Support Tickets**: Technical issues that imply a feature gap.
- **Sales Discovery**: Identified needs during commercial discussions.
- **Automated Telemetry**: High-score activation signals from the BFF.

## 4. Routing Logic (Linear)
1. **Capture**: All requests are created as a **Customer Need** in Linear.
2. **Triaging**: The 'Repo Hardening & Customer Validation' project lead reviews requests weekly.
3. **Linking**:
   - If the request matches an existing issue/project, link the `Customer Need` to that entity.
   - If the request is new but strategically aligned, create a new **Issue** in the relevant project and link it.
   - If the request is a priority outlier, move it to the **ExCo HQ Implementation** project for executive review.

## 5. Required Fields
- **Customer**: Organization name or ID.
- **Priority**: Important (1) or Standard (0).
- **Body**: Detailed description of the need and business impact.
- **Source**: Pilot call, Telemetry, etc.

## 6. Review Cadence
- **Weekly Demand Review (CON-1262)**: Comparing top-requested work against the current roadmap.

---
*Authorized by Conxian Labs Operations • June 2026*
