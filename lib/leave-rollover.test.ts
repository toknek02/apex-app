import { describe, it, expect } from 'vitest'
import { proposeBroughtForward } from '@/lib/leave-rollover'

describe('proposeBroughtForward', () => {
  it('carries a positive remaining balance forward unchanged when there is no cap', () => {
    expect(proposeBroughtForward(7.5, null)).toBe(7.5)
  })

  it('never carries a negative amount (over-taken leave does not become a debt)', () => {
    expect(proposeBroughtForward(-3, null)).toBe(0)
  })

  it('treats an unrestricted balance (null remaining) as nothing to carry', () => {
    expect(proposeBroughtForward(null, null)).toBe(0)
  })

  it('caps the carried amount when a max carry-forward is set', () => {
    expect(proposeBroughtForward(12, 5)).toBe(5)
  })

  it('carries the full amount when it is under the cap', () => {
    expect(proposeBroughtForward(3, 5)).toBe(3)
  })

  it('floors at zero before applying the cap', () => {
    expect(proposeBroughtForward(-1, 5)).toBe(0)
  })
})
