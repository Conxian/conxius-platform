import { describe, expect, it, vi } from "vitest";
import {
  canonicalJson,
  createPaymentObservation,
  digestCanonical,
  isCanonicalSignatureHex,
  isEncodedValueWithinLimit,
  maxEncodedLengthForBytes,
  parseBoundedJsonPayload,
  snapshotBoundedJson,
  validateVerifierRequest,
  VERIFIER_ATTESTATION_LIMITS,
  VERIFIER_RESOURCE_LIMITS,
  VERIFIER_RESOURCE_LIMITS_VERSION,
  VERIFIER_SIGNATURE_ENCODING,
  VERIFIER_SIGNATURE_ENCODING_VERSION,
} from "../lib/support/verifier-contract";
import { makeVerifierRequest } from "./fixtures/verifierFixtures";

describe("verifier contract resource limits", () => {
  it("defines canonical versioned even-byte signature encoding bounds", () => {
    expect(VERIFIER_SIGNATURE_ENCODING).toBe("hex");
    expect(VERIFIER_SIGNATURE_ENCODING_VERSION).toBe("conxian.verifier.signature.v1");
    expect(isCanonicalSignatureHex("ab".repeat(VERIFIER_RESOURCE_LIMITS.minSignatureBytes))).toBe(true);
    expect(isCanonicalSignatureHex("cd".repeat(VERIFIER_RESOURCE_LIMITS.maxSignatureBytes))).toBe(true);
    expect(isCanonicalSignatureHex(`${"ab".repeat(VERIFIER_RESOURCE_LIMITS.minSignatureBytes)}a`)).toBe(false);
    expect(isCanonicalSignatureHex("ab".repeat(VERIFIER_RESOURCE_LIMITS.minSignatureBytes - 1))).toBe(false);
    expect(isCanonicalSignatureHex("ab".repeat(VERIFIER_RESOURCE_LIMITS.maxSignatureBytes + 1))).toBe(false);
  });

  it("exposes versioned encoded-byte boundaries", () => {
    expect(VERIFIER_RESOURCE_LIMITS_VERSION).toBe("conxian.verifier.limits.v1");
    const exactProof = "ab".repeat(VERIFIER_RESOURCE_LIMITS.maxProofBytes);
    const oversizedProof = `${exactProof}00`;

    expect(maxEncodedLengthForBytes(VERIFIER_RESOURCE_LIMITS.maxProofBytes, "hex"))
      .toBe(exactProof.length);
    expect(isEncodedValueWithinLimit(exactProof, "hex", VERIFIER_RESOURCE_LIMITS.maxProofBytes)).toBe(true);
    expect(isEncodedValueWithinLimit(oversizedProof, "hex", VERIFIER_RESOURCE_LIMITS.maxProofBytes)).toBe(false);
  });

  it("rejects oversized proof and public-input construction before hashing", async () => {
    await expect(makeVerifierRequest({
      proof_bytes: "ab".repeat(VERIFIER_RESOURCE_LIMITS.maxProofBytes + 1),
    })).rejects.toThrow("proof bytes");

    await expect(makeVerifierRequest({
      public_inputs: Array.from({ length: VERIFIER_RESOURCE_LIMITS.maxPublicInputCount + 1 }, (_, index) => ({
        index,
        name: `input-${index}`,
        value: "01",
        encoding: "hex" as const,
      })),
    })).rejects.toThrow("public input count");
  });

  it("returns typed resource failures before digest work for untrusted request fields", async () => {
    const base = await makeVerifierRequest();

    const oversizedProof = await validateVerifierRequest({
      ...base,
      proof: {
        ...base.proof,
        bytes: "ab".repeat(VERIFIER_RESOURCE_LIMITS.maxProofBytes + 1),
      },
    });
    expect(oversizedProof).toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });

    const oversizedInput = await validateVerifierRequest({
      ...base,
      public_inputs: [{
        ...base.public_inputs[0],
        value: "ab".repeat(VERIFIER_RESOURCE_LIMITS.maxPublicInputBytes + 1),
      }],
    });
    expect(oversizedInput).toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });

    const oversizedIdentifier = await validateVerifierRequest({
      ...base,
      backend: {
        ...base.backend,
        id: "backend-".repeat(VERIFIER_RESOURCE_LIMITS.maxIdentifierChars),
      },
    });
    expect(oversizedIdentifier).toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });

    const totalInputBytes = await validateVerifierRequest({
      ...base,
      public_inputs: Array.from({ length: 17 }, (_, index) => ({
        index,
        name: `large-input-${index}`,
        value: "ab".repeat(8 * 1024),
        encoding: "hex" as const,
        digest: base.public_inputs[0].digest,
      })),
    });
    expect(totalInputBytes).toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });
  });

  it("bounds payment observation identifiers and confirmation counts before hashing", async () => {
    const request = {
      intent_id: "i".repeat(VERIFIER_RESOURCE_LIMITS.maxIdentifierChars + 1),
      address: "bc1qfixture",
      expected_amount: 1000,
      network: "bitcoin-regtest" as const,
    };

    await expect(createPaymentObservation({
      request,
      txid: "tx-fixture",
      amount: 1000,
      confirmations: 6,
      observer: {
        id: "explicit-test-authority",
        version: "test-authority-v1",
        artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        authority: "authoritative",
      },
      provenance: "production",
    })).rejects.toThrow("payment observation");

    await expect(createPaymentObservation({
      request: {
        ...request,
        intent_id: "bounded-intent",
      },
      txid: "tx-fixture",
      amount: 1000,
      confirmations: VERIFIER_RESOURCE_LIMITS.maxConfirmations + 1,
      observer: {
        id: "explicit-test-authority",
        version: "test-authority-v1",
        artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        authority: "authoritative",
      },
      provenance: "production",
    })).rejects.toThrow("payment observation");
  });

  it("creates a detached deeply immutable snapshot within the attestation contract", () => {
    const original: {
      nested: { value: string };
      values: [number, { enabled: boolean }];
    } = {
      nested: { value: "before" },
      values: [1, { enabled: true }],
    };

    const result = snapshotBoundedJson(original);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const snapshot = result.snapshot as {
      nested: { value: string };
      values: [number, { enabled: boolean }];
    };
    expect(snapshot).not.toBe(original);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.nested)).toBe(true);
    expect(Object.isFrozen(snapshot.values)).toBe(true);
    expect(Object.isFrozen(snapshot.values[1])).toBe(true);

    original.nested.value = "after";
    original.values[0] = 9;
    original.values[1].enabled = false;

    expect(snapshot.nested.value).toBe("before");
    expect(snapshot.values).toEqual([1, { enabled: true }]);
    expect(() => {
      snapshot.nested.value = "mutation";
    }).toThrow();
  });

  it("rejects cycles, accessors, polluted prototypes, non-finite numbers, and bounded-shape violations", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(snapshotBoundedJson(cyclic)).toMatchObject({ ok: false, failure_code: "malformed_request" });

    const accessor: Record<string, unknown> = {};
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      configurable: true,
      get: () => "secret",
    });
    expect(snapshotBoundedJson(accessor)).toMatchObject({ ok: false, failure_code: "malformed_request" });

    const customPrototype = Object.create({ polluted: true }) as Record<string, unknown>;
    customPrototype.value = "fixture";
    expect(snapshotBoundedJson(customPrototype)).toMatchObject({ ok: false, failure_code: "malformed_request" });

    expect(snapshotBoundedJson({ value: Number.NaN })).toMatchObject({ ok: false, failure_code: "malformed_request" });
    expect(snapshotBoundedJson({ value: "x".repeat(VERIFIER_ATTESTATION_LIMITS.maxStringChars + 1) }))
      .toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });

    const tooManyKeys: Record<string, unknown> = {};
    for (let index = 0; index < VERIFIER_ATTESTATION_LIMITS.maxObjectKeys + 1; index += 1) {
      tooManyKeys[`key-${index}`] = index;
    }
    expect(snapshotBoundedJson(tooManyKeys)).toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });

    const tooManyItems = Array.from({ length: VERIFIER_ATTESTATION_LIMITS.maxArrayLength + 1 }, () => "item");
    expect(snapshotBoundedJson(tooManyItems)).toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });

    let deep: Record<string, unknown> = {};
    const root = deep;
    for (let index = 0; index <= VERIFIER_ATTESTATION_LIMITS.maxDepth; index += 1) {
      const child: Record<string, unknown> = {};
      deep.child = child;
      deep = child;
    }
    expect(snapshotBoundedJson(root)).toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });
  });

  it("accepts only canonical bounded JSON strings and detaches a valid snapshot", async () => {
    const payload = '{"nested":{"enabled":true},"values":[1,null,"ok"]}';
    const parsed = parseBoundedJsonPayload(payload);

    expect(parsed).toMatchObject({ ok: true, canonical: payload });
    if (!parsed.ok) return;
    expect(parsed.snapshot).not.toBe(JSON.parse(payload));
    expect(canonicalJson(parsed.snapshot)).toBe(payload);
    expect(await digestCanonical(parsed.snapshot)).toMatch(/^sha256:[0-9a-f]{64}$/);

    expect(parseBoundedJsonPayload('{"nested":{"enabled":true}, "values":[1,null,"ok"]}'))
      .toMatchObject({ ok: false, failure_code: "malformed_request" });
    expect(parseBoundedJsonPayload('{"proof_id":"first","proof_id":"last"}'))
      .toMatchObject({ ok: false, failure_code: "malformed_request" });
    expect(parseBoundedJsonPayload('{"nested":'))
      .toMatchObject({ ok: false, failure_code: "malformed_request" });
  });

  it("rejects over-limit strings before JSON.parse and bounds parsed hostile content", () => {
    const parseSpy = vi.spyOn(JSON, "parse");
    const oversized = parseBoundedJsonPayload(
      "x".repeat(VERIFIER_ATTESTATION_LIMITS.maxTotalEncodedChars + 1),
    );
    expect(oversized).toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });
    expect(parseSpy).not.toHaveBeenCalled();
    parseSpy.mockRestore();

    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let index = 0; index <= VERIFIER_ATTESTATION_LIMITS.maxDepth; index += 1) {
      const child: Record<string, unknown> = {};
      cursor.child = child;
      cursor = child;
    }
    expect(parseBoundedJsonPayload(JSON.stringify(deep)))
      .toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });

    const largeObject: Record<string, number> = {};
    for (let index = 0; index < VERIFIER_ATTESTATION_LIMITS.maxObjectKeys + 1; index += 1) {
      largeObject[`key-${index}`] = index;
    }
    expect(parseBoundedJsonPayload(JSON.stringify(largeObject)))
      .toMatchObject({ ok: false, failure_code: "resource_limit_exceeded" });
  });

  it("rejects object and proxy payloads without enumerating adapter-owned keys", () => {
    let ownKeysCalls = 0;
    const hostile = new Proxy({}, {
      ownKeys: () => {
        ownKeysCalls += 1;
        throw new Error("ownKeys trap must not run");
      },
    });

    expect(parseBoundedJsonPayload(hostile)).toMatchObject({ ok: false, failure_code: "malformed_request" });
    expect(ownKeysCalls).toBe(0);
  });
});
