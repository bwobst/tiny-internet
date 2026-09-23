import { describe, expect, it } from 'vitest'
import decoder from './decoder.js'
import { expected, wire } from './fixtures/pi-world-a/01-query.js'

describe('decoder', () => {
  it('prints the message to be decoded', () => {
    const result = decoder(wire)
    expect(result).toEqual(expected)
  })
})
