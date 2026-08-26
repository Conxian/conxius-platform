import test from 'node:test'
import assert from 'node:assert/strict'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import schema from '../platform/neutral-m2m-intent.schema.json' with { type: 'json' }

const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validate = ajv.compile(schema)

const validIntent = {
  schemaVersion: 'm2m-intent/v1', intentId: 'intent:2026:00000001', domain: 'universal-routing',
  sourceAgent: { id: 'agent:source', keyId: 'key:source' }, destinationAgent: { id: 'agent:destination', keyId: 'key:destination' },
  asset: { namespace: 'generic', symbol: 'UNIT' }, network: { family: 'generic', networkId: 'testnet' }, amount: '1', nonce: '1',
  expiresAt: '2026-08-26T12:00:00Z', idempotencyKey: 'idempotency:2026:00000001', routeConstraints: { allowedProviders: ['provider-a'], maxAttempts: 1 }
}

test('accepts a valid neutral intent', () => assert.equal(validate(validIntent), true))
test('rejects non-positive amounts', () => assert.equal(validate({ ...validIntent, amount: '0' }), false))
test('rejects missing expiry and idempotency', () => { const { expiresAt: _expiresAt, idempotencyKey: _idempotencyKey, ...intent } = validIntent; assert.equal(validate(intent), false) })
test('rejects unknown economic fields', () => assert.equal(validate({ ...validIntent, fee: '2%' }), false))
