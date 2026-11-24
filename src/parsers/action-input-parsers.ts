import { err, ok, Result } from 'neverthrow';

import type { ConfigurationError, ParseError } from '../errors/index.js';
import { createConfigurationError, createParseError } from '../errors/index.js';

export interface SizeThresholds {
  small: number;
  medium: number;
  large: number;
  xlarge: number;
}

export function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

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

export function parseCommentMode(value: string): 'auto' | 'always' | 'never' {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'always' || normalized === 'never') {
    return normalized;
  }
  return 'auto';
}

export function parseExcludePatterns(value: string): string[] {
  const patterns = value
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('#'));

  return [...new Set(patterns)];
}

export function parseSizeThresholds(
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
