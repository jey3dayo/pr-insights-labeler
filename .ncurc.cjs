/**
 * npm-check-updates configuration
 * Controls which packages should not be automatically updated
 */

module.exports = {
  upgrade: false,
  reject: [
    // p-limit - v3.1.0に固定（CommonJS互換性維持）
    // v4以降はESM-onlyとなり、@vercel/nccでのバンドル時にコード分割が発生
    // 単一ファイルバンドルを維持するため、v3系を使用
    'p-limit',

    // typescript - v5系に固定
    // typescript-eslint 8.x が TS 7.0 を明示的に拒否する（"does not support TS 7.0"）。
    // eslint は complexity-analyzer の実行時依存であり lint だけの問題では済まないため、
    // typescript-eslint が TS 7 に対応するまで v5 系を維持する
    'typescript',
  ],
};
