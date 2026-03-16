/** Convert a number to an array of bits (MSB first). Defaults to 8-bit width. */
export function numberToBits(n: number, width: number = 8): number[] {
  const bits: number[] = [];
  for (let i = width - 1; i >= 0; i--) {
    bits.push((n >> i) & 1);
  }
  return bits;
}

/** Convert an array of bits (MSB first) back to a number. */
export function bitsToNumber(bits: number[]): number {
  let n = 0;
  for (let i = 0; i < bits.length; i++) {
    n = (n << 1) | bits[i];
  }
  return n;
}
