# QuackShell (DuckDB UI with Terminal)

QuackShellは、WebブラウザからDuckDBを操作するためのパワフルな統合開発環境です。SQLクエリエディタ、データビューア、ファイルエクスプローラー、そしてシステムシェルと連携したターミナルをひとつの画面に統合しています。

![QuackShell Mockup](https://via.placeholder.com/1200x600?text=QuackShell+Modern+UI+Design)

## ✨ 主な機能

- **SQLクエリエディタ**: Monaco Editorを搭載し、シンタックスハイライト、自動補完に対応。
- **データ表示**: クエリ結果をインタラクティブなテーブルで表示。クリックひとつでソート可能。
- **統合ターミナル**: xterm.jsとnode-ptyを使用し、ブラウザ上でローカルのシェル（zsh/bash等）を直接操作。
- **ファイル管理**: CSV/Parquet等へのクイックアクセス、フォルダのアップロード、macOSネイティブのフォルダ選択機能をサポート。
- **Material Design 3**: モダンで洗練されたUIデザイン。直感的なペイン分割とレスポンシブな操作感。

## 🛠 テクノロジースタック

### Frontend
- **React 19**
- **Vite**
- **Tailwind CSS v4**
- **Monaco Editor** (SQL編集)
- **Xterm.js** (ターミナル)
- **Socket.io-client** (通信)

### Backend
- **Hono** (Node.js runtime)
- **DuckDB** (インプロセスDB)
- **Node-pty** (疑似ターミナル)
- **Socket.io** (ターミナル通信)

## 🚀 セットアップ

### 前提条件
- Node.js (v18以上推奨)
- pnpm (推奨)

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd duckdb-ui-with-terminal

# 依存関係のインストール
pnpm install
```

### 起動方法

このプロジェクトは、フロントエンドとバックエンドの2つのサーバーを同時に実行する必要があります。

**1. バックエンドサーバーの起動:**
```bash
npm run server
# または
pnpm run server
```
サーバーは `http://localhost:3001` で起動します。

**2. フロントエンド（Vite）のプロキシ起動:**
```bash
npm run dev
# または
pnpm run dev
```
ブラウザで表示されるURL（通常は `http://localhost:5173`）にアクセスしてください。

## 📂 ファイル構成

- `/client`: Reactフロントエンドソースコード
- `/server`: Honoバックエンドソースコード
- `/uploads`: デフォルトの作業ディレクトリ（アップロードされたファイルが保存されます）
- `my-duckdb.db`: 永続化されたDuckDBデータベースファイル

## 💡 使い方

1. **データのインポート**: エクスプローラーのアップロード機能を使用して、CSVやParquetファイルをプロジェクトに追加できます。
2. **クエリの実行**: クエリエディタにSQLを入力し、実行します。テーブルからファイルを選択すると、自動的に最適な `SELECT` 文が生成されます。
3. **ターミナル連携**: DuckDB CLIをターミナルで起動したり、システムコマンドを直接実行したりできます。

## � 今後のロードマップ

QuackShellをさらに強力なデータツールにするため、以下の機能追加を計画しています：

- [ ] **データビジュアライゼーション**: クエリ結果を棒グラフや折れ線グラフで即座に可視化する機能。
- [ ] **エクスポート機能**: 結果セットをCSV、Excel、またはParquetとして直接ダウンロード。
- [ ] **クエリ履歴と保存**: 過去に実行したSQLを履歴から呼び出したり、お気に入りのクエリを保存したりする機能。
- [ ] **スキーマブラウザ**: テーブルのカラム名やデータ型をサイドバーにツリー形式で表示。
- [ ] **DuckDB-WASM サポート**: サーバー不要でブラウザのみで動作する「サーバーレスモード」の提供。

## �📄 ライセンス

[ISC License](LICENSE)
