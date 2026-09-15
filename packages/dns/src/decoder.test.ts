import { describe, expect, it } from 'vitest'
import decodeDnsMessage from './decoder.js'
import {
  expected as rootReferralExpected,
  wire as rootReferralWire,
} from './fixtures/google-com-a/iterative/01-root-referral.js'
import {
  expected as comReferralExpected,
  wire as comReferralWire,
} from './fixtures/google-com-a/iterative/02-com-referral.js'
import {
  expected as authoritativeExpected,
  wire as authoritativeWire,
} from './fixtures/google-com-a/iterative/03-authoritative-answer.js'
import {
  expected as recursiveExpected,
  wire as recursiveWire,
} from './fixtures/google-com-a/recursive/01-answer.js'
import type { DnsMessageResponse } from './interfaces.js'

type Section =
  | 'header'
  | 'questions'
  | 'answers'
  | 'authority'
  | 'additional'
  | 'full'

type FixtureCase = {
  name: string
  wire: Buffer
  expected: DnsMessageResponse
  /** Sections that pass with the current decoder. */
  assert: Section[]
  /** Sections that exist on this packet but are not earned yet. Shown as skipped. */
  todo?: Section[]
}

/**
 * Work order: simple answer → AA answer → small referral → large referral.
 * Move a section from `todo` into `assert` as the decoder earns it.
 */
const cases: FixtureCase[] = [
  {
    name: 'recursive/01-answer',
    wire: recursiveWire,
    expected: recursiveExpected,
    assert: ['header', 'questions', 'answers', 'full'],
  },
  {
    name: 'iterative/03-authoritative-answer',
    wire: authoritativeWire,
    expected: authoritativeExpected,
    assert: ['header', 'questions', 'answers', 'full'],
  },
  {
    name: 'iterative/02-com-referral',
    wire: comReferralWire,
    expected: comReferralExpected,
    assert: ['header', 'questions'],
    todo: ['authority', 'additional', 'full'],
  },
  {
    name: 'iterative/01-root-referral',
    wire: rootReferralWire,
    expected: rootReferralExpected,
    assert: ['header', 'questions'],
    todo: ['authority', 'additional', 'full'],
  },
]

const sectionExpectation = (
  section: Section,
  decoded: DnsMessageResponse,
  expected: DnsMessageResponse,
) => {
  switch (section) {
    case 'header':
      expect(decoded.header).toStrictEqual(expected.header)
      break
    case 'questions':
      expect(decoded.questions).toStrictEqual(expected.questions)
      break
    case 'answers':
      expect(decoded.answers).toStrictEqual(expected.answers)
      break
    case 'authority':
      expect(decoded.authority).toStrictEqual(expected.authority)
      break
    case 'additional':
      expect(decoded.additional).toStrictEqual(expected.additional)
      break
    case 'full':
      expect(decoded).toEqual(expected)
      break
  }
}

describe('decodeDnsMessage', () => {
  for (const fixture of cases) {
    describe(fixture.name, () => {
      const decoded = decodeDnsMessage(fixture.wire)

      for (const section of fixture.assert) {
        it(`decodes ${section}`, () => {
          sectionExpectation(section, decoded, fixture.expected)
        })
      }

      for (const section of fixture.todo ?? []) {
        it.skip(`decodes ${section}`, () => {
          sectionExpectation(section, decoded, fixture.expected)
        })
      }
    })
  }
})
