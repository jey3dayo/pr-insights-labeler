export interface EnvironmentConfig {
  language: string | undefined;

  githubToken: string | undefined;
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    language: process.env['LANGUAGE'] || process.env['LANG'] || undefined,
    githubToken: process.env['GITHUB_TOKEN'] || process.env['GH_TOKEN'] || undefined,
  };
}
