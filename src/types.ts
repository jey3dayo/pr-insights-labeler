export type CICheckStatus = 'passed' | 'failed' | 'pending' | 'unknown';

export interface CIStatus {
  tests: CICheckStatus;
  typeCheck: CICheckStatus;
  build: CICheckStatus;
  lint: CICheckStatus;
}

export type ChangeType = 'refactor' | 'fix' | 'feature' | 'docs' | 'test' | 'style' | 'chore' | 'unknown';

export interface PRContext {
  owner: string;
  repo: string;
  pullNumber: number;
  ciStatus?: CIStatus;
  commitMessages?: string[];
}
