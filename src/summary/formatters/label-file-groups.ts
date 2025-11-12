/**
 * Label-File Groups formatter for Summary output
 * Groups files by their applied labels with collapsible details
 */

import { t } from '../../i18n.js';
import type { ComplexityMetrics, LabelReasoning } from '../../labeler-types';
import type { FileMetrics } from '../../types/analysis.js';
import { escapeMarkdown } from './common.js';

/**
 * Format label-file groups for Summary output.
 * Groups files by applied labels with collapsible details.
 */
export function formatLabelFileGroups(
  reasoning: LabelReasoning[],
  fileMetrics: FileMetrics[],
  complexityMetrics?: ComplexityMetrics,
): string {
  if (reasoning.length === 0) {
    return '';
  }

  let output = `### 🏷️ ${t('summary', 'labelFileGroups.title')}\n\n`;

  // Group by category for better organization
  const categoryGroups = groupByCategory(reasoning);
  const excludedAdditions = calculateExcludedAdditions(fileMetrics);

  // Category labels
  if (categoryGroups.category.length > 0) {
    for (const item of categoryGroups.category) {
      output += formatCategoryLabel(item);
    }
  }

  // Risk labels
  if (categoryGroups.risk.length > 0) {
    for (const item of categoryGroups.risk) {
      output += formatRiskLabel(item);
    }
  }

  // Complexity labels
  if (categoryGroups.complexity.length > 0) {
    for (const item of categoryGroups.complexity) {
      output += formatComplexityLabel(item, complexityMetrics);
    }
  }

  // Size labels
  if (categoryGroups.size.length > 0) {
    for (const item of categoryGroups.size) {
      output += formatSizeLabel(item, fileMetrics, excludedAdditions);
    }
  }

  return output;
}

/**
 * Group reasoning by category
 */
function groupByCategory(reasoning: LabelReasoning[]): {
  category: LabelReasoning[];
  risk: LabelReasoning[];
  complexity: LabelReasoning[];
  size: LabelReasoning[];
} {
  const groups = {
    category: [] as LabelReasoning[],
    risk: [] as LabelReasoning[],
    complexity: [] as LabelReasoning[],
    size: [] as LabelReasoning[],
  };

  for (const item of reasoning) {
    if (item.category === 'category') {
      groups.category.push(item);
    } else if (item.category === 'risk') {
      groups.risk.push(item);
    } else if (item.category === 'complexity') {
      groups.complexity.push(item);
    } else if (item.category === 'size') {
      groups.size.push(item);
    }
  }

  return groups;
}

/**
 * Format category label with file list
 */
function formatCategoryLabel(item: LabelReasoning): string {
  const files = item.matchedFiles || [];
  if (files.length === 0) {
    return '';
  }

  let output = '<details>\n';
  output += `<summary><strong>${escapeMarkdown(item.label)}</strong> (${files.length} ${files.length === 1 ? 'file' : 'files'})</summary>\n\n`;

  for (const file of files) {
    output += `- \`${file}\`\n`;
  }

  output += '\n</details>\n\n';
  return output;
}

/**
 * Format risk label with reason and affected files
 */
function formatRiskLabel(item: LabelReasoning): string {
  const files = item.matchedFiles || [];

  let output = '<details>\n';
  output += `<summary><strong>${escapeMarkdown(item.label)}</strong></summary>\n\n`;

  output += `**${t('summary', 'labelFileGroups.reason')}:** ${escapeMarkdown(item.reason)}\n\n`;

  if (files.length > 0) {
    output += `**${t('summary', 'labelFileGroups.affectedFiles')}:**\n`;
    for (const file of files) {
      output += `- \`${file}\`\n`;
    }
  }

  output += '\n</details>\n\n';
  return output;
}

/**
 * Format complexity label with high-complexity files
 */
function formatComplexityLabel(item: LabelReasoning, complexityMetrics?: ComplexityMetrics): string {
  const files = item.matchedFiles || [];

  let output = '<details>\n';
  output += `<summary><strong>${escapeMarkdown(item.label)}</strong></summary>\n\n`;

  output += `**${t('summary', 'labelFileGroups.reason')}:** ${escapeMarkdown(item.reason)}\n\n`;

  if (files.length > 0 && complexityMetrics) {
    output += `**${t('summary', 'labelFileGroups.highComplexityFiles')}:**\n`;
    for (const file of files) {
      const fileComplexity = complexityMetrics.files.find(f => f.path === file);
      if (fileComplexity) {
        output += `- \`${file}\` (complexity: ${fileComplexity.complexity})\n`;
      } else {
        output += `- \`${file}\`\n`;
      }
    }
  }

  output += '\n</details>\n\n';
  return output;
}

/**
 * Format size label with calculation basis
 */
function formatSizeLabel(item: LabelReasoning, fileMetrics: FileMetrics[], excludedAdditions: number): string {
  const files = item.matchedFiles || [];
  const totalAdditions = fileMetrics.reduce((sum, f) => sum + f.additions, 0);

  let output = '<details>\n';
  output += `<summary><strong>${escapeMarkdown(item.label)}</strong></summary>\n\n`;

  output += `**${t('summary', 'labelFileGroups.totalAdditions')}:** ${totalAdditions} lines`;
  if (excludedAdditions > 0) {
    output += ` (excluding ${excludedAdditions} lines from excluded files)`;
  }
  output += '\n\n';

  if (files.length > 0) {
    output += `**${t('summary', 'labelFileGroups.analyzedFiles')} (${files.length}):**\n`;
    // Show top 10 files by additions
    const sortedFiles = files
      .map(path => fileMetrics.find(f => f.path === path))
      .filter((f): f is FileMetrics => f !== undefined)
      .sort((a, b) => b.additions - a.additions)
      .slice(0, 10);

    for (const file of sortedFiles) {
      output += `- \`${file.path}\` (+${file.additions}/-${file.deletions})\n`;
    }

    if (files.length > 10) {
      output += `- ...and ${files.length - 10} more files\n`;
    }
  }

  output += '\n</details>\n\n';
  return output;
}

/**
 * Calculate excluded additions from file metrics
 */
function calculateExcludedAdditions(_fileMetrics: FileMetrics[]): number {
  // This is a placeholder - actual excluded additions should be passed from the caller
  // For now, we return 0 as we don't have this information in fileMetrics
  return 0;
}
