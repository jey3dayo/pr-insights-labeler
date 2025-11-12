/**
 * Label Decision Engine for PR Insights Labeler
 * Determines which labels to apply based on PR metrics and configuration
 */

import { minimatch } from 'minimatch';
import { ok, Result } from 'neverthrow';

import { COMPLEXITY_LABELS, VIOLATION_LABELS } from './configs/label-defaults.js';
import type { Violations } from './errors/types.js';
import { t } from './i18n.js';
import { decideRiskLabel, getRiskAffectedFiles, getRiskReason } from './label-decisions/risk-evaluator.js';
import type { LabelDecisions, LabelerConfig, LabelReasoning, PRMetrics } from './labeler-types.js';
import type { PRContext } from './types.js';
import { extractNamespace, matchesNamespacePattern } from './utils/namespace-utils.js';
import { calculateSizeLabel } from './utils/size-label-utils.js';

/**
 * Decide labels based on PR metrics and configuration
 * Pure function with no side effects
 *
 * @param metrics - PR metrics (additions, files, complexity)
 * @param config - Labeler configuration
 * @param violations - Violations detected during file analysis
 * @param prContext - Optional PR context with CI status and commit messages
 * @returns LabelDecisions with labels to add/remove and reasoning
 */
export function decideLabels(
  metrics: PRMetrics,
  config: LabelerConfig,
  violations: Violations,
  prContext?: PRContext,
): Result<LabelDecisions, never> {
  const reasoning: LabelReasoning[] = [];
  const labelsToAdd: string[] = [];

  // 1. Decide size label (if enabled)
  if (config.size.enabled) {
    const sizeLabel = decideSizeLabel(metrics.totalAdditions, config.size.thresholds);
    labelsToAdd.push(sizeLabel);
    reasoning.push({
      label: sizeLabel,
      reason: t('labels', 'reasoning.size', { additions: metrics.totalAdditions, label: sizeLabel }),
      category: 'size',
      matchedFiles: metrics.files.map(f => f.path),
    });
  }

  // 2. Decide complexity label (if complexity metrics available and enabled)
  if (metrics.complexity && config.complexity.enabled) {
    const complexityLabel = decideComplexityLabel(metrics.complexity.maxComplexity, config.complexity.thresholds);
    if (complexityLabel) {
      labelsToAdd.push(complexityLabel);
      const level = complexityLabel.split('/')[1]; // "high" or "medium"
      reasoning.push({
        label: complexityLabel,
        reason: t('labels', 'reasoning.complexity', { maxComplexity: metrics.complexity.maxComplexity, level }),
        category: 'complexity',
        matchedFiles: metrics.complexity.files
          .filter(f => f.complexity >= config.complexity.thresholds.medium)
          .map(f => f.path),
      });
    }
  }

  // 3. Decide category labels (if enabled)
  if (config.categoryLabeling.enabled) {
    // カテゴリラベル判定には全ファイル（除外前）を使用
    // これにより .kiro/ などの除外ファイルもカテゴリとして認識される
    const categoryResults = decideCategoryLabelsWithFiles(metrics.allFiles, config.categories);
    labelsToAdd.push(...categoryResults.map(r => r.label));
    for (const result of categoryResults) {
      reasoning.push({
        label: result.label,
        reason: t('labels', 'reasoning.category', { label: result.label }),
        category: 'category',
        matchedFiles: result.matchedFiles,
      });
    }
  }

  // 4. Decide risk label (if enabled)
  if (config.risk.enabled) {
    const files = metrics.files.map(f => f.path);
    const riskLabel = decideRiskLabel(files, config.risk, prContext);
    if (riskLabel) {
      labelsToAdd.push(riskLabel);
      const riskFiles = getRiskAffectedFiles(files, config.risk);
      reasoning.push({
        label: riskLabel,
        reason: getRiskReason(files, config.risk, riskLabel, prContext),
        category: 'risk',
        matchedFiles: riskFiles,
      });
    }
  }

  // 5. Decide violation labels (if violations exist)
  const violationLabels = decideViolationLabels(violations);
  labelsToAdd.push(...violationLabels.labels);
  reasoning.push(...violationLabels.reasoning);

  // Determine labels to remove based on namespace policies
  const labelsToRemove = determineLabelsToRemove(labelsToAdd, config.labels.namespace_policies);

  return ok({
    labelsToAdd,
    labelsToRemove,
    reasoning,
  });
}

/**
 * Decide size label based on additions
 *
 * @param additions - Total additions in PR
 * @param thresholds - Size thresholds configuration
 * @returns Size label (size/small, size/medium, size/large, size/xlarge, or size/xxlarge)
 */
export function decideSizeLabel(
  additions: number,
  thresholds: { small: number; medium: number; large: number; xlarge: number },
): string {
  return calculateSizeLabel(additions, thresholds);
}

/**
 * Decide complexity label based on max complexity
 *
 * @param complexity - Maximum complexity in PR
 * @param thresholds - Complexity thresholds configuration
 * @returns Complexity label or null if complexity is low
 */
export function decideComplexityLabel(complexity: number, thresholds: { medium: number; high: number }): string | null {
  if (complexity >= thresholds.high) {
    return COMPLEXITY_LABELS.high;
  }
  if (complexity >= thresholds.medium) {
    return COMPLEXITY_LABELS.medium;
  }
  return null; // 低複雑度はラベルなし
}

