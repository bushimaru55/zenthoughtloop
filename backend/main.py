from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from sqlmodel import Session, select
from typing import List
import os
from datetime import datetime
from database import engine, init_db, get_session
from models import Conversation, Message, UserProgress, Reflection, PromptExercise

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
    
    # ユーザーステージを取得
    statement = select(UserProgress)
    user_progress = session.exec(statement).first()
    current_stage = user_progress.current_stage if user_progress else 1
    
    # ステージに応 entsprechendenAIプロンプト生成
    if current_stage == 1:
        prompt = f"""あなたは人間性と創造性を取り戻すためのAIコーチです。
答えを出さずに、思考を深める質問を返してください。
ユーザーの発言を受け止め、さらに深く考えるきっかけとなる質問をしてください。

ユーザー: {user_message}
AI:"""
    elif current_stage == 2:
        prompt = f"""あなたは思考パターンを分析するコーチです。
ユーザーの思考の流れや変化を観察し、振り返りを促す質問をしてください。
思考のパターンや気づきの変化に注目して、より深い洞察を得られるような質問をしてください。

ユーザー: {user_message}
AI:"""
    else:  # stage 3
        prompt = f"""あなたはAI共創パートナーです。
ユーザーの指示を理解し、より良い結果を得られるようにサポートしてください。
ユーザーが求めているものを明確にし、より良いコミュニケーション方法を提案してください。
共創的な対話を心がけてください。

ユーザー: {user_message}
AI:"""
    
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


@app.get("/exercises")
async def get_exercises(session: Session = Depends(get_session)):
    """練習課題を取得"""
    exercises = session.exec(select(PromptExercise)).all()
    
    if not exercises or len(exercises) == 0:
        # 初期データがなければ空リストを返す
        return {"exercises": []}
    
    result = []
    for exercise in exercises:
        result.append({
            "id": exercise.id,
            "title": exercise.title,
            "goal": exercise.goal,
            "good_example": exercise.good_example,
            "bad_example": exercise.bad_example,
            "difficulty": exercise.difficulty
        })
    
    return {"exercises": result}


@app.post("/diagnosis/{conversation_id}")
async def generate_diagnosis(conversation_id: int, session: Session = Depends(get_session)):
    """5問回答後の診断を生成"""
    # 会話のメッセージを取得
    statement = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    messages = session.exec(statement).all()
    
    if not messages:
        return {"error": "メッセージが見つかりません"}
    
    # 会話内容をまとめる
    conversation = "\n".join([f"{m.role}: {m.content}" for m in messages])
    
    # 思考の深さスコアの平均を計算
    user_scores = [m.depth_score for m in messages if m.role == "user" and m.depth_score > 0]
    avg_depth_score = sum(user_scores) / len(user_scores) if user_scores else 0
    
    # OpenAIで診断分析を生成
    diagnosis_prompt = f"""以下の会話を分析して、ユーザーの思考パターンと成長度を診断してください。

会話内容:
{conversation}

思考の深さスコア（平均）: {avg_depth_score:.2f} / 10.0

以下の観点で診断してください：
1. 思考の深さ：どのくらい深く考えているか
2. 自己理解：自分自身を理解しているか
3. 成長ポイント：これから成長できる点
4. 次のステップ：おすすめのトレーニング内容

簡潔で励みになる診断結果を提供してください（200文字程度）："""

    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": diagnosis_prompt}],
            max_tokens=300
        )
        diagnosis = response.choices[0].message.content
        
        return {
            "diagnosis": diagnosis,
            "avg_depth_score": avg_depth_score,
            "message_count": len(messages),
            "conversation_id": conversation_id
        }
    except Exception as e:
        return {"error": f"診断生成中にエラーが発生しました: {str(e)}"}


@app.post("/exercises/{exercise_id}/evaluate")
async def evaluate_prompt(exercise_id: int, request: Request, session: Session = Depends(get_session)):
    """ユーザープロンプトを評価"""
    data = await request.json()
    user_prompt = data.get("prompt", "")
    user_id = data.get("user_id", "default")
    
    if not user_prompt:
        return {"error": "プロンプトが空です"}
    
    # 練習課題を取得
    exercise = session.get(PromptExercise, exercise_id)
    if not exercise:
        return {"error": "練習課題が見つかりません"}
    
    # OpenAIで評価
    eval_prompt = f"""プロンプトエンジニアリングの練習課題を評価してください。

【目標】: {exercise.goal}

【良い例】:
{exercise.good_example}

【悪い例】:
{exercise.bad_example}

【ユーザーのプロンプト】:
{user_prompt}

以下の観点で0.0-10.0のスコアとフィードバックを提供してください:
1. 明確さ: 意図が明確か
2. 具体性: 具体的な指示か
3. 構造: 構造化されているか
4. 創造性: 創造的な内容か

JSON形式で返してください:
{{"score": 0.0-10.0, "feedback": "フィードバック内容"}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": eval_prompt}],
            max_tokens=200
        )
        feedback = response.choices[0].message.content
        
        return {"feedback": feedback, "exercise_id": exercise_id}
    except Exception as e:
        return {"error": f"評価中にエラーが発生しました: {str(e)}"}
