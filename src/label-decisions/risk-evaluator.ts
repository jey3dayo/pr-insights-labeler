/**
 * Risk Evaluation Module
 * Determines risk labels based on file changes, CI status, and commit messages
 */

import { minimatch } from 'minimatch';

import { allCIPassed, anyCIFailed } from '../ci-status.js';
import { RISK_LABELS } from '../configs/label-defaults.js';
import { t } from '../i18n.js';
import type { ChangeType, PRContext } from '../types.js';
import type { RiskConfig } from '../types/config.js';

/**
 * Risk evaluation result containing both label and reason
 */
type RiskEvaluation = {
  label: string | null;
  reason: string;
};

type RiskEvaluationConfig = Pick<
  RiskConfig,
  'high_if_no_tests_for_core' | 'core_paths' | 'config_files' | 'use_ci_status'
>;

/**
 * Detect change type from commit messages
 * Checks each message prefix for conventional commits to avoid false positives
 *
 * @param commitMessages - List of commit messages (subject lines)
 * @returns Detected change type
 */
function detectChangeType(commitMessages: string[]): ChangeType {
  if (commitMessages.length === 0) {
    return 'unknown';
  }

  // Check each message prefix for conventional commits
  for (const message of commitMessages) {
    const lower = message.toLowerCase().trim();

    if (lower.startsWith('refactor:') || lower.startsWith('refactor(')) {
      return 'refactor';
    }
    if (lower.startsWith('fix:') || lower.startsWith('fix(')) {
      return 'fix';
    }
    if (lower.startsWith('feat:') || lower.startsWith('feat(')) {
      return 'feature';
    }
    if (lower.startsWith('docs:') || lower.startsWith('docs(')) {
      return 'docs';
    }
    if (lower.startsWith('test:') || lower.startsWith('test(')) {
      return 'test';
    }
    if (lower.startsWith('style:') || lower.startsWith('style(')) {
      return 'style';
    }
    if (lower.startsWith('chore:') || lower.startsWith('chore(')) {
      return 'chore';
    }
  }

  return 'unknown';
}

/**
 * Analyze risk factors from file changes
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration (core_paths and config_files)
 * @returns Risk factors analysis
 */
function analyzeRiskFactors(
  files: string[],
  config: { core_paths: string[]; config_files: string[] },
): { hasTestFiles: boolean; hasCoreChanges: boolean; hasConfigChanges: boolean } {
  return {
    hasTestFiles: files.some(
      f => f.includes('__tests__/') || f.includes('tests/') || /\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(f),
    ),
    hasCoreChanges: files.some(f => config.core_paths.some(pattern => minimatch(f, pattern))),
    hasConfigChanges: files.some(f => config.config_files.some(pattern => minimatch(f, pattern))),
  };
}

/**
 * Evaluate risk based on file changes, CI status, and commit messages
 * Combines label decision and reason generation
 *
 * Risk evaluation logic:
 * 1. CI Status-based evaluation (when available):
 *    - risk/high: CI checks failed
 *    - No label: Refactoring with all CI passed
 *    - risk/high: New feature without tests in core paths
 * 2. Fallback evaluation (no CI status):
 *    - risk/high: Core changes without test files
 *    - risk/medium: Configuration file changes (.github/workflows/**, package.json, etc.)
 *    - No label: Safe changes (docs, tests, refactoring)
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration
 * @param prContext - Optional PR context with CI status and commit messages
 * @returns Risk evaluation with label and reason
 */
function evaluateRisk(files: string[], config: RiskEvaluationConfig, prContext?: PRContext): RiskEvaluation {
  const { hasTestFiles, hasCoreChanges, hasConfigChanges } = analyzeRiskFactors(files, config);
  const useCIStatus = config.use_ci_status ?? true;

  // If CI status is available and enabled, consider it
  if (useCIStatus && prContext?.ciStatus) {
    const ciStatus = prContext.ciStatus;

    // High risk: CI checks failed
    // Any CI failure (tests, type-check, build, lint) indicates potential issues
    if (anyCIFailed(ciStatus)) {
      return {
        label: RISK_LABELS.high,
        reason: t('labels', 'reasoning.riskCIFailed'),
      };
    }

    // Detect change type from commit messages (feat:, refactor:, docs:, etc.)
    const changeType = prContext.commitMessages ? detectChangeType(prContext.commitMessages) : 'unknown';

    // Low risk: Refactoring with all CI passed
    // Safe refactoring is indicated by all CI passing + refactor: commit prefix
    if (changeType === 'refactor' && allCIPassed(ciStatus)) {
      return {
        label: null,
        reason: t('labels', 'reasoning.riskRefactoringSafe'),
      };
    }

    // High risk: Feature addition without test files + core changes
    // New features in core paths should include test files
    if (changeType === 'feature' && !hasTestFiles && hasCoreChanges && config.high_if_no_tests_for_core) {
      return {
        label: RISK_LABELS.high,
        reason: t('labels', 'reasoning.riskFeatureNoTests'),
      };
    }
  }

  // Fallback to original logic when CI status is not available or disabled
  // High risk: No tests + core changes
  if (!hasTestFiles && hasCoreChanges && config.high_if_no_tests_for_core) {
    return {
      label: RISK_LABELS.high,
      reason: t('labels', 'reasoning.riskCoreNoTests'),
    };
  }

  // Medium risk: Config file changes
  // Configuration changes are inherently risky as they affect the entire project
  // Default config_files: .github/workflows/**, package.json, tsconfig.json
  if (hasConfigChanges) {
    return {
      label: RISK_LABELS.medium,
      reason: t('labels', 'reasoning.riskConfigChanged'),
    };
  }

  // No risk label: Safe changes (documentation, tests, style, etc.)
  return {
    label: null,
    reason: '',
  };
}

/**
 * Decide risk label based on file changes, configuration, and PR context
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration
 * @param prContext - Optional PR context with CI status and commit messages
 * @returns Risk label or null
 */
export function decideRiskLabel(files: string[], config: RiskEvaluationConfig, prContext?: PRContext): string | null {
  return evaluateRisk(files, config, prContext).label;
}

/**
 * Get risk reason for label reasoning
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration
 * @param label - Risk label (for validation)
 * @param prContext - Optional PR context with CI status and commit messages
 * @returns Reason string
 */
export function getRiskReason(
  files: string[],
  config: RiskEvaluationConfig,
  label: string,
  prContext?: PRContext,
): string {
  const evaluation = evaluateRisk(files, config, prContext);

  // Validate that the provided label matches the evaluated label
  if (evaluation.label === label) {
    return evaluation.reason;
  }

  return 'unknown risk condition';
}

/**
 * Get files affected by risk factors
 *
 * @param files - List of changed file paths
 * @param config - Risk configuration (core_paths and config_files)
 * @returns List of files that contributed to risk assessment
 */
export function getRiskAffectedFiles(
  files: string[],
  config: { core_paths: string[]; config_files: string[] },
): string[] {
  const affectedFiles: string[] = [];

  // Core files
  const coreFiles = files.filter(f => config.core_paths.some(pattern => minimatch(f, pattern)));
  affectedFiles.push(...coreFiles);

  // Config files
  const configFiles = files.filter(f => config.config_files.some(pattern => minimatch(f, pattern)));
  affectedFiles.push(...configFiles);

  // Remove duplicates and return
  return Array.from(new Set(affectedFiles));
}
