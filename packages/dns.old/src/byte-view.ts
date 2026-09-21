/**
 * Convert a byte to an 8-bit binary string.
 *
 * Example input: `192`
 * Example output: `11000000`
 *
 * @param byte - The byte to convert to binary.
 * @returns The binary string.
 */
const byteToBin = (byte: number) => byte.toString(2).padStart(8, '0')

/**
 * Space-separated lowercase hex bytes.
 *
 * Example input: `[192, 12]`
 * Example output: `c0 0c`
 *
 * @param buffer - The buffer to convert to hex.
 * @returns The hex string.
 */
export const buffToHex = (buffer: Buffer) =>
  [...buffer].map((byte) => byte.toString(16).padStart(2, '0')).join(' ')

/**
 * Space-separated decimal bytes.
 *
 * Example input: `[192, 12]`
 * Example output: `192 12`
 *
 * @param buffer - The buffer to convert to decimal.
 * @returns The decimal string.
 */
export const buffToDec = (buffer: Buffer) =>
  [...buffer].map((byte) => String(byte)).join(' ')

/**
 * Space-separated 8-bit binary chunks.
 *
 * Example input: `[192, 12]`
 * Example output: `11000000 00001100`
 *
 * @param buffer - The buffer to convert to binary.
 * @returns The binary string.
 */
export const buffToBin = (buffer: Buffer) =>
  [...buffer].map(byteToBin).join(' ')

/**
 * Uint8 as hex.
 *
 * Example input: `192`
 * Example output: `0xc0`
 *
 * @param value - The value to convert to hex.
 * @returns The hex string.
 */
export const uint8ToHex = (value: number) =>
  `0x${(value & 0xff).toString(16).padStart(2, '0')}`

/**
 * Uint8 as decimal.
 *
 * Example input: `192`
 * Example output: `192`
 *
 * @param value - The value to convert to decimal.
 * @returns The decimal string.
 */
export const uint8ToDec = (value: number) => String(value & 0xff)

/**
 * Uint8 as 8-bit binary.
 *
 * Example input: `192`
 * Example output: `11000000`
 *
 * @param value - The value to convert to binary.
 * @returns The binary string.
 */
export const uint8ToBin = (value: number) => byteToBin(value & 0xff)

/**
 * Uint16 as 4-digit hex.
 *
 * Example input: `49356`
 * Example output: `0xc00c`
 *
 * @param value - The value to convert to hex.
 * @returns The hex string.
 */
export const uint16ToHex = (value: number) =>
  `0x${(value & 0xffff).toString(16).padStart(4, '0')}`

/**
 * Uint16 as decimal.
 *
 * Example input: `49356`
 * Example output: `49356`
 *
 * @param value - The value to convert to decimal.
 * @returns The decimal string.
 */
export const uint16ToDec = (value: number) => String(value & 0xffff)

/**
 * Big-endian uint16 as space-separated 8-bit chunks.
 *
 * Example input: `49356`
 * Example output: `11000000 00001100`
 *
 * @param value - The value to convert to binary.
 * @returns The binary string.
 */
export const uint16ToBin = (value: number) => {
  const uint16Value = value & 0xffff
  return [uint16Value >> 8, uint16Value & 0xff].map(byteToBin).join(' ')
}
