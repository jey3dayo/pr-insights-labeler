import type { Violations } from '../../errors/index.js';
import { t } from '../../i18n.js';
import { hasViolations } from './violations.js';

interface ActionSection {
  emoji: string;
  titleKey: string;
  itemKeys: string[];
  bold?: boolean;
}

const ACTION_SECTIONS: ActionSection[] = [
  {
    emoji: '📦',
    titleKey: 'improvementActions.splitting.title',
    itemKeys: [
      'improvementActions.splitting.byFeature',
      'improvementActions.splitting.byFileGroups',
      'improvementActions.splitting.separateRefactoring',
    ],
    bold: true,
  },
  {
    emoji: '🔨',
    titleKey: 'improvementActions.refactoring.title',
    itemKeys: [
      'improvementActions.refactoring.splitFunctions',
      'improvementActions.refactoring.extractCommon',
      'improvementActions.refactoring.organizeByLayer',
    ],
  },
  {
    emoji: '📄',
    titleKey: 'improvementActions.generated.title',
    itemKeys: [
      'improvementActions.generated.excludeLock',
      'improvementActions.generated.manageArtifacts',
      'improvementActions.generated.separateGenerated',
    ],
  },
];

const EXCLUDE_CONFIG_EXAMPLE = [
  '```yaml',
  '- uses: jey3dayo/pr-insights-labeler@v1',
  '  with:',
  '    github_token: ${{ secrets.GITHUB_TOKEN }}',
  '    additional_exclude_patterns: |',
  '      **/*.generated.ts',
  '      **/__generated__/**',
  '      coverage/**',
  '```',
].join('\n');

function formatSection(section: ActionSection): string {
  const items = section.itemKeys
    .map(key => (section.bold ? `- **${t('summary', key)}**` : `- ${t('summary', key)}`))
    .join('\n');
  return `#### ${section.emoji} ${t('summary', section.titleKey)}\n${items}\n\n`;
}

function formatExcludeConfigSection(): string {
  let output = `#### ⚙️ ${t('summary', 'improvementActions.excludeConfig.title')}\n`;
  output += `${t('summary', 'improvementActions.excludeConfig.intro')}\n\n`;
  output += `${EXCLUDE_CONFIG_EXAMPLE}\n\n`;
  output += `${t('summary', 'improvementActions.excludeConfig.note')}\n\n`;
  return output;
}

export function formatImprovementActions(violations: Violations): string {
  if (!hasViolations(violations)) {
    return '';
  }

  const title = t('summary', 'improvementActions.title');

  let output = '<details open>\n';
  output += `<summary><strong>💡 ${title}</strong></summary>\n\n`;
  output += `${t('summary', 'improvementActions.intro')}\n\n`;
  output += ACTION_SECTIONS.map(formatSection).join('');

  if (violations.exceedsFileLines.length > 0 || violations.largeFiles.length > 0) {
    output += formatExcludeConfigSection();
  }

  output += '</details>\n\n';

  return output;
}
