# 🌀 Thought Loop – Docker開発環境構築指示書（for Cursor）

## 🎯 目的  
AIとの対話によって「人間性・創造性・思考力を取り戻す」アプリ  
**Thought Loop** のmvpを **Docker Compose** 上で開発・実行できるようにする。

---

## 🧬 開発環境構成

| コンポーネント | 技術 | ポート | 役割 |
|----------------|------|--------|------|
| Frontend | Next.js (Node.js 20) | 3000 | チャットUI・思考マップ |
| Backend | FastAPI (Python 3.10) | 8000 | GPT制御・DB連携 |
| Database | SQLite（ローカルボリューム） | - | 思考ログ保存 |
| Reverse Proxy (任意) | Nginx | 80 / 443 | 本番用構成でSSL対応予定 |

---

## 🗁 ディレクトリ構成

```
thought-loop/
├─ backend/
│ ├─ main.py
│ ├─ requirements.txt
│ └─ Dockerfile
├─ frontend/
│ ├─ package.json
│ ├─ next.config.js
│ └─ Dockerfile
├─ docker-compose.yml
└─ README_ThoughtLoop_MVP_Docker.md
```

---

## ⚙️ backend/Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt /app
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 📦 backend/requirements.txt

```
fastapi
uvicorn
openai
python-dotenv
sqlite-utils
```

---

## ⚙️ frontend/Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

---

## ⚙️ docker-compose.yml

```yaml
version: "3.9"
services:
  backend:
    build: ./backend
    container_name: thoughtloop_backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    env_file:
      - .env
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  frontend:
    build: ./frontend
    container_name: thoughtloop_frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## ⚙️ backend/main.py（MVPサンプル）

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# OpenAIクライアントを初期化
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.get("/")
async def root():
    return {"message": "Thought Loop Backend API"}

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("message", "")
    prompt = f"あなたは人間性と創造性を取り戻すためのAIコーチです。答えを出さずに、思考を深める質問を返してください。\nユーザー: {user_message}\nAI:"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150
        )
        ai_reply = response.choices[0].message.content
        return {"reply": ai_reply}
    except Exception as e:
        return {"reply": f"エラーが発生しました: {str(e)}"}
```

---

## ⚙️ frontend/pages/index.js（簡易UI）

```javascript
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [log, setLog] = useState([]);

  async function sendMessage() {
    if (!πος.trim()) return;
    
    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();
    setLog([...log, { user: input, ai: data.reply }]);
    setInput("");
  }
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🌀 Thought Loop</h1>
      <div className="space-y-4">
        {log.map((m, i) => (
          <div key={i} className="p-2 border-b">
            <p><strong>あなた：</strong> {m.user}</p>
            <p className="text-blue-700"><strong>AI：</strong> {m.ai}</p>
          </div>
        ))}
      </div>
      <div className="flex mt-4">
        <input
          className="flex-1 border p-2 rounded-l"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="AIに考えを話してみよう..."
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 rounded-r">
          送信
        </button>
      </div>
    </main>
  );
}
```

---

## 🚀 起動コマンド

```bash
docker-compose up --build
```

* フロントエンド: [http://localhost:3000](http://localhost:3000)
* バックエンド: [http://localhost:8000](http://localhost:8000)

---

## 🔐 .env（ルートディレクトリ）

```
OPENAI_API_KEY=sk-xxxxxx
```

---

## ✅ 開発の流れ（Cursor内での指示）

1. `AIdocs/README_ThoughtLoop_MVP_Docker.md` を開き、「Setup from AIdocs」をクリック
2. Cursorが自動でDocker環境をビルド
3. `/chat`アプリをAI修正対象として登録（Prompt改善を繰り返す）
4. UIとAPIを同時に再起動 (`docker-compose restart`)

---

## 💡 開発後の拡張アイデア

| 機能 | 技術 | 目的 |
| ------------- | ----------------------- | --------- |
| 思考ツリービジュアライザー | D3.js / React-Flow | 思考の構造を視覚化 |
| ノート保存 | SQLite ORM (SQLModel) | セッション保存 |
| Mirror機能 | 過去ログ再引用 | 思考の変化を提示 |
| 感情スコアリング | OpenAI Function Calling | 心理的変化の可視化 |

