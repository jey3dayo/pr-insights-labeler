import type { Violations } from '../../errors/index.js';
import { t } from '../../i18n.js';

export interface FormatViolationsOptions {
  includeHeader?: boolean;
}

export function hasViolations(violations: Violations): boolean {
  return (
    violations.largeFiles.length > 0 ||
    violations.exceedsFileLines.length > 0 ||
    violations.exceedsAdditions ||
    violations.exceedsFileCount
  );
}

export function formatViolations(violations: Violations, options?: FormatViolationsOptions): string {
  const { includeHeader = true } = options || {};
  const hasViolationsFlag = hasViolations(violations);
  let output = '';

  if (!hasViolationsFlag) {
    output += `**${t('summary', 'violations.allWithinLimits')}** ✅\n`;
    output += '\n';
    return output;
  }

  if (includeHeader) {
    output += `### 📊 ${t('summary', 'violations.sizeSummary')}\n\n`;
  }

  if (violations.largeFiles.length > 0) {
    output += `- **${t('summary', 'violations.filesExceedSize', { count: violations.largeFiles.length })}** (\`auto/large-files\`)\n`;
  }
  if (violations.exceedsFileLines.length > 0) {
    output += `- **${t('summary', 'violations.filesExceedLines', { count: violations.exceedsFileLines.length })}** (\`auto/too-many-lines\`)\n`;
  }
  if (violations.exceedsAdditions) {
    output += `- **${t('summary', 'violations.totalAdditionsExceed')}** (\`auto/excessive-changes\`)\n`;
  }
  if (violations.exceedsFileCount) {
    output += `- **${t('summary', 'violations.fileCountExceed')}** (\`auto/too-many-files\`)\n`;
  }
  output += '\n';

  return output;
}
