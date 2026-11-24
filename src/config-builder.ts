import { logDebug } from './actions-io.js';
import type { EnvironmentConfig } from './environment-loader.js';
import { normalizeLanguageCode } from './i18n.js';
import type { Config } from './input-mapper.js';
import type { ParsedInputs } from './input-parser.js';
import type { LabelerConfig } from './labeler-types.js';
import type { LanguageCode } from './types/i18n.js';

export interface CompleteConfig extends Omit<Config, 'language'> {
  language: LanguageCode;
}

type ConfigSource = 'action-input' | 'labeler-config' | 'environment' | 'default';

interface LanguageResolution {
  value: LanguageCode;
  source: ConfigSource;
}

export function buildCompleteConfig(
  parsedInputs: ParsedInputs,
  labelerConfig: LabelerConfig,
  envConfig: EnvironmentConfig,
): CompleteConfig {
  const language = resolveLanguage(parsedInputs.language, labelerConfig.language, envConfig.language);

  logDebug('[Config Builder] Configuration sources:');
  logDebug(`  - Action input language: ${parsedInputs.language ?? 'undefined'}`);
  logDebug(`  - Labeler config language: ${labelerConfig.language ?? 'undefined'}`);
  logDebug(`  - Environment language: ${envConfig.language ?? 'undefined'}`);
  logDebug(`  - Resolved language: ${language.value} (source: ${language.source})`);

  const config: CompleteConfig = {
    language: language.value,

    githubToken: parsedInputs.githubToken,
    fileSizeLimit: parsedInputs.fileSizeLimit,
    fileSizeLimitEnabled: parsedInputs.fileSizeLimitEnabled,
    fileLinesLimit: parsedInputs.fileLinesLimit,
    fileLinesLimitEnabled: parsedInputs.fileLinesLimitEnabled,
    prAdditionsLimitEnabled: parsedInputs.prAdditionsLimitEnabled,
    prFilesLimitEnabled: parsedInputs.prFilesLimitEnabled,
    prAdditionsLimit: parsedInputs.prAdditionsLimit,
    prFilesLimit: parsedInputs.prFilesLimit,
    sizeEnabled: parsedInputs.sizeEnabled,
    sizeThresholds: parsedInputs.sizeThresholds,
    complexityEnabled: parsedInputs.complexityEnabled,
    complexityThresholdsV2: parsedInputs.complexityThresholdsV2,
    categoryEnabled: parsedInputs.categoryEnabled,
    riskEnabled: parsedInputs.riskEnabled,
    largeFilesLabel: parsedInputs.largeFilesLabel,
    tooManyFilesLabel: parsedInputs.tooManyFilesLabel,
    tooManyLinesLabel: parsedInputs.tooManyLinesLabel,
    excessiveChangesLabel: parsedInputs.excessiveChangesLabel,
    skipDraftPr: parsedInputs.skipDraftPr,
    commentOnPr: parsedInputs.commentOnPr,
    failOnLargeFiles: parsedInputs.failOnLargeFiles,
    failOnTooManyFiles: parsedInputs.failOnTooManyFiles,
    failOnPrSize: parsedInputs.failOnPrSize,
    enableSummary: parsedInputs.enableSummary,
    additionalExcludePatterns: parsedInputs.additionalExcludePatterns,
    enableDirectoryLabeling: parsedInputs.enableDirectoryLabeling,
    directoryLabelerConfigPath: parsedInputs.directoryLabelerConfigPath,
    maxLabels: parsedInputs.maxLabels,
    useDefaultExcludes: parsedInputs.useDefaultExcludes,
  };

  return config;
}

function resolveLanguage(
  actionInput: string | undefined,
  configFile: string | undefined,
  env: string | undefined,
): LanguageResolution {
  if (actionInput !== undefined) {
    return {
      value: normalizeLanguageCode(actionInput),
      source: 'action-input',
    };
  }

  if (configFile !== undefined) {
    return {
      value: normalizeLanguageCode(configFile),
      source: 'labeler-config',
    };
  }

  if (env !== undefined) {
    return {
      value: normalizeLanguageCode(env),
      source: 'environment',
    };
  }

  return {
    value: 'en',
    source: 'default',
  };
}
