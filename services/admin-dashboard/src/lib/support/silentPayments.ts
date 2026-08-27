import { createLogger } from "./logger";
import { generateId } from "./idgen";

const log = createLogger("SilentPayments");

/**
 * G-05: Silent Payments (BIP-352) Scaffolding & Bridge
 *
 * Silent Payments allow users to publish a static reusable address (sp1...)
 * without exposing transaction graph links or reusing addresses on-chain.
 */

export interface SilentPaymentAddress {
  scanPublicKey: string; // 33-byte hex or compressed public key
  spendPublicKey: string; // 33-byte hex or compressed public key
  hrp: string; // 'sp' for mainnet, 'tsp' for testnet
}

export interface SilentPaymentOutput {
  id: string;
  txid: string;
  vout: number;
  pubKey: string;
  amountSats: number;
  matchedScanKey: string;
}

export class SilentPaymentsEngine {
  private registeredScanKeys: Set<string> = new Set();
  private matchedOutputs: Map<string, SilentPaymentOutput> = new Map();

  /**
   * Encodes scan and spend public keys into a BIP-352 Silent Payment address string format.
   */
  public generateAddress(scanPubKey: string, spendPubKey: string, isTestnet: boolean = false): string {
    const hrp = isTestnet ? "tsp" : "sp";
    if (!this.isValidHexKey(scanPubKey) || !this.isValidHexKey(spendPubKey)) {
      throw new Error("Invalid public key format for Silent Payment address generation");
    }
    log.info(`Generating BIP-352 address with HRP ${hrp}`);
    return `${hrp}1q${scanPubKey.toLowerCase()}${spendPubKey.toLowerCase()}`;
  }

  /**
   * Registers a scan key for light-client or server-side output matching.
   */
  public registerScanKey(scanKeyHex: string): boolean {
    if (!this.isValidHexKey(scanKeyHex)) {
      return false;
    }
    this.registeredScanKeys.add(scanKeyHex.toLowerCase());
    log.info(`Registered scan key for output scanning: ${scanKeyHex.slice(0, 8)}...`);
    return true;
  }

  /**
   * Simulates scanning a transaction output against registered scan keys.
   */
  public scanOutput(txid: string, vout: number, outputPubKey: string, amountSats: number, candidateScanKeyHex: string): SilentPaymentOutput | null {
    const keyLower = candidateScanKeyHex.toLowerCase();
    if (!this.registeredScanKeys.has(keyLower)) {
      return null;
    }

    const id = generateId("sp-out");
    const matched: SilentPaymentOutput = {
      id,
      txid,
      vout,
      pubKey: outputPubKey,
      amountSats,
      matchedScanKey: keyLower
    };

    this.matchedOutputs.set(id, matched);
    log.info(`Matched Silent Payment output ${id} for tx ${txid}:${vout}`);
    return matched;
  }

  /**
   * Returns all matched outputs for a registered scan key.
   */
  public getMatchedOutputs(scanKeyHex: string): SilentPaymentOutput[] {
    const keyLower = scanKeyHex.toLowerCase();
    return Array.from(this.matchedOutputs.values()).filter(o => o.matchedScanKey === keyLower);
  }

  private isValidHexKey(keyHex: string): boolean {
    return typeof keyHex === "string" && (keyHex.length === 66 || keyHex.length === 64) && /^[0-9a-fA-F]+$/.test(keyHex);
  }
}

export const silentPaymentsEngine = new SilentPaymentsEngine();
