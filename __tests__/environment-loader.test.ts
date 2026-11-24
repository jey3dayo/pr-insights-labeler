import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadEnvironmentConfig } from '../src/environment-loader.js';

describe('loadEnvironmentConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load LANGUAGE environment variable', () => {
    process.env['LANGUAGE'] = 'ja';
    const config = loadEnvironmentConfig();
    expect(config.language).toBe('ja');
  });

  it('should load LANG environment variable', () => {
    delete process.env['LANGUAGE'];
    process.env['LANG'] = 'en';
    const config = loadEnvironmentConfig();
    expect(config.language).toBe('en');
  });

  it('should prioritize LANGUAGE over LANG', () => {
    process.env['LANGUAGE'] = 'ja';
    process.env['LANG'] = 'en';
    const config = loadEnvironmentConfig();
    expect(config.language).toBe('ja');
  });

  it('should return undefined if no language env vars are set', () => {
    delete process.env['LANGUAGE'];
    delete process.env['LANG'];
    const config = loadEnvironmentConfig();
    expect(config.language).toBeUndefined();
  });

  it('should load GITHUB_TOKEN environment variable', () => {
    process.env['GITHUB_TOKEN'] = 'test-token';
    const config = loadEnvironmentConfig();
    expect(config.githubToken).toBe('test-token');
  });

  it('should load GH_TOKEN environment variable', () => {
    delete process.env['GITHUB_TOKEN'];
    process.env['GH_TOKEN'] = 'test-gh-token';
    const config = loadEnvironmentConfig();
    expect(config.githubToken).toBe('test-gh-token');
  });

  it('should prioritize GITHUB_TOKEN over GH_TOKEN', () => {
    process.env['GITHUB_TOKEN'] = 'github-token';
    process.env['GH_TOKEN'] = 'gh-token';
    const config = loadEnvironmentConfig();
    expect(config.githubToken).toBe('github-token');
  });

  it('should return undefined if no token env vars are set', () => {
    delete process.env['GITHUB_TOKEN'];
    delete process.env['GH_TOKEN'];
    const config = loadEnvironmentConfig();
    expect(config.githubToken).toBeUndefined();
  });

  it('should load both language and token from environment', () => {
    process.env['LANGUAGE'] = 'ja';
    process.env['GITHUB_TOKEN'] = 'test-token';
    const config = loadEnvironmentConfig();
    expect(config.language).toBe('ja');
    expect(config.githubToken).toBe('test-token');
  });
});
