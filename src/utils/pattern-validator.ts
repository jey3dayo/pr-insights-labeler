import { err, ok, type Result } from 'neverthrow';

export interface PatternValidationError {
  pattern: string;
  reason: string;
  details?: string;
}

export function validateMinimatchPattern(pattern: string): Result<string, PatternValidationError> {
  if (pattern.trim().length === 0) {
    return err({
      pattern,
      reason: 'Empty pattern',
      details: 'Pattern cannot be empty or whitespace-only',
    });
  }

  const openBraces = (pattern.match(/\{/g) || []).length;
  const closeBraces = (pattern.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    return err({
      pattern,
      reason: 'Unbalanced braces',
      details: `Found ${openBraces} opening brace(s) and ${closeBraces} closing brace(s)`,
    });
  }

  const openBrackets = (pattern.match(/\[/g) || []).length;
  const closeBrackets = (pattern.match(/\]/g) || []).length;

  if (openBrackets !== closeBrackets) {
    return err({
      pattern,
      reason: 'Unbalanced brackets',
      details: `Found ${openBrackets} opening bracket(s) and ${closeBrackets} closing bracket(s)`,
    });
  }

  const invalidEscapeMatch = pattern.match(/\\[^*?[\]{}!()@+\\/-]/);
  if (invalidEscapeMatch) {
    return err({
      pattern,
      reason: 'Invalid escape sequence',
      details: `Found invalid escape sequence: ${invalidEscapeMatch[0]}`,
    });
  }

  if (pattern.includes('{}')) {
    return err({
      pattern,
      reason: 'Empty brace expansion',
      details: 'Brace expansion cannot be empty: {}',
    });
  }

  if (pattern.includes('[]')) {
    return err({
      pattern,
      reason: 'Empty character class',
      details: 'Character class cannot be empty: []',
    });
  }

  if (/^[}\]]/.test(pattern)) {
    return err({
      pattern,
      reason: 'Invalid pattern start',
      details: 'Pattern cannot start with } or ] without proper context',
    });
  }

  if (/\{\{|\}\}/.test(pattern)) {
    return err({
      pattern,
      reason: 'Nested braces detected',
      details: 'Nested brace expansion may cause unexpected behavior',
    });
  }

  return ok(pattern);
}

export function validateMinimatchPatterns(patterns: string[]): Result<string[], PatternValidationError> {
  const validated: string[] = [];

  for (const pattern of patterns) {
    const result = validateMinimatchPattern(pattern);
    if (result.isErr()) {
      return err(result.error);
    }
    validated.push(result.value);
  }

  return ok(validated);
}

export function isValidMinimatchPattern(pattern: string): boolean {
  return validateMinimatchPattern(pattern).isOk();
}
