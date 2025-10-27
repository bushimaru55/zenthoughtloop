from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class Conversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id")
    role: str  # 'user' or 'ai'
    content: str
    depth_score: float = Field(default=0.0)  # 思考の深さスコア (0.0-10.0)
    created_at: datetime = Field(default_factory=datetime.now)


class UserProgress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str  # ブラウザのlocalStorageで生成されたID
    current_stage: int = Field(default=1)  # 1, 2, or 3
    total_conversations: int = Field(default=0)
    total_reflections: int = Field(default=0)
    prompt_skill_score: float = Field(default=0.0)  # プロンプトスキルスコア
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class Reflection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id")
    prompt: str  # リフレクション質問
    user_response: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class PromptExercise(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    goal: str  # 達成したい目標
    good_example: str  # 良いプロンプト例
    bad_example: str  # 悪いプロンプト例
    difficulty: int  # 1-5


class PromptAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str
    exercise_id: int = Field(foreign_key="promptexercise.id")
    user_prompt: str
    score: float = Field(default=0.0)  # AIが評価 (0.0-10.0)
    feedback: str = ""
    created_at: datetime = Field(default_factory=datetime.now)

