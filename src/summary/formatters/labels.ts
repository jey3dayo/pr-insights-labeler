import { t } from '../../i18n.js';

export function formatAppliedLabels(labels: string[] | undefined): string {
  if (labels === undefined) {
    return '';
  }

  const header = `### 🏷️ ${t('summary', 'labels.applied')}\n\n`;

  if (labels.length === 0) {
    return `${header}${t('summary', 'labels.noLabels')}\n\n`;
  }

  let output = header;
  for (const label of labels) {
    output += `- \`${label}\`\n`;
  }
  output += '\n';

  return output;
}
