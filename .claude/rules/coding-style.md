---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "lib/**/*.ts"
  - "lib/**/*.tsx"
  - "scripts/**/*.ts"
  - "eslint.config.js"
  - "tsconfig*.json"
  - "knip.json"
---

# Coding Style Rules

## 目的と範囲

- TypeScript/Node/Action実装の共通スタイルと依存管理を定義し、複雑度・型安全性を維持する。

## TypeScript/構成ポリシー

- `tsconfig*.json`のstrictを前提（`noImplicitAny`, `strictNullChecks`）。例外を追加するときは理由をコメントに残す。
- any/unknownの使用は最小限にし、可能な限り`readonly`プロパティと`const`を使用する。
- Enumより文字列リテラルunionを優先。型ガードは狭い型まで絞る。
- 非同期処理は`Promise<void>`または明示的な戻り型を指定し、`await`漏れを残さない。

## Config Layerパターン（active spec）

- 設定は単一のConfig層に集約し、LabelerConfigなど重複する設定は統合する。
- 優先順位を明示（入力 > YAML設定 > デフォルト）。新規設定はここに追記してから実装する。
- Configを参照するコードは依存を一方向に保ち、循環参照を作らない。

## 複雑度とラベル連動

- ESLint complexityルールのデフォルト閾値: medium=15, high=30。これを超える場合は分割や早期returnで簡素化。
- PRのsize/complexityラベルは自動付与されるため、複雑化しそうな変更は事前に関数分割を検討する。

## ディレクトリと命名

- 構成ファイルはルートまたは`configs/`に寄せ、`*.config.{ts,js}`で命名。
- TypeScript/React: コンポーネントはPascalCase、ユーティリティはcamelCaseファイル名、テストは`*.test.ts(x)`。
- import順はESLint/prettierに従う。相対importは浅く保ち、パスエイリアスを優先。

## 依存管理

- パッケージ管理はpnpmを正とし、`pnpm-lock.yaml`を必ずコミット・同期する。
- 追加依存は不要なサブ依存を避け、代替を検討してから採用する。
