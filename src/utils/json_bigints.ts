// Custom replacer function for JSON.stringify
export const bigIntReplacer = (_: string, value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return `${value.toString()}n`; // Serialize BigInts as strings with 'n' suffix
  }
  return value;
};

// Custom reviver function for JSON.parse
export const bigIntReviver = (_: string, value: unknown): unknown => {
  if (typeof value === 'string' && /^-?\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1)); // Parse strings with 'n' suffix as BigInts
  }
  return value;
};
