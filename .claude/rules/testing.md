---
paths:
  - "__tests__/**"
  - "tests/**/*.test.ts"
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "lib/**/*.test.ts"
  - "lib/**/*.test.tsx"
  - "vitest.config.*"
  - "tsconfig.test.json"
---

# Testing Rules

## 目的と範囲

- 単体/統合テストの追加・実行ポリシーを定め、PR品質とCI安定性を担保する。

## 実行必須

- ローカル/CIともに `pnpm lint && pnpm type-check && pnpm test && pnpm build` を基本ラインとする。スキップする場合は理由をPRに明記。
- PRでsrcへ機能追加・変更がある場合は対応するテストを追加・更新する。

## テスト実装ルール

- テスト名は挙動を明確に記述し、1テスト1期待値を基本にする。
- 共有fixtureは`__tests__/fixtures`等へ集約し、テスト間の副作用を避ける。
- 重要経路（ラベリングロジック、閾値判定、i18n出力、ディレクトリラベラー）は回帰テストを優先的に追加する。

## CI考慮

- `pull_request_target`利用時もテストはPRコードをcheckoutして実行する。権限設定を確認すること。
- フレークの疑いがある場合は原因をissue/PRに記録し、リトライよりも根治を優先する。
