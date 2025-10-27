from sqlmodel import SQLModel, create_engine, Session
import os

# データベースファイルのパス
db_dir = "./data"
os.makedirs(db_dir, exist_ok=True)
DATABASE_URL = f"sqlite:///{db_dir}/thoughtloop.db"

# SQLiteエンジンの作成
engine = create_engine(DATABASE_URL, echo=True)


def init_db():
    """データベースを初期化し、テーブルを作成"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """データベースセッションを取得"""
    with Session(engine) as session:
        yield session
