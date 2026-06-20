/**
 * FDC3 Native Resolver Bridge
 * Standardizes mapping between Conxian CJCS and FDC3 standard contexts/intents.
 */

export interface FDC3Context {
  type: string;
  name?: string;
  id?: Record<string, string>;
}

export interface CJCSJob {
  id: string;
  type: string;
  instrument?: string;
  counterparty?: string;
}

export class FDC3Resolver {
  /**
   * Map a Conxian Job Card to an FDC3 Context.
   */
  public static mapCJCSToFDC3(job: CJCSJob): FDC3Context {
    switch (job.type) {
      case "DEX_SWAP":
      case "SBTC_WRAP":
        return {
          type: "fdc3.instrument",
          name: job.instrument || "BTC/sBTC",
          id: { ticker: job.instrument || "BTC" }
        };
      case "SETTLEMENT":
        return {
          type: "fdc3.contact",
          name: job.counterparty || "Sovereign Counterparty",
          id: { ubi: job.counterparty || "ubi:btc:default" }
        };
      default:
        return {
          type: "fdc3.context",
          name: "Conxian Generic Context"
        };
    }
  }

  /**
   * Resolve an FDC3 intent to a USI action.
   */
  public static resolveIntentToUSI(intent: string, context: FDC3Context): string {
    if (intent === "ViewInstrument" && context.type === "fdc3.instrument") {
      return "usi:monitor_liquidity";
    }
    if (intent === "Trade" && context.type === "fdc3.instrument") {
      return "usi:initiate_settlement";
    }
    return "usi:unknown_action";
  }
}
