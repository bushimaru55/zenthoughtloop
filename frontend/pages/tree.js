import { useState, useEffect } from 'react';
import ThoughtTree from '../components/ThoughtTree';

export default function TreePage() {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await fetch('http://localhost:8000/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations);
        }
      } catch (err) {
        console.error('会話の読み込みに失敗しました:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 text-center">
          <div className="inline-block mb-4 text-6xl">🌳</div>
          <h1 className="text-4xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-pink-200 mb-3">
            思考のツリー
          </h1>
          <p className="text-purple-200 font-light">あなたの思考の旅を視覚化</p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-purple-200">読み込み中...</div>
          </div>
        ) : (
          <ThoughtTree conversations={conversations} />
        )}
      </div>
    </main>
  );
}

