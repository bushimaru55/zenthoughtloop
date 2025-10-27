from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from sqlmodel import Session, select
from typing import List
import os
from database import engine, init_db, get_session
from models import Conversation, Message

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# OpenAIクライアントを初期化
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@app.on_event("startup")
async def startup_event():
    """アプリ起動時にデータベースを初期化"""
    init_db()


@app.get("/")
async def root():
    return {"message": "Thought Loop Backend API"}


@app.post("/chat")
async def chat(request: Request, session: Session = Depends(get_session)):
    data = await request.json()
    user_message = data.get("message", "")
    conversation_id = data.get("conversation_id")  # セッションID
    
    # 会話IDがない場合、新しい会話を作成
    if not conversation_id:
        conversation = Conversation()
        session.add(conversation)
        session.commit()
        session.refresh(conversation)
        conversation_id = conversation.id
    else:
        # 既存の会話を取得
        conversation = session.get(Conversation, conversation_id)
        if not conversation:
            conversation = Conversation()
            session.add(conversation)
            session.commit()
            session.refresh(conversation)
            conversation_id = conversation.id
    
    # ユーザーメッセージを保存
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=user_message
    )
    session.add(user_msg)
    session.commit()
    
    # OpenAI API呼び出し
    prompt = f"あなたは人間性と創造性を取り戻すためのAIコーチです。答えを出さずに、思考を深める質問を返してください。\nユーザー: {user_message}\nAI:"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150
        )
        ai_reply = response.choices[0].message.content
        
        # AI応答を保存
        ai_msg = Message(
            conversation_id=conversation_id,
            role="ai",
            content=ai_reply
        )
        session.add(ai_msg)
        session.commit()
        
        return {"reply": ai_reply, "conversation_id": conversation_id}
    except Exception as e:
        return {"reply": f"エラーが発生しました: {str(e)}", "conversation_id": conversation_id}


@app.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: int, session: Session = Depends(get_session)):
    """特定の会話のメッセージ履歴を取得"""
    statement = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    messages = session.exec(statement).all()
    
    result = []
    for msg in messages:
        result.append({
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        })
    
    return {"messages": result}


@app.get("/conversations")
async def get_conversations(session: Session = Depends(get_session)):
    """すべての会話一覧を取得（メッセージがある会話のみ）"""
    statement = select(Conversation).order_by(Conversation.updated_at.desc())
    conversations = session.exec(statement).all()
    
    result = []
    for conv in conversations:
        # この会話のメッセージ数を確認
        message_count = session.exec(
            select(Message).where(Message.conversation_id == conv.id)
        ).all()
        
        # メッセージが1つ以上ある場合のみ追加
        if len(message_count) > 0:
            result.append({
                "id": conv.id,
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "message_count": len(message_count)
            })
    
    return {"conversations": result}


@app.post("/conversations")
async def create_conversation(session: Session = Depends(get_session)):
    """新しい会話を作成"""
    conversation = Conversation()
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    
    return {"conversation_id": conversation.id, "created_at": conversation.created_at.isoformat()}
