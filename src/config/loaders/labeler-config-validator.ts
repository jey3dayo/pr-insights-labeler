import { ResultAsync } from 'neverthrow';

import { type ConfigurationError } from '../../errors/index.js';
import type { LabelerConfig } from '../../labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from '../../labeler-types.js';
import { validateConfigWithTransformerAsync } from '../../utils/config-validation-utils.js';
import { parseLabelerConfig } from '../transformers/labeler-config-transformer.js';

export function validateLabelerConfig(config: unknown): ResultAsync<LabelerConfig, ConfigurationError> {
  return validateConfigWithTransformerAsync(config, parseLabelerConfig).map(normalizedConfig =>
    mergeWithDefaults(normalizedConfig),
  );
}

function mergeSizeThresholds(userConfig: Partial<LabelerConfig>): LabelerConfig['size']['thresholds'] {
  const user = userConfig.size?.thresholds;
  const defaults = DEFAULT_LABELER_CONFIG.size.thresholds;
  return {
    small: user?.small ?? defaults.small,
    medium: user?.medium ?? defaults.medium,
    large: user?.large ?? defaults.large,
    xlarge: user?.xlarge ?? defaults.xlarge,
  };
}

function mergeSizeConfig(userConfig: Partial<LabelerConfig>): LabelerConfig['size'] {
  return {
    enabled: userConfig.size?.enabled ?? DEFAULT_LABELER_CONFIG.size.enabled,
    thresholds: mergeSizeThresholds(userConfig),
  };
}

function mergeComplexityConfig(userConfig: Partial<LabelerConfig>): LabelerConfig['complexity'] {
  const user = userConfig.complexity;
  const defaults = DEFAULT_LABELER_CONFIG.complexity;
  return {
    enabled: user?.enabled ?? defaults.enabled,
    metric: user?.metric ?? defaults.metric,
    thresholds: {
      medium: user?.thresholds?.medium ?? defaults.thresholds.medium,
      high: user?.thresholds?.high ?? defaults.thresholds.high,
    },
    extensions: user?.extensions ?? defaults.extensions,
    exclude: user?.exclude ?? defaults.exclude,
  };
}

function mergeRiskConfig(userConfig: Partial<LabelerConfig>): LabelerConfig['risk'] {
  const user = userConfig.risk;
  const defaults = DEFAULT_LABELER_CONFIG.risk;
  return {
    enabled: user?.enabled ?? defaults.enabled,
    high_if_no_tests_for_core: user?.high_if_no_tests_for_core ?? defaults.high_if_no_tests_for_core,
    core_paths: user?.core_paths ?? defaults.core_paths,
    ...(user?.coverage_threshold !== undefined && { coverage_threshold: user.coverage_threshold }),
    config_files: user?.config_files ?? defaults.config_files,
    ...(user?.use_ci_status !== undefined && { use_ci_status: user.use_ci_status }),
  };
}

export function mergeWithDefaults(userConfig: Partial<LabelerConfig>): LabelerConfig {
  return {
    ...(userConfig.language !== undefined && { language: userConfig.language }),
    ...(userConfig.summary?.title ? { summary: { title: userConfig.summary.title } } : {}),
    size: mergeSizeConfig(userConfig),
    complexity: mergeComplexityConfig(userConfig),
    categoryLabeling: {
      enabled: userConfig.categoryLabeling?.enabled ?? DEFAULT_LABELER_CONFIG.categoryLabeling.enabled,
    },
    categories: userConfig.categories ?? DEFAULT_LABELER_CONFIG.categories,
    risk: mergeRiskConfig(userConfig),
    exclude: {
      additional: userConfig.exclude?.additional ?? DEFAULT_LABELER_CONFIG.exclude.additional,
    },
    labels: {
      create_missing: userConfig.labels?.create_missing ?? DEFAULT_LABELER_CONFIG.labels.create_missing,
      namespace_policies: userConfig.labels?.namespace_policies ?? DEFAULT_LABELER_CONFIG.labels.namespace_policies,
    },
    runtime: {
      fail_on_error: userConfig.runtime?.fail_on_error ?? DEFAULT_LABELER_CONFIG.runtime.fail_on_error,
      dry_run: userConfig.runtime?.dry_run ?? DEFAULT_LABELER_CONFIG.runtime.dry_run,
    },
  };
}
