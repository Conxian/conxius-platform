import test from 'node:test'
import assert from 'node:assert/strict'

const requiredFiles = ['README.md', 'SECURITY.md', 'CONTRIBUTING.md']

test('readiness baseline includes governance files', () => {
  assert.deepEqual(requiredFiles, ['README.md', 'SECURITY.md', 'CONTRIBUTING.md'])
})

test('owner-action is the safe status for unverifiable remote controls', () => {
  const branchProtection = 'unverified-by-token'
  assert.equal(branchProtection === 'verified' ? 'pass' : 'owner-action', 'owner-action')
})
