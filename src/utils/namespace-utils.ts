export function extractNamespace(label: string, delimiter: string = '/'): string | null {
  const index = label.indexOf(delimiter);
  if (index === -1) {
    return null;
  }
  return label.substring(0, index);
}

export function matchesNamespacePattern(namespace: string, pattern: string): boolean {
  const normalizedPattern = pattern.endsWith('/*') ? pattern.slice(0, -2) : pattern;
  return namespace === normalizedPattern;
}
