# 🌀 Thought Loop – AI思考支援アプリ

AIとの対話によって「人間性・創造性・思考力を取り戻す」ためのアプリケーション。

## 🎯 概要

Thought Loopは、ユーザーの思考を深めるための質問をAIが返すことで、自己理解と創造性の向上をサポートします。

## 🧬 技術スタック

| コンポーネント | 技術 | ポート |
|----------------|------|--------|
| Frontend | Next.js (Node.js 20) | 3000 |
| Backend | FastAPI (Python 3.10) | 8000 |
| Database | SQLite | - |

## 🚀 セットアップ

### 1. 環境変数の設定

`.env`ファイルを作成し、OpenAI APIキーを設定してください：

```bash
cp .env.example .env
```

`.env`ファイルを編集して実際のAPIキーを入力：

```
OPENAI_API_KEY=sk-your-actual-api-key
```

### 2. Docker Composeで起動

```bash
docker-compose up --build
```

### 3. アクセス

- フロントエンド: [http://localhost:3000](http://localhost:3000)
- バックエンド: [http://localhost:8000](http://localhost:8000)

## 📁 プロジェクト構成

```
thought-loop/
├─ backend/
│ ├─ main.py              # FastAPIアプリケーション
│ ├─ requirements.txt     # Python依存関係
│ └─ Dockerfile           # Backendコンテナ定義
├─ frontend/
│ ├─ pages/
│ │ └─ index.js          # メインページ
│ ├─ package.json         # Node.js依存関係
│ ├─ next.config.js       # Next.js設定
│ └─ Dockerfile           # Frontendコンテナ定義
├─ docker-compose.yml     # Docker Compose設定
├─ .env.example          # 環境変数サンプル
└─ README.md              # このファイル
```

## 💡 今後の拡張予定

- 思考ツリービジュアライザー（D3.js / React-Flow）
- ノート保存機能（SQLite ORM）
- Mirror機能（過去ログ再引用）
- 感情スコアリング（OpenAI Function Calling）

## 📝 ライセンス

MIT

