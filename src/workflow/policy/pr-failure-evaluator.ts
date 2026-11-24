import type { FailureEvaluationInput } from '../../failure-evaluator.js';
import { evaluateFailureConditions } from '../../failure-evaluator.js';

export function evaluatePRFailures(input: FailureEvaluationInput): string[] {
  return evaluateFailureConditions(input);
}

export type { FailureEvaluationInput };