/**
 * Decide category labels based on file patterns
 *
 * @param files - List of changed file paths
 * @param categories - Category configuration
 * @returns List of category labels
 */
export function decideCategoryLabels(
  files: string[],
  categories: Array<{ label: string; patterns: string[]; exclude?: string[] }>,
): string[] {
  const matchedLabels: string[] = [];

  for (const category of categories) {
    const hasMatch = files.some(file => {
      // パターンにマッチするかチェック
      const matchesPattern = category.patterns.some(pattern => minimatch(file, pattern));
      if (!matchesPattern) {
        return false;
      }

      // 除外パターンがある場合、除外パターンにマッチしないことを確認
      if (category.exclude) {
        const matchesExclude = category.exclude.some(pattern => minimatch(file, pattern));
        if (matchesExclude) {
          return false;
        }
      }

      return true;
    });
    if (hasMatch) {
      matchedLabels.push(category.label);
    }
  }

  return matchedLabels;
}

/**
 * Decide category labels with matched files
 *
 * @param files - List of changed file paths
 * @param categories - Category configuration
 * @returns List of category labels with matched files
 */
export function decideCategoryLabelsWithFiles(
  files: string[],
  categories: Array<{ label: string; patterns: string[]; exclude?: string[] }>,
): Array<{ label: string; matchedFiles: string[] }> {
  const results: Array<{ label: string; matchedFiles: string[] }> = [];

  for (const category of categories) {
    const matchedFiles = files.filter(file => {
      // パターンにマッチするかチェック
      const matchesPattern = category.patterns.some(pattern => minimatch(file, pattern));
      if (!matchesPattern) {
        return false;
      }

      // 除外パターンがある場合、除外パターンにマッチしないことを確認
      if (category.exclude) {
        const matchesExclude = category.exclude.some(pattern => minimatch(file, pattern));
        if (matchesExclude) {
          return false;
        }
      }

      return true;
    });
    if (matchedFiles.length > 0) {
      results.push({ label: category.label, matchedFiles });
    }
  }

  return results;
}

/**
 * Determine labels to remove based on namespace policies
 * For 'replace' policies, existing labels in that namespace should be removed
 *
 * @param labelsToAdd - Labels that will be added
 * @param policies - Namespace policies (replace/additive)
 * @returns Labels to remove
 */
function determineLabelsToRemove(labelsToAdd: string[], policies: Record<string, 'replace' | 'additive'>): string[] {
  // Extract namespaces from labels to add
  const namespacesToReplace = new Set<string>();

  for (const label of labelsToAdd) {
    const namespace = extractNamespace(label);
    if (namespace) {
      // Check if this namespace has a replace policy
      for (const [policyPattern, policy] of Object.entries(policies)) {
        if (policy === 'replace' && matchesNamespacePattern(namespace, policyPattern)) {
          namespacesToReplace.add(policyPattern);
        }
      }
    }
  }

  // Return list of namespace patterns to remove
  // The actual removal will be done by comparing with current labels in the applicator
  return Array.from(namespacesToReplace);
}

/**
 * Decide violation labels based on detected violations
 *
 * @param violations - Violations detected during file analysis
 * @returns Violation labels and reasoning
 */
export function decideViolationLabels(violations: Violations): {
  labels: string[];
  reasoning: LabelReasoning[];
} {
  const labels: string[] = [];
  const reasoning: LabelReasoning[] = [];

  // auto/large-files - Individual files too large
  if (violations.largeFiles.length > 0) {
    labels.push(VIOLATION_LABELS.largeFiles);
    reasoning.push({
      label: VIOLATION_LABELS.largeFiles,
      reason: t('labels', 'reasoning.largeFiles', { count: violations.largeFiles.length }),
      category: 'violation',
      matchedFiles: violations.largeFiles.map(v => v.file),
    });
  }

  // auto/too-many-lines - Individual files exceed line limits
  if (violations.exceedsFileLines.length > 0) {
    labels.push(VIOLATION_LABELS.tooManyLines);
    reasoning.push({
      label: VIOLATION_LABELS.tooManyLines,
      reason: t('labels', 'reasoning.tooManyLines', { count: violations.exceedsFileLines.length }),
      category: 'violation',
      matchedFiles: violations.exceedsFileLines.map(v => v.file),
    });
  }

  // auto/excessive-changes - Total additions exceed limit
  if (violations.exceedsAdditions) {
    labels.push(VIOLATION_LABELS.excessiveChanges);
    reasoning.push({
      label: VIOLATION_LABELS.excessiveChanges,
      reason: t('labels', 'reasoning.excessiveChanges'),
      category: 'violation',
      matchedFiles: [],
    });
  }

  // auto/too-many-files - Too many files changed
  if (violations.exceedsFileCount) {
    labels.push(VIOLATION_LABELS.tooManyFiles);
    reasoning.push({
      label: VIOLATION_LABELS.tooManyFiles,
      reason: t('labels', 'reasoning.tooManyFiles'),
      category: 'violation',
      matchedFiles: [],
    });
  }

  return { labels, reasoning };
}
