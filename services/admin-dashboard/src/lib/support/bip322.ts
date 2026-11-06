import { createLogger } from "./logger";

const logger = createLogger("BIP-322");

/**
 * BIP-322: Universal Message Signing bridge.
 *
 * This module is a *bridge*: the cryptographic verification is performed by an
 * audited implementation (the Wasm-compiled `lib-conxian-core`, or the Gateway
 * BFF). The bridge never decides a signature is valid on its own. Until a
 * verifier is injected, verification fails closed — a well-shaped address and a
 * long-enough signature are not evidence of anything.
 *
 * A prior revision returned `valid: true` for any `bc1`/`1`/`3` address and any
 * signature of at least 10 characters. That is a fail-open authorization path:
 * `verify()` gates treasury intent signing, so a fabricated "valid" result could
 * authorize value movement. It has been removed.
 */

export interface Bip322VerificationResult {
  valid: boolean;
  address: string;
  message: string;
  intent_type?: string;
  error?: string;
  /** Provenance of the decision, so callers can distinguish "verified" from "not verified". */
  provenance?: "verified" | "unavailable" | "rejected";
}

/**
 * A real BIP-322 verifier. Implementations must perform cryptographic
 * verification (BIP-322 Simple/Full) against `address` and return `false` on
 * any doubt. They must never return `true` on malformed input.
 */
export interface Bip322Verifier {
  verify(params: {
    address: string;
    message: string;
    signature: string;
  }): Promise<boolean> | boolean;
}

const ADDRESS_PATTERN = /^(bc1|tb1|bcrt1)[0-9a-z]{8,87}$|^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

export class Bip322Bridge {
  private static verifier: Bip322Verifier | null = null;

  /**
   * Injects the audited verifier (Wasm core or Gateway BFF). Production wiring
   * must call this at startup; without it, verification stays fail-closed.
   */
  static configureVerifier(verifier: Bip322Verifier | null): void {
    Bip322Bridge.verifier = verifier;
    logger.info(verifier ? "BIP-322 verifier configured" : "BIP-322 verifier cleared (fail-closed)");
  }

  /**
   * Verifies a BIP-322 signature for a USI Intent.
   *
   * Returns `valid: true` only when an injected verifier cryptographically
   * confirms the signature. Any missing verifier, malformed input, or verifier
   * error yields `valid: false` with a reason.
   */
  static async verify(
    address: string,
    message: string,
    signature: string
  ): Promise<Bip322VerificationResult> {
    logger.info(`Verifying USI Intent signature for address: ${address}`);

    if (!ADDRESS_PATTERN.test(address)) {
      return { valid: false, address, message, error: "Invalid Bitcoin address format", provenance: "rejected" };
    }

    if (!signature || signature.trim().length === 0) {
      return { valid: false, address, message, error: "Malformed signature", provenance: "rejected" };
    }

    let intent_type: string | undefined;
    try {
      const parsed = JSON.parse(message);
      intent_type = parsed.type || "generic-intent";
    } catch {
      intent_type = "plain-text";
    }

    if (!Bip322Bridge.verifier) {
      return {
        valid: false,
        address,
        message,
        intent_type,
        error: "BIP-322 verifier unavailable; verification is fail-closed",
        provenance: "unavailable",
      };
    }

    try {
      const valid = await Bip322Bridge.verifier.verify({ address, message, signature });
      return valid
        ? { valid: true, address, message, intent_type, provenance: "verified" }
        : { valid: false, address, message, intent_type, error: "Signature verification failed", provenance: "rejected" };
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.error(`BIP-322 verifier error: ${detail}`);
      return {
        valid: false,
        address,
        message,
        intent_type,
        error: "BIP-322 verifier error; verification is fail-closed",
        provenance: "unavailable",
      };
    }
  }

  /**
   * Constructs a BIP-322 'to_sign' transaction for a given message.
   * Delegated to the injected verifier when it supports construction; this
   * bridge does not fabricate a signing artifact.
   */
  static constructToSign(address: string, message: string): string {
    if (!Bip322Bridge.verifier) {
      throw new Error("BIP-322 verifier unavailable; cannot construct a to-sign transaction (fail-closed)");
    }
    const withConstruct = Bip322Bridge.verifier as Bip322Verifier & {
      constructToSign?: (address: string, message: string) => string;
    };
    if (typeof withConstruct.constructToSign !== "function") {
      throw new Error("BIP-322 verifier does not implement to-sign construction");
    }
    return withConstruct.constructToSign(address, message);
  }
}
