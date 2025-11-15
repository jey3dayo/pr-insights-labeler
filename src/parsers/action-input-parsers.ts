/**
 * Shared parsing utilities for GitHub Action inputs
 */

import { err, ok, Result } from 'neverthrow';

import type { ConfigurationError, ParseError } from '../errors/index.js';
import { createConfigurationError, createParseError } from '../errors/index.js';
import { hasProperty, isObject } from '../utils/type-guards.js';

/**
 * Size threshold configuration (v0.x format: S/M/L with additions + files)
 */
export interface SizeThresholds {
  S: { additions: number; files: number };
  M: { additions: number; files: number };
  L: { additions: number; files: number };
  // XL is determined when L thresholds are exceeded
}

/**
 * Size threshold configuration (v2 format: small/medium/large/xlarge with additions only)
 */
export interface SizeThresholdsV2 {
  small: number;
  medium: number;
  large: number;
  xlarge: number;
}

/**
 * Parse boolean value (lenient)
 * Accepts: true, 1, yes, on (case insensitive, with spaces)
 * Unknown values default to false
 */
export function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

/**
 * Parse boolean value (strict)
 * Accepts: true, 1, yes, on, false, 0, no, off (case insensitive, with spaces)
 * Unknown values return ConfigurationError
 */
export function parseBooleanStrict(value: string): Result<boolean, ConfigurationError> {
  const normalized = value.trim().toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return ok(true);
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return ok(false);
  }

  return err(
    createConfigurationError(
      'boolean',
      value,
      `Invalid boolean value: "${value}". Allowed values: true/false/1/0/yes/no/on/off`,
    ),
  );
}

/**
 * Parse comment mode
 * Valid values: auto, always, never
 * Default: auto
 */
export function parseCommentMode(value: string): 'auto' | 'always' | 'never' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'always' || normalized === 'never') {
    return normalized;
  }
  return 'auto'; // default
}

/**
 * Parse exclude patterns
 * Splits by comma or newline, trims, filters empty values and comments
 * Also removes duplicate patterns
 */
export function parseExcludePatterns(value: string): string[] {
  const patterns = value
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('#'));

  return [...new Set(patterns)];
}

/**
 * Type guard to check if parsed value is a valid SizeThresholds
 */
function isSizeThresholds(value: unknown): value is SizeThresholds {
  if (!isObject(value)) {
    return false;
  }

  const sizes = ['S', 'M', 'L'] as const;

  for (const size of sizes) {
    if (!hasProperty(value, size)) {
      return false;
    }
    const sizeObj = value[size];
    if (!isObject(sizeObj)) {
      return false;
    }
    if (!hasProperty(sizeObj, 'additions') || !hasProperty(sizeObj, 'files')) {
      return false;
    }
    if (typeof sizeObj.additions !== 'number' || typeof sizeObj.files !== 'number') {
      return false;
    }
  }

  return true;
}

/**
 * Parse size thresholds from JSON string (v0.x format: S/M/L with additions + files)
 */
export function parseSizeThresholds(value: string): Result<SizeThresholds, ParseError> {
  try {
    const parsed = JSON.parse(value);

    // Validate required fields
    if (!parsed.S || !parsed.M || !parsed.L) {
      return err(createParseError(value, 'Missing required size thresholds (S, M, L)'));
    }

    const sizes = ['S', 'M', 'L'] as const;
    for (const size of sizes) {
      if (typeof parsed[size].additions !== 'number' || typeof parsed[size].files !== 'number') {
        return err(createParseError(value, `Invalid threshold structure for size ${size}`));
      }
      if (parsed[size].additions < 0 || parsed[size].files < 0) {
        return err(createParseError(value, `Threshold values for size ${size} must be non-negative`));
      }
    }

    if (parsed.S.additions > parsed.M.additions || parsed.M.additions > parsed.L.additions) {
      return err(createParseError(value, 'Size thresholds must be monotonic (S ≤ M ≤ L for additions)'));
    }
    if (parsed.S.files > parsed.M.files || parsed.M.files > parsed.L.files) {
      return err(createParseError(value, 'Size thresholds must be monotonic (S ≤ M ≤ L for files)'));
    }

    if (!isSizeThresholds(parsed)) {
      return err(createParseError(value, 'Invalid size thresholds structure'));
    }

    return ok(parsed);
  } catch (_error) {
    return err(createParseError(value, 'Invalid JSON for size thresholds'));
  }
}

/**
 * Parse size thresholds from JSON string (V2: small/medium/large/xlarge with additions only)
 */
export function parseSizeThresholdsV2(
  value: string,
): Result<{ small: number; medium: number; large: number; xlarge: number }, ParseError> {
  try {
    const parsed = JSON.parse(value);

    if (
      typeof parsed.small !== 'number' ||
      typeof parsed.medium !== 'number' ||
      typeof parsed.large !== 'number' ||
      typeof parsed.xlarge !== 'number'
    ) {
      return err(createParseError(value, 'Missing or invalid required size thresholds (small, medium, large, xlarge)'));
    }

    if (parsed.small < 0 || parsed.medium < 0 || parsed.large < 0 || parsed.xlarge < 0) {
      return err(createParseError(value, 'Size threshold values must be non-negative'));
    }

    if (parsed.small >= parsed.medium) {
      return err(
        createParseError(value, `size.thresholds.small (${parsed.small}) must be less than medium (${parsed.medium})`),
      );
    }
    if (parsed.medium >= parsed.large) {
      return err(
        createParseError(value, `size.thresholds.medium (${parsed.medium}) must be less than large (${parsed.large})`),
      );
    }
    if (parsed.large >= parsed.xlarge) {
      return err(
        createParseError(value, `size.thresholds.large (${parsed.large}) must be less than xlarge (${parsed.xlarge})`),
      );
    }

    return ok({ small: parsed.small, medium: parsed.medium, large: parsed.large, xlarge: parsed.xlarge });
  } catch (_error) {
    return err(createParseError(value, 'Invalid JSON for size thresholds'));
  }
}

/**
 * Parse complexity thresholds from JSON string (V2: medium/high)
 */
export function parseComplexityThresholdsV2(value: string): Result<{ medium: number; high: number }, ParseError> {
  try {
    const parsed = JSON.parse(value);

    if (typeof parsed.medium !== 'number' || typeof parsed.high !== 'number') {
      return err(createParseError(value, 'Missing or invalid required complexity thresholds (medium, high)'));
    }

    if (parsed.medium < 0 || parsed.high < 0) {
      return err(createParseError(value, 'Complexity threshold values must be non-negative'));
    }

    if (parsed.medium >= parsed.high) {
      return err(
        createParseError(
          value,
          `complexity.thresholds.medium (${parsed.medium}) must be less than high (${parsed.high})`,
        ),
      );
    }

    return ok({ medium: parsed.medium, high: parsed.high });
  } catch (_error) {
    return err(createParseError(value, 'Invalid JSON for complexity thresholds'));
  }
}
