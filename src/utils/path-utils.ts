export function normalizePath(path: string): string {
  let normalized = path.replace(/\\/g, '/');

  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  return normalized;
}
