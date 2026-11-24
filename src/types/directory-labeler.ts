export interface MinimatchOptions {
  dot?: boolean;
  nocase?: boolean;
  matchBase?: boolean;
}

export interface NamespacePolicy {
  exclusive: string[];
  additive: string[];
}
