import { describe, expect, it } from 'vitest'
import encodeDnsMessage from './encoder.js'
import { query, queryWire } from './fixtures/recursive/google-com-a/00-query.js'

describe('encodeDnsMessage', () => {
  const encoded = encodeDnsMessage(query)

  it.skip('encodes the full request packet', () => {
    expect(encoded).toEqual(queryWire)
  })

  describe('encodes the header', () => {
    it('encodes the transaction ID', () => {
      expect(encoded.subarray(0, 2)).toEqual(queryWire.subarray(0, 2))
    })

    it('encodes the flags', () => {
      expect(encoded.subarray(2, 4)).toEqual(queryWire.subarray(2, 4))
    })

    it('encodes the counts', () => {
      expect(encoded.subarray(4, 6)).toEqual(queryWire.subarray(4, 6)) // qdcount
      expect(encoded.subarray(6, 8)).toEqual(queryWire.subarray(6, 8)) // ancount
      expect(encoded.subarray(8, 10)).toEqual(queryWire.subarray(8, 10)) // nscount
      expect(encoded.subarray(10, 12)).toEqual(queryWire.subarray(10, 12)) // arcount
    })
  })

  describe('encodes the questions', () => {
    it('encodes the length-prefixed label', () => {
      expect(encoded.subarray(12, 24)).toEqual(queryWire.subarray(12, 24))
    })

    it('encodes the type', () => {
      expect(encoded.subarray(24, 26)).toEqual(queryWire.subarray(24, 26))
    })

    it('encodes the class', () => {
      expect(encoded.subarray(26, 28)).toEqual(queryWire.subarray(26, 28))
    })
  })
})
