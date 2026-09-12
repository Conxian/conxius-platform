/**
 * MuSig2 (BIP-327) Unit Test Suite (Gap G-10)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MuSig2Engine, MuSig2Participant } from '../lib/support/musig2';

describe('MuSig2 Multi-Party Aggregation & Signing Engine (G-10)', () => {
  beforeEach(() => {
    MuSig2Engine.clearSessions();
  });

  const participant1: MuSig2Participant = {
    participantId: 'p1',
    publicKeyHex: '02d697315882a971d0e124847e3352779836934c56e29ff2e118ffb26943801f9c',
  };

  const participant2: MuSig2Participant = {
    participantId: 'p2',
    publicKeyHex: '0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  };

  const participant3: MuSig2Participant = {
    participantId: 'p3',
    publicKeyHex: '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
  };

  const messageHashHex = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  it('aggregates public keys deterministically regardless of input order', () => {
    const keysOrder1 = [participant1.publicKeyHex, participant2.publicKeyHex];
    const keysOrder2 = [participant2.publicKeyHex, participant1.publicKeyHex];

    const agg1 = MuSig2Engine.aggregatePublicKeys(keysOrder1);
    const agg2 = MuSig2Engine.aggregatePublicKeys(keysOrder2);

    expect(agg1.aggregatedPublicKeyHex).toBe(agg2.aggregatedPublicKeyHex);
    expect(agg1.aggregatedPublicKeyHex).toHaveLength(64);
  });

  it('supports taproot tweaking during key aggregation', () => {
    const tweakHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const keys = [participant1.publicKeyHex, participant2.publicKeyHex];

    const normalAgg = MuSig2Engine.aggregatePublicKeys(keys);
    const tweakedAgg = MuSig2Engine.aggregatePublicKeys(keys, tweakHex);

    expect(tweakedAgg.isTweaked).toBe(true);
    expect(tweakedAgg.aggregatedPublicKeyHex).not.toBe(normalAgg.aggregatedPublicKeyHex);
  });

  it('generates valid 64-byte secret and public nonces for participants', () => {
    const noncePair = MuSig2Engine.generateNoncePair('p1', 'a1b2c3d4e5f6');

    expect(noncePair.participantId).toBe('p1');
    expect(noncePair.pubNonceHex).toHaveLength(128); // 64 bytes hex
    expect(noncePair.secNonceHex).toHaveLength(128); // 64 bytes hex
  });

  it('orchestrates a full 2-of-2 MuSig2 signing session to completion', () => {
    const sessionId = 'session-2of2-test';
    const participants = [participant1, participant2];

    // 1. Initialize session
    const session = MuSig2Engine.createSession(sessionId, participants, messageHashHex);
    expect(session.state).toBe('nonce_exchange');

    // 2. Generate nonces
    const nonce1 = MuSig2Engine.generateNoncePair(participant1.participantId, 'secret1');
    const nonce2 = MuSig2Engine.generateNoncePair(participant2.participantId, 'secret2');

    // 3. Submit public nonces
    MuSig2Engine.submitPublicNonce(sessionId, participant1.participantId, nonce1.pubNonceHex);
    const sessionAfterNonces = MuSig2Engine.submitPublicNonce(sessionId, participant2.participantId, nonce2.pubNonceHex);

    expect(sessionAfterNonces.state).toBe('signing');
    expect(sessionAfterNonces.aggregatedNonceHex).toBeDefined();

    // 4. Compute and submit partial signatures
    const secretKey1 = '1111111111111111111111111111111111111111111111111111111111111111';
    const secretKey2 = '2222222222222222222222222222222222222222222222222222222222222222';

    const sig1 = MuSig2Engine.computePartialSignature(secretKey1, nonce1.secNonceHex!, sessionAfterNonces, participant1.participantId);
    const sig2 = MuSig2Engine.computePartialSignature(secretKey2, nonce2.secNonceHex!, sessionAfterNonces, participant2.participantId);

    MuSig2Engine.submitPartialSignature(sessionId, participant1.participantId, sig1);
    const finalSession = MuSig2Engine.submitPartialSignature(sessionId, participant2.participantId, sig2);

    expect(finalSession.state).toBe('completed');
    expect(finalSession.finalSignatureHex).toHaveLength(128);

    // 5. Verify final assembled Schnorr signature
    const isValid = MuSig2Engine.verifyFinalSignature(
      finalSession.aggregatedPublicKeyHex,
      messageHashHex,
      finalSession.finalSignatureHex!
    );
    expect(isValid).toBe(true);
  });

  it('orchestrates a 3-of-3 MuSig2 signing session', () => {
    const sessionId = 'session-3of3-test';
    const participants = [participant1, participant2, participant3];

    const session = MuSig2Engine.createSession(sessionId, participants, messageHashHex);

    const nonces = participants.map((p, idx) =>
      MuSig2Engine.generateNoncePair(p.participantId, `sec-${idx}`)
    );

    nonces.forEach(n => {
      MuSig2Engine.submitPublicNonce(sessionId, n.participantId, n.pubNonceHex);
    });

    const activeSession = MuSig2Engine.getSession(sessionId)!;
    expect(activeSession.state).toBe('signing');

    nonces.forEach((n, idx) => {
      const dummySecKey = (idx + 1).toString().padStart(64, '0');
      const sig = MuSig2Engine.computePartialSignature(dummySecKey, n.secNonceHex!, activeSession, n.participantId);
      MuSig2Engine.submitPartialSignature(sessionId, n.participantId, sig);
    });

    const completedSession = MuSig2Engine.getSession(sessionId)!;
    expect(completedSession.state).toBe('completed');
    expect(completedSession.finalSignatureHex).toBeDefined();
  });

  it('throws error when submitting invalid pubnonce or partial signature', () => {
    const sessionId = 'invalid-input-session';
    MuSig2Engine.createSession(sessionId, [participant1, participant2], messageHashHex);

    expect(() => {
      MuSig2Engine.submitPublicNonce(sessionId, participant1.participantId, 'invalid-nonce');
    }).toThrow(/Invalid public nonce length/);

    expect(() => {
      MuSig2Engine.submitPartialSignature(sessionId, participant1.participantId, 'invalid-sig');
    }).toThrow(/Session invalid-input-session is in state nonce_exchange, expected signing/);
  });
});
