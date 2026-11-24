import bytes from 'bytes';
import { err, ok, Result } from 'neverthrow';

import type { ParseError } from '../errors';
import { createParseError } from '../errors';

export function parseSize(input: string): Result<number, ParseError> {
  const trimmed = input.trim();

  if (!trimmed) {
    return err(createParseError(input, 'Size cannot be empty'));
  }

  if (trimmed.startsWith('-')) {
    return err(createParseError(input, 'Size cannot be negative'));
  }

  if (/\d+(\.\d+)?\s*TB/i.test(trimmed)) {
    return err(createParseError(input, `Invalid size format: ${input}. TB and larger units are not supported.`));
  }

  const unitPattern = /\d+(\.\d+)?\s*(KB|MB|GB|kB|K|M|G|B)\b/gi;
  const matches = trimmed.match(unitPattern);
  if (matches && matches.length > 1) {
    return err(createParseError(input, `Invalid size format: ${input}. Multiple values detected.`));
  }

  if (/(KB|MB|GB|kB)\s*(KB|MB|GB|B|K|M|G)/i.test(trimmed) || /[KMGB]{4,}/i.test(trimmed)) {
    return err(createParseError(input, `Invalid size format: ${input}. Multiple units detected.`));
  }

  if (/^\d+(\.\d+)?\s*K$/i.test(trimmed)) {
    const numValue = parseFloat(trimmed.replace(/K$/i, ''));
    return ok(Math.round(numValue * 1024));
  }
  if (/^\d+(\.\d+)?\s*M$/i.test(trimmed)) {
    const numValue = parseFloat(trimmed.replace(/M$/i, ''));
    return ok(Math.round(numValue * 1024 * 1024));
  }
  if (/^\d+(\.\d+)?\s*G$/i.test(trimmed)) {
    const numValue = parseFloat(trimmed.replace(/G$/i, ''));
    return ok(Math.round(numValue * 1024 * 1024 * 1024));
  }

  const parsed = bytes.parse(trimmed);

  if (parsed === null) {
    const plainNumber = Number(trimmed);
    if (Number.isFinite(plainNumber) && plainNumber >= 0) {
      return ok(Math.round(plainNumber));
    }
    return err(
      createParseError(input, `Invalid size format: ${input}. Use formats like "100KB", "1.5MB", or plain numbers.`),
    );
  }

  if (parsed < 0) {
    return err(createParseError(input, 'Size cannot be negative'));
  }

  return ok(Math.round(parsed));
}
