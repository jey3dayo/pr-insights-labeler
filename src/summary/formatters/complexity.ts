import { t } from '../../i18n.js';
import type { ComplexityConfig, ComplexityMetrics } from '../../labeler-types.js';
import { formatNumber } from './common.js';
import { escapeMarkdown } from './files.js';

export interface SummaryContext {
  owner: string;
  repo: string;
  sha: string;
}

export function generateComplexitySummary(
  metrics: ComplexityMetrics,
  config: ComplexityConfig,
  context: SummaryContext,
): string {
  const { maxComplexity, avgComplexity, analyzedFiles } = metrics;
  const { thresholds } = config;
  const { owner, repo, sha } = context;

  let markdown = `## 📊 ${t('summary', 'complexity.title')}\n\n`;

  markdown += `| ${t('summary', 'complexity.metrics')} | ${t('summary', 'complexity.value')} |\n`;
  markdown += `|-----------|-----|\n`;
  markdown += `| ${t('summary', 'complexity.maxComplexity')} | ${formatNumber(maxComplexity)} |\n`;
  markdown += `| ${t('summary', 'complexity.avgComplexity')} | ${avgComplexity.toFixed(1)} |\n`;
  markdown += `| ${t('summary', 'complexity.analyzedFiles')} | ${formatNumber(analyzedFiles)} |\n\n`;

  const highComplexityFiles = metrics.files
    .filter(file => file.complexity >= thresholds.medium)
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10);

  if (highComplexityFiles.length > 0) {
    markdown += `### ${t('summary', 'complexity.highFiles')}\n\n`;
    highComplexityFiles.forEach(file => {
      const level =
        file.complexity >= thresholds.high
          ? t('summary', 'complexity.level.high')
          : t('summary', 'complexity.level.medium');
      const fileUrl = `https://github.com/${owner}/${repo}/blob/${sha}/${file.path}`;
      markdown += `- [${escapeMarkdown(file.path)}](${fileUrl}): ${file.complexity} (${level})\n`;

      if (file.functions.length > 0) {
        const topFunctions = [...file.functions].sort((a, b) => b.complexity - a.complexity).slice(0, 5);
        markdown += `  <details><summary>${t('summary', 'complexity.functionDetails')}</summary>\n\n`;
        topFunctions.forEach(fn => {
          const fnUrl = `https://github.com/${owner}/${repo}/blob/${sha}/${file.path}#L${fn.loc.start}`;
          markdown += `  - [${escapeMarkdown(fn.name)}](${fnUrl}): ${fn.complexity} (L${fn.loc.start}-${fn.loc.end})\n`;
        });
        if (file.functions.length > 5) {
          markdown += `  - *${t('summary', 'complexity.moreFunctions', { count: file.functions.length - 5 })}*\n`;
        }
        markdown += `  </details>\n`;
      }
    });

    const remaining = metrics.files.filter(file => file.complexity >= thresholds.medium).length - 10;
    if (remaining > 0) {
      markdown += `\n*${t('summary', 'complexity.moreFiles', { count: remaining })}*\n\n`;
    }
  } else {
    markdown += `✅ ${t('summary', 'complexity.allBelowThreshold', { threshold: thresholds.medium })}\n\n`;
  }

  if (metrics.skippedFiles.length > 0) {
    markdown += `### ⚠️ ${t('summary', 'complexity.skippedFiles.title')}\n\n`;
    markdown += `${t('summary', 'complexity.skippedFiles.reason')}\n\n`;
    metrics.skippedFiles.forEach(file => {
      const reasonKey = `complexity.skipReasons.${file.reason}` as const;
      const reasonText = t('summary', reasonKey);
      markdown += `- \`${file.path}\`: ${reasonText}`;
      if (file.details) {
        markdown += ` - ${escapeMarkdown(file.details)}`;
      }
      markdown += `\n`;
    });
    markdown += `\n`;
  }

  if (metrics.syntaxErrorFiles.length > 0) {
    markdown += `### ⚠️ ${t('summary', 'complexity.syntaxErrorFiles.title')}\n\n`;
    markdown += `${t('summary', 'complexity.syntaxErrorFiles.reason')}\n\n`;
    metrics.syntaxErrorFiles.forEach(filePath => {
      markdown += `- \`${escapeMarkdown(filePath)}\`\n`;
    });
    markdown += `\n> **${t('summary', 'complexity.syntaxErrorFiles.note')}**\n\n`;
  }

  if (metrics.truncated && metrics.totalPRFiles) {
    markdown += `\n### ⚠️ ${t('summary', 'complexity.prFilesLimit.title')}\n\n`;
    markdown += `${t('summary', 'complexity.prFilesLimit.reason')}\n`;
    markdown += `- ${t('summary', 'complexity.prFilesLimit.totalFiles')}: ${formatNumber(metrics.totalPRFiles)}\n`;
    markdown += `- ${t('summary', 'complexity.prFilesLimit.analyzedFiles')}: ${formatNumber(metrics.analyzedFiles)}\n`;
    markdown += `- ${t('summary', 'complexity.prFilesLimit.skippedFiles')}: ${formatNumber(metrics.totalPRFiles - metrics.analyzedFiles)}\n\n`;
    markdown += `> **${t('summary', 'complexity.prFilesLimit.note')}**\n`;
  }

  if (!metrics.hasTsconfig) {
    markdown += `\n### ⚠️ ${t('summary', 'complexity.tsconfigNotFound.title')}\n\n`;
    markdown += `${t('summary', 'complexity.tsconfigNotFound.reason')}\n`;
    markdown += `> **${t('summary', 'complexity.tsconfigNotFound.note')}**\n`;
  }

  return markdown;
}
