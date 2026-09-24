import { describe, expect, it } from 'vitest'
import { decodeHeader, decodeQuestions } from './decoder.js'
import { decoded, wire } from './fixtures/pi-world-a/01-query.js'

const header = wire.subarray(0, 12)
const question = wire.subarray(12)

describe('decoder', () => {
  it('decodes the header', () => {
    expect(decodeHeader(header)).toEqual(decoded.header)
  })

  it('decodes the question', () => {
    expect(decodeQuestions(question)).toEqual(decoded.questions)
  })
})
