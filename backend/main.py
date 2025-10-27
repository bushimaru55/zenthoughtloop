from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from sqlmodel import Session, select
from typing import List
import os
from datetime import datetime
from database import engine, init_db, get_session
from models import Conversation, Message, UserProgress, Reflection

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
    
    # ユーザーメッセージを保存（思考の深さスコアを計算）
    depth_score = calculate_depth_score(user_message)
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=user_message,
        depth_score=depth_score
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
        ai_depth_score = calculate_depth_score(ai_reply)
        ai_msg = Message(
            conversation_id=conversation_id,
            role="ai",
            content=ai_reply,
            depth_score=ai_depth_score
        )
        session.add(ai_msg)
        session.commit()
        
        return {
            "reply": ai_reply,
            "conversation_id": conversation_id,
            "depth_score": depth_score
        }
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


# 思考の深さスコアを計算する関数
def calculate_depth_score(message: str) -> float:
    """メッセージの思考の深さをスコアリング"""
    score = 0.0
    
    # 基本スコア: 文字数
    score += min(len(message) / 50, 3.0)  # 最大3.0
    
    # 質問の数
    question_count = message.count('?') + message.count('？')
    score += min(question_count * 0.5, 2.0)  # 最大2.0
    
    # 抽象的な言葉（思考を深める単語）
    abstract_words = ['なぜ', 'どうして', 'もし', '仮に', '本質', '意義', '価値', '意味', 'なぜなら']
    abstract_count = sum(1 for word in abstract_words if word in message)
    score += min(abstract_count * 0.3, 2.0)  # 最大2.0
    
    # 感情表現
    emotion_words = ['感じる', '思う', '考える', '信じる', '願う', '希望']
    emotion_count = sum(1 for word in emotion_words if word in message)
    score += min(emotion_count * 0.2, 1.5)  # 最大1.5
    
    # 具体的な事例や詳細
    detail_indicators = ['例えば', '具体的に', '実際に', '〜として']
    detail_count = sum(1 for word in detail_indicators if word in message)
    score += min(detail_count * 0.4, 1.5)  # 最大1.5
    
    return min(score, 10.0)  # 最大10.0


@app.get("/progress/{user_id}")
async def get_progress(user_id: str, session: Session = Depends(get_session)):
    """ユーザーの進捗を取得"""
    statement = select(UserProgress).where(UserProgress.user_id == user_id)
    progress = session.exec(statement).first()
    
    if not progress:
        # 進捗が存在しない場合は新規作成
        progress = UserProgress(user_id=user_id, current_stage=1)
        session.add(progress)
        session.commit()
        session.refresh(progress)
    
    return {
        "user_id": progress.user_id,
        "current_stage": progress.current_stage,
        "total_conversations": progress.total_conversations,
        "total_reflections": progress.total_reflections,
        "prompt_skill_score": progress.prompt_skill_score
    }


@app.post("/progress/{user_id}/update")
async def update_progress(user_id: str, session: Session = Depends(get_session)):
    """ユーザーの進捗を更新"""
    statement = select(UserProgress).where(UserProgress.user_id == user_id)
    progress = session.exec(statement).first()
    
    if not progress:
        progress = UserProgress(user_id=user_id, current_stage=1)
        session.add(progress)
        session.commit()
        session.refresh(progress)
    
    # 会話数を更新
    conv_count = session.exec(
        select(Conversation)
    ).all()
    progress.total_conversations = len(conv_count)
    
    # リフレクション数を更新
    reflection_count = session.exec(
        select(Reflection).where(Reflection.user_response != None)
    ).all()
    progress.total_reflections = len(reflection_count)
    
    # ステージtransition判定
    if progress.current_stage == 1 and progress.total_conversations >= 10:
        progress.current_stage = 2
    elif progress.current_stage == 2 and progress.total_reflections >= 3:
        progress.current_stage = 3
    
    progress.updated_at = datetime.now()
    session.add(progress)
    session.commit()
    
    return {
        "user_id": progress.user_id,
        "current_stage": progress.current_stage,
        "total_conversations": progress.total_conversations,
        "total_reflections": progress.total_reflections
    }


@app.post("/reflection/prompt")
async def generate_reflection_prompt(conversation_id: int, session: Session = Depends(get_session)):
    """リフレクション質問を生成"""
    # 会話のメッセージを取得
    statement = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    messages = session.exec(statement).all()
    
    if not messages:
        return {"error": "メッセージが見つかりません"}
    
    # 会話の内容をまとめる
    conversation_summary = "\n".join([f"{m.role}: {m.content}" for m in messages[-10:]])  # 最後の10件
    
    # OpenAIでリフレクション質問を生成
    prompt = f"""以下の会話履歴を読んで、ユーザーに振り返りを促す質問を1つ生成してください。
会話の流れや変化、重要な気づきに焦点を当てた質問にしてください。

会話履歴:
{conversation_summary}

リフレクション質問:"""

    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100
        )
        reflection_prompt = response.choices[0].message.content
        
        # リフレクションを保存
        reflection = Reflection(
            conversation_id=conversation_id,
            prompt=reflection_prompt
        )
        session.add(reflection)
        session.commit()
        session.refresh(reflection)
        
        return {
            "reflection_id": reflection.id,
            "prompt": reflection_prompt
        }
    except Exception as e:
        return {"error": f"エラーが発生しました: {str(e)}"}


@app.post("/reflection/{reflection_id}")
async def save_reflection_response(reflection_id: int, request: Request, session: Session = Depends(get_session)):
    """リフレクションの回答を保存"""
    data = await request.json()
    response_text = data.get("response", "")
    
    reflection = session.get(Reflection, reflection_id)
    if not reflection:
        return {"error": "リフレクションが見つかりません"}
    
    reflection.user_response = response_text
    session.add(reflection)
    session.commit()
    
    return {"success": True, "reflection_id": reflection.id}
