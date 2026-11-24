import { t } from '../../i18n.js';
import type { ComplexityMetrics, LabelReasoning } from '../../labeler-types';
import type { FileMetrics } from '../../types/analysis.js';
import { escapeMarkdown } from './common.js';

export function formatLabelFileGroups(
  reasoning: LabelReasoning[],
  fileMetrics: FileMetrics[],
  excludedAdditions: number,
  complexityMetrics?: ComplexityMetrics,
): string {
  if (reasoning.length === 0) {
    return '';
  }

  let output = `### 🏷️ ${t('summary', 'labelFileGroups.title')}\n\n`;

  const categoryGroups = groupByCategory(reasoning);

  if (categoryGroups.category.length > 0) {
    for (const item of categoryGroups.category) {
      output += formatCategoryLabel(item);
    }
  }

  if (categoryGroups.risk.length > 0) {
    for (const item of categoryGroups.risk) {
      output += formatRiskLabel(item);
    }
  }

  if (categoryGroups.complexity.length > 0) {
    for (const item of categoryGroups.complexity) {
      output += formatComplexityLabel(item, complexityMetrics);
    }
  }

  if (categoryGroups.size.length > 0) {
    for (const item of categoryGroups.size) {
      output += formatSizeLabel(item, fileMetrics, excludedAdditions);
    }
  }

  return output;
}

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

function formatCategoryLabel(item: LabelReasoning): string {
  const files = item.matchedFiles || [];
  if (files.length === 0) {
    return '';
  }

  let output = openDetails(
    `<strong>${escapeMarkdown(item.label)}</strong> (${files.length} ${files.length === 1 ? 'file' : 'files'})`,
  );

  for (const file of files) {
    output += `- \`${file}\`\n`;
  }

  output += closeDetails();
  return output;
}

function formatRiskLabel(item: LabelReasoning): string {
  const files = item.matchedFiles || [];

  return formatReasonSection(item, files, (list: string[]) => {
    if (list.length === 0) {
      return '';
    }

    let body = `**${t('summary', 'labelFileGroups.affectedFiles')}:**\n`;
    for (const file of list) {
      body += `- \`${file}\`\n`;
    }
    return body;
  });
}

function formatComplexityLabel(item: LabelReasoning, complexityMetrics?: ComplexityMetrics): string {
  const files = item.matchedFiles || [];

  return formatReasonSection(item, files, (list: string[]) => {
    if (list.length === 0 || !complexityMetrics) {
      return '';
    }

    let body = `**${t('summary', 'labelFileGroups.highComplexityFiles')}:**\n`;
    for (const file of list) {
      const fileComplexity = complexityMetrics.files.find(f => f.path === file);
      if (fileComplexity) {
        body += `- \`${file}\` (complexity: ${fileComplexity.complexity})\n`;
      } else {
        body += `- \`${file}\`\n`;
      }
    }
    return body;
  });
}

function formatSizeLabel(item: LabelReasoning, fileMetrics: FileMetrics[], excludedAdditions: number): string {
  const files = item.matchedFiles || [];
  const totalAdditions = fileMetrics.reduce((sum, f) => sum + f.additions, 0);

  let output = openDetails(`<strong>${escapeMarkdown(item.label)}</strong>`);

  output += `**${t('summary', 'labelFileGroups.totalAdditions')}:** ${totalAdditions} lines`;
  if (excludedAdditions > 0) {
    output += ` (excluding ${excludedAdditions} lines from excluded files)`;
  }
  output += '\n\n';

  if (files.length > 0) {
    output += `**${t('summary', 'labelFileGroups.analyzedFiles')} (${files.length}):**\n`;
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

  output += closeDetails();
  return output;
}

function openDetails(summary: string): string {
  return `<details>\n<summary>${summary}</summary>\n\n`;
}

function closeDetails(): string {
  return '\n</details>\n\n';
}

function formatReasonSection(item: LabelReasoning, files: string[], renderFiles: (files: string[]) => string): string {
  let output = openDetails(`<strong>${escapeMarkdown(item.label)}</strong>`);

  output += `**${t('summary', 'labelFileGroups.reason')}:** ${escapeMarkdown(item.reason)}\n\n`;
  output += renderFiles(files);
  output += closeDetails();

  return output;
}
