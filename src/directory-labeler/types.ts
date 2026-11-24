import { DEFAULT_EXCLUDES, DEFAULT_NAMESPACES, DEFAULT_OPTIONS } from '../configs/directory-labeler-defaults.js';
import type { MinimatchOptions, NamespacePolicy } from '../types/directory-labeler.js';

export { DEFAULT_EXCLUDES, DEFAULT_NAMESPACES, DEFAULT_OPTIONS };
export type { MinimatchOptions, NamespacePolicy };

export interface LabelRule {
  label: string;
  include: string[];
  exclude?: string[];
  priority?: number;
}

export interface DirectoryLabelerConfig {
  version: 1;
  options?: MinimatchOptions;
  rules: LabelRule[];
  namespaces?: NamespacePolicy;
  useDefaultExcludes?: boolean;
}
