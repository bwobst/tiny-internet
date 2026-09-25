import { describe, expect, it } from 'vitest'
import { encodeAnswers, encodeHeader, encodeQuestions } from './encoder.js'
import { decoded, wire } from './fixtures/pi-world-a/02-aa-answer.js'

const header = wire.subarray(0, 12)
const question = wire.subarray(12, 26)
const answers = wire.subarray(26)

describe('encoder', () => {
  it('encodes the header', () => {
    expect(encodeHeader(decoded.header)).toEqual(header)
  })

  it('encodes the question', () => {
    expect(encodeQuestions(decoded.questions)).toEqual(question)
  })

  it('encodes the answers', () => {
    expect(encodeAnswers(decoded.answers)).toEqual(answers)
  })
})
