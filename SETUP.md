# 🚀 Thought Loop セットアップガイド

## 必要な環境

- Docker & Docker Compose
- OpenAI APIキー

## セットアップ手順

### 1. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成してください：

```bash
touch .env
```

`.env` ファイルに以下を追加（実際のAPIキーに置き換えてください）：

```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 2. Docker Composeで起動

```bash
docker-compose up --build
```

初回起動時はイメージのビルドに少し時間がかかります（3-5分程度）。

### 3. アクセス

起動が完了したら、以下のURLにアクセスできます：

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000

### 4. 動作確認

バックエンドAPIが正常に動作しているか確認：

```bash
curl http://localhost:8000/
```

以下のようなレスポンスが返れば正常です：

```json
{"message":"Thought Loop Backend API"}
```

### 5. 停止

停止する場合は、ターミナルで `Ctrl+C` を押すか：

```bash
docker-compose down
```

## トラブルシューティング

### ポートが使用中

ポート3000や8000が既に使用されている場合は、`docker-compose.yml` を編集して異なるポートを使用できます。

### OpenAI APIキーエラー

`.env` ファイルが正しく作成され、APIキーが正しく設定されているか確認してください。

### ビルドエラー

キャッシュをクリアして再ビルド：

```bash
docker-compose down
docker system prune -f
docker-compose up --build
```

## 開発の継続

コードを編集すると、ホットリロードで自動的に変更が反映されます（volume設定により）。

バックエンドのコードを編集した場合：
- 自動的に再読み込みされます

フロントエンドのコードを編集した場合：
- ブラウザが自動的にリロードされます

