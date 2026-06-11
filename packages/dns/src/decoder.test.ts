import { describe, expect, it } from 'vitest'
import decodeDnsMessage from './decoder.js'
import {
  decoded as rootReferralExpected,
  wire as rootReferralWire,
} from './fixtures/iterative/google-com-a/01-root-referral.js'
import {
  decoded as comReferralExpected,
  wire as comReferralWire,
} from './fixtures/iterative/google-com-a/02-com-referral.js'
import {
  decoded as authoritativeExpected,
  wire as authoritativeWire,
} from './fixtures/iterative/google-com-a/03-authoritative-answer.js'
import {
  decoded as recursiveExpected,
  wire as recursiveWire,
} from './fixtures/recursive/google-com-a/01-answer.js'

describe('decodeDnsMessage', () => {
  describe('recursive/google-com-a/01-answer', () => {
    const decoded = decodeDnsMessage(recursiveWire)

    it('decodes the header', () => {
      expect(decoded.header).toStrictEqual(recursiveExpected.header)
    })

    it('decodes the questions', () => {
      expect(decoded.questions).toStrictEqual(recursiveExpected.questions)
    })

    it('decodes the answers', () => {
      expect(decoded.answers).toStrictEqual(recursiveExpected.answers)
    })

    it('decodes the full response packet', () => {
      expect(decoded).toEqual(recursiveExpected)
    })
  })

  describe('iterative/google-com-a/02-com-referral', () => {
    const decoded = decodeDnsMessage(comReferralWire)

    it('decodes the header', () => {
      expect(decoded.header).toStrictEqual(comReferralExpected.header)
    })

    it('decodes the questions', () => {
      expect(decoded.questions).toStrictEqual(comReferralExpected.questions)
    })

    it('decodes the authority records', () => {
      expect(decoded.authority).toStrictEqual(comReferralExpected.authority)
    })

    it('decodes the additional records', () => {
      expect(decoded.additional).toStrictEqual(comReferralExpected.additional)
    })

    it.skip('decodes the full response packet', () => {
      expect(decoded).toEqual(comReferralExpected)
    })
  })

  describe.skip('iterative/google-com-a/03-authoritative-answer', () => {
    const decoded = decodeDnsMessage(authoritativeWire)

    it('decodes the header', () => {
      expect(decoded.header).toStrictEqual(authoritativeExpected.header)
    })

    it('decodes the questions', () => {
      expect(decoded.questions).toStrictEqual(authoritativeExpected.questions)
    })

    it('decodes the answers', () => {
      expect(decoded.answers).toStrictEqual(authoritativeExpected.answers)
    })

    it('decodes the full response packet', () => {
      expect(decoded).toEqual(authoritativeExpected)
    })
  })
})
