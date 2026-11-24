export interface DisplayName {
  en: string;
  ja: string;
}

export interface CategoryConfig {
  label: string;
  patterns: string[];
  exclude?: string[];
  display_name?: DisplayName;
}

export interface AnalysisOptions {
  concurrency?: number;
  timeout?: number;
  fileTimeout?: number;
  maxFileSize?: number;
  extensions?: string[];
  exclude?: string[];
}

export interface CategoryLabelingConfig {
  enabled: boolean;
}

export interface SizeConfig {
  enabled: boolean;
  thresholds: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
}

export interface ComplexityConfig {
  enabled: boolean;
  metric: 'cyclomatic';
  thresholds: {
    medium: number;
    high: number;
  };
  extensions: string[];
  exclude: string[];
}

export interface RiskConfig {
  enabled: boolean;
  high_if_no_tests_for_core: boolean;
  core_paths: string[];
  coverage_threshold?: number;
  config_files: string[];
  use_ci_status?: boolean;
}

export interface ExcludeConfig {
  additional: string[];
}

export interface LabelPolicyConfig {
  create_missing: boolean;
  namespace_policies: Record<string, 'replace' | 'additive'>;
}

export interface RuntimeConfig {
  fail_on_error: boolean;
  dry_run: boolean;
}

export interface SummaryConfig {
  title?: string;
}

export interface LabelerConfig {
  language?: string;
  summary?: SummaryConfig;
  size: SizeConfig;
  complexity: ComplexityConfig;
  categoryLabeling: CategoryLabelingConfig;
  categories: CategoryConfig[];
  risk: RiskConfig;
  exclude: ExcludeConfig;
  labels: LabelPolicyConfig;
  runtime: RuntimeConfig;
}
