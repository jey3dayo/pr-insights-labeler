import { minimatch } from 'minimatch';

import { allCIPassed, anyCIFailed } from '../ci-status.js';
import { RISK_LABELS } from '../configs/label-defaults.js';
import { t } from '../i18n.js';
import type { ChangeType, PRContext } from '../types.js';
import type { RiskConfig } from '../types/config.js';

type RiskEvaluation = {
  label: string | null;
  reason: string;
};

type RiskEvaluationConfig = Pick<
  RiskConfig,
  'high_if_no_tests_for_core' | 'core_paths' | 'config_files' | 'use_ci_status'
>;

function detectChangeType(commitMessages: string[]): ChangeType {
  if (commitMessages.length === 0) {
    return 'unknown';
  }

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

function evaluateRisk(files: string[], config: RiskEvaluationConfig, prContext?: PRContext): RiskEvaluation {
  const { hasTestFiles, hasCoreChanges, hasConfigChanges } = analyzeRiskFactors(files, config);
  const useCIStatus = config.use_ci_status ?? true;

  if (useCIStatus && prContext?.ciStatus) {
    const ciStatus = prContext.ciStatus;

    if (anyCIFailed(ciStatus)) {
      return {
        label: RISK_LABELS.high,
        reason: t('labels', 'reasoning.riskCIFailed'),
      };
    }

    const changeType = prContext.commitMessages ? detectChangeType(prContext.commitMessages) : 'unknown';

    if (changeType === 'refactor' && allCIPassed(ciStatus)) {
      return {
        label: null,
        reason: t('labels', 'reasoning.riskRefactoringSafe'),
      };
    }

    if (changeType === 'feature' && !hasTestFiles && hasCoreChanges && config.high_if_no_tests_for_core) {
      return {
        label: RISK_LABELS.high,
        reason: t('labels', 'reasoning.riskFeatureNoTests'),
      };
    }
  }

  if (!hasTestFiles && hasCoreChanges && config.high_if_no_tests_for_core) {
    return {
      label: RISK_LABELS.high,
      reason: t('labels', 'reasoning.riskCoreNoTests'),
    };
  }

  if (hasConfigChanges) {
    return {
      label: RISK_LABELS.medium,
      reason: t('labels', 'reasoning.riskConfigChanged'),
    };
  }

  return {
    label: null,
    reason: '',
  };
}

export function decideRiskLabel(files: string[], config: RiskEvaluationConfig, prContext?: PRContext): string | null {
  return evaluateRisk(files, config, prContext).label;
}

export function getRiskReason(
  files: string[],
  config: RiskEvaluationConfig,
  label: string,
  prContext?: PRContext,
): string {
  const evaluation = evaluateRisk(files, config, prContext);

  if (evaluation.label === label) {
    return evaluation.reason;
  }

  return 'unknown risk condition';
}

export function getRiskAffectedFiles(
  files: string[],
  config: { core_paths: string[]; config_files: string[] },
): string[] {
  const affectedFiles: string[] = [];

  const coreFiles = files.filter(f => config.core_paths.some(pattern => minimatch(f, pattern)));
  affectedFiles.push(...coreFiles);

  const configFiles = files.filter(f => config.config_files.some(pattern => minimatch(f, pattern)));
  affectedFiles.push(...configFiles);

  return Array.from(new Set(affectedFiles));
}
