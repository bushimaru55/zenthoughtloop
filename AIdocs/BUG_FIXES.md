# Bug Fixes - Thought Loop

## 記録開始: 2024-10-27

このファイルにはプロジェクトで発見・修正されたバグの記録を保持します。

### 記録形式

```markdown
## [日付] - バグタイトル

### 問題
- バグの詳細説明

### 症状
- ユーザーが経験した症状

### 原因
- バグの根本原因

### 修正内容
- 実施した修正

### 影響範囲
- 修正が影響を与えたファイル/機能

### テスト方法
- バグ修正の確認方法
```

---

## バグ履歴

### 2024-10-27 - 初期セットアップ完了

現在、バグ記録はありません。

---

## 2024-10-27 16:10 - フロントエンドNext.js起動エラー（node_modules上書き問題）

### 問題
Docker Compose起動後、フロントエンドコンテナで「next: not found」エラーが発生し、Next.jsが起動しない。

### 症状
```bash
$ docker-compose logs frontend
thoughtloop_frontend  | sh: next: not found
```

### 原因
`docker-compose.yml`で`./frontend:/app`というvolumeマウントにより、コンテナビルド時にインストールされた`node_modules`が、ローカルディレクトリ（空）で上書きされてしまい、`next`コマンドが見つからなくなった。

### 修正内容
`docker-compose.yml`のフロントエンドサービスに匿名ボリュームを追加：

```yaml
volumes:
  - ./frontend:/app
  - /app/node_modules  # 追加：node_modulesはコンテナ内のものを使用
```

これにより、`/app/node_modules`はローカルの`./frontend/node_modules`で上書きされず、コンテナビルド時にインストールされたものが使用される。

### 影響範囲
- `docker-compose.yml`
- Next.js開発サーバーの起動

### テスト方法
```bash
docker-compose down
docker-compose up -d
docker-compose logs frontend | grep "Ready"
# 出力に「Ready in XXXXms」が表示されれば正常
```

---

## 2024-10-27 16:40 - AI応答が表示後に消える問題

### 問題
AIからの応答が表示された後、すぐに消えてしまう。

### 症状
チャットでAI応答が一瞬表示されるが、すぐに消えてしまう。ユーザーメッセージは残るが、AI応答だけが消失する。

### 原因
Reactの状態更新が非同期であることを考慮していなかった。

```javascript
// 問題のコード
setLog([...log, userEntry]);  // 状態を更新

// 直後に古いlogを使っている
setLog(log.map((entry, index) =>  // ❌ logはまだ古い値のまま
  index === log.length 
    ? { user: userMessage, ai: data.reply, isLoading: false }
    : entry
));
```

`setLog([...log, userEntry])`を呼び出しても、Reactの状態更新は非同期なので、その直後の行で`log`はまだ古い配列を参照している。そのため、古い配列を更新しようとして、ユーザーメッセージを含む最新の状態が反映されない。

### 修正内容
`newLog`という一時変数を使って、最新の配列を保持するように変更：

```javascript
// 修正後
const newLog = [...log, { user: userMessage, ai: "", isLoading: true }];
setLog(newLog);

// newLogを使用して更新
setLog(newLog.map((entry, index) =>  // ✅ newLogを使用
  index === newLog.length - 1
    ? { user: userMessage, ai: data.reply, isLoading: false }
    : entry
));
```

### 影響範囲
- `frontend/pages/index.js` - `sendMessage`関数

### テスト方法
1. メッセージを送信
2. AI応答が表示されることを確認
3. 応答が消えないことを確認
4. 複数のメッセージを送信して、履歴が正しく保持されることを確認

### 記録開始

今後のバグ修正は全てここに記録してください。

