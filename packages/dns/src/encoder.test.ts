import { describe, expect, it } from 'vitest'
import encodeDnsMessage from './encoder.js'
import { query, wire as queryWire } from './fixtures/google-com-a/query.js'

describe('encodeDnsMessage', () => {
  const encoded = encodeDnsMessage(query({ rd: 1 }))
  const expectedWire = queryWire({ rd: 1 })

  it.skip('encodes the full request packet', () => {
    expect(encoded).toEqual(expectedWire)
  })

  describe('encodes the header', () => {
    it('encodes the transaction ID', () => {
      expect(encoded.subarray(0, 2)).toEqual(expectedWire.subarray(0, 2))
    })

    it('encodes the flags', () => {
      expect(encoded.subarray(2, 4)).toEqual(expectedWire.subarray(2, 4))
    })

    it('encodes the counts', () => {
      expect(encoded.subarray(4, 6)).toEqual(expectedWire.subarray(4, 6)) // qdcount
      expect(encoded.subarray(6, 8)).toEqual(expectedWire.subarray(6, 8)) // ancount
      expect(encoded.subarray(8, 10)).toEqual(expectedWire.subarray(8, 10)) // nscount
      expect(encoded.subarray(10, 12)).toEqual(expectedWire.subarray(10, 12)) // arcount
    })
  })

  describe('encodes the questions', () => {
    it('encodes the length-prefixed label', () => {
      expect(encoded.subarray(12, 24)).toEqual(expectedWire.subarray(12, 24))
    })

    it('encodes the type', () => {
      expect(encoded.subarray(24, 26)).toEqual(expectedWire.subarray(24, 26))
    })

    it('encodes the class', () => {
      expect(encoded.subarray(26, 28)).toEqual(expectedWire.subarray(26, 28))
    })
  })
})
