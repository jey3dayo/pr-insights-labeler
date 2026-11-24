import type { CategoryConfig } from '../types/config.js';
import type { DirectoryLabelerConfig, LabelRule } from './types.js';

export function convertCategoriesToDirectoryConfig(categories: CategoryConfig[]): DirectoryLabelerConfig {
  const rules: LabelRule[] = categories.map(category => {
    const rule: LabelRule = {
      label: category.label,
      include: [...category.patterns],
    };

    if (category.exclude && category.exclude.length > 0) {
      rule.exclude = [...category.exclude];
    }

    return rule;
  });

  return {
    version: 1,
    rules,
    useDefaultExcludes: true,
  };
}
