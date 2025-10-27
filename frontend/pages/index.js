import { useState, useEffect, useRef } from "react";
import WelcomeModal from "../components/WelcomeModal";
import ReflectionModal from "../components/ReflectionModal";
import TrainingTopicModal from "../components/TrainingTopicModal";
import DiagnosisPanel from "../components/DiagnosisPanel";

export default function Home() {
  const [input, setInput] = useState("");
  const [log, setLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionPrompt, setReflectionPrompt] = useState('');
  const [reflectionId, setReflectionId] = useState(null);
  const [userId, setUserId] = useState('');
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
const [diagnosis, setDiagnosis] = useState(null);

  // ユーザーID生成
  useEffect(() => {
    let uid = localStorage.getItem('userId');
    if (!uid) {
      uid = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', uid);
    }
    setUserId(uid);
  }, []);

  // 初回訪問チェック
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [log]);

  // 会話一覧を取得
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await fetch("http://localhost:8000/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations);
        }
      } catch (err) {
        console.error('会話一覧の読み込みに失敗しました:', err);
      }
    };

    loadConversations();
  }, []);

  // 履歴復元
  useEffect(() => {
    const loadHistory = async (convId) => {
      try {
        const res = await fetch(`http://localhost:8000/conversations/${convId}/messages`);
        if (res.ok) {
          const data = await res.json();
          // APIの履歴を表示用の形式に変換
          const formattedLog = [];
          let currentUserMessage = null;
          
          data.messages.forEach((msg) => {
            if (msg.role === 'user') {
              currentUserMessage = msg.content;
            } else if (msg.role === 'ai' && currentUserMessage) {
              formattedLog.push({
                user: currentUserMessage,
                ai: msg.content,
                isLoading: false
              });
              currentUserMessage = null;
            }
          });
          
          setLog(formattedLog);
        }
      } catch (err) {
        console.error('履歴の読み込みに失敗しました:', err);
      }
    };

    if (conversationId) {
      loadHistory(conversationId);
    }
  }, [conversationId]);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setInput("");
    setIsLoading(true);
    setError(null);
    
    // ユーザーメッセージを即座に表示
    const newLog = [...log, { user: userMessage, ai: "", isLoading: true }];
    setLog(newLog);
    
    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, conversation_id: conversationId }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // conversation_idを保存
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      
      // ログを更新してAI応答を追加（newLogを使用）
      const updatedLog = newLog.map((entry, index) => 
        index === newLog.length - 1
          ? { user: userMessage, ai: data.reply, isLoading: false }
          : entry
      );
      setLog(updatedLog);
      
      // 5往復ごとに診断を生成（会話数/2 = 往復数なので、5往復は10メッセージ）
      // logには1往復（user + ai）が1エントリとして入る
      const exchangeCount = updatedLog.filter(entry => entry.ai && !entry.isLoading).length;
      if (exchangeCount > 0 && exchangeCount % 5 === 0) {
        await generateDiagnosis(data.conversation_id);
        await checkForReflection(data.conversation_id);
      }
    } catch (err) {
      setError(err.message);
      // エラー時はローディング中のエントリを削除（元のlogに戻す）
      setLog(log);
    } finally {
      setIsLoading(false);
    }
  }

  // 診断を生成
  const generateDiagnosis = async (convId) => {
    try {
      const res = await fetch(`http://localhost:8000/diagnosis/${convId}`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const data = await res.json();
        setDiagnosis(data);
        // 診断結果を診断パネルに表示
      }
    } catch (err) {
      console.error('診断生成エラー:', err);
    }
  };

  // リフレクションプロンプトを取得
  const checkForReflection = async (convId) => {
    try {
      const res = await fetch(`http://localhost:8000/reflection/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId })
      });
      
      if (res.ok) {
        const data = await res.json();
        setReflectionPrompt(data.prompt);
        setReflectionId(data.reflection_id);
        setShowReflection(true);
      }
    } catch (err) {
      console.error('リフレクション取得エラー:', err);
    }
  };

  // リフレクション回答を保存
  const saveReflection = async (response) => {
    if (!reflectionId) return;
    
    await fetch(`http://localhost:8000/reflection/${reflectionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response })
    });
    
    // 進捗を更新
    if (userId) {
      await fetch(`http://localhost:8000/progress/${userId}/update`, { method: 'POST' });
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // クイックスタート関数
  const handleQuickStart = async (message) => {
    // 新規会話を作成
    try {
      const res = await fetch("http://localhost:8000/conversations", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversation_id);
        setLog([]);
        setInput("");
        
        // メッセージを自動送信
        setIsLoading(true);
        setError(null);
        
        const newLog = [{ user: message, ai: "", isLoading: true }];
        setLog(newLog);
        
        try {
          const res = await fetch("http://localhost:8000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message, conversation_id: data.conversation_id }),
          });
          
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          const chatData = await res.json();
          
          setLog(newLog.map((entry, index) => 
            index === newLog.length - 1
              ? { user: message, ai: chatData.reply, isLoading: false }
              : entry
          ));
        } catch (err) {
          setError(err.message);
          setLog([]);
        } finally {
          setIsLoading(false);
        }
        
        // 会話一覧を再取得
        const listRes = await fetch("http://localhost:8000/conversations");
        if (listRes.ok) {
          const listData = await listRes.json();
          setConversations(listData.conversations);
        }
      }
    } catch (err) {
      setError("会話の開始に失敗しました");
    }
  };

  const startNewConversation = async () => {
    // トピック選択モーダルを表示
    setShowTopicModal(true);
  };

  const handleTopicSelect = async (topicId) => {
    setSelectedTopic(topicId);
    setShowTopicModal(false);
    
    try {
      const res = await fetch("http://localhost:8000/conversations", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversation_id);
        setLog([]);
        setInput("");
        
        // 選択されたトピックに基づいて最初のメッセージを自動入力
        const topicMessages = {
          'self-understanding': '自分自身について深く考えてみたいです。',
          'creativity': '創造性を高めたいです。何から始めればいいですか？',
          'problem-solving': '問題解決力を高めたいです。',
          'goal-setting': '目標を立てて実行したいです。',
          'emotion-management': '感情を理解し、うまく向き合いたいです。',
          'free-talk': '話したいことがあります。'
        };
        
        if (topicMessages[topicId]) {
          setInput(topicMessages[topicId]);
        }
        
        // 会話一覧を再取得
        const listRes = await fetch("http://localhost:8000/conversations");
        if (listRes.ok) {
          const listData = await listRes.json();
          setConversations(listData.conversations);
        }
      }
    } catch (err) {
      setError("新規会話の開始に失敗しました");
    }
  };

  const selectConversation = (id) => {
    setConversationId(id);
    setShowSidebar(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 p-4 md:p-6 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        <header className="mb-8 text-center">
          <div className="inline-block mb-4 text-6xl animate-pulse">✨</div>
          <h1 className="text-4xl md:text-5xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-pink-200 mb-3 tracking-wide">
            Thought Loop
          </h1>
          <p className="text-purple-200 text-lg font-light">内なる声と対話する</p>
          <div className="mt-4 flex items-center justify-center space-x-2 text-purple-300/50">
            <div className="w-12 h-px bg-purple-400/30"></div>
            <span className="text-sm">⋆</span>
            <div className="w-12 h-px bg-purple-400/30"></div>
          </div>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={startNewConversation}
              className="px-6 py-3 bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 rounded-2xl font-light transition-all border border-purple-400/30 hover:border-purple-400/50 backdrop-blur-sm"
            >
              ✨ 新規会話
            </button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="px-6 py-3 bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 rounded-2xl font-light transition-all border border-purple-400/30 hover:border-purple-400/50 backdrop-blur-sm"
            >
              📚 会話履歴
            </button>
            <a
              href="/tree"
              className="px-6 py-3 bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 rounded-2xl font-light transition-all border border-purple-400/30 hover:border-purple-400/50 backdrop-blur-sm"
            >
              🌳 思考のツリー
            </a>
          </div>
        </header>

        {/* リアルタイム診断パネル */}
        <DiagnosisPanel userId={userId} />

        <div className="bg-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-purple-400/20 overflow-hidden">
          {/* チャット履歴 */}
          <div className="h-96 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {log.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-purple-200/60">
                      <div className="text-center max-w-md">
                        <div className="text-6xl mb-6 animate-pulse">✨</div>
                        <h3 className="text-2xl font-light mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-pink-200">
                          トレーニングを始めましょう
                        </h3>
                        <p className="text-lg font-light mb-6">AIとの対話を通じて、思考力・創造性・人間性を高めます</p>
                        
                        <div className="bg-purple-800/30 p-6 rounded-2xl border border-purple-400/30 mb-6">
                          <p className="text-purple-200 text-sm mb-3 text-center">このセッションで学べること（クリックして選択）：</p>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleQuickStart('自分自身について深く考えてみたいです。')}
                              className="p-3 bg-purple-900/50 hover:bg-purple-900/70 rounded-xl border border-purple-400/30 text-left transition-all hover:scale-105"
                            >
                              <span className="text-lg">🌱</span>
                              <p className="text-purple-300/80 text-xs mt-1">自己理解を深める</p>
                            </button>
                            <button
                              onClick={() => handleQuickStart('創造性を高めたいです。何から始めればいいですか？')}
                              className="p-3 bg-purple-900/50 hover:bg-purple-900/70 rounded-xl border border-purple-400/30 text-left transition-all hover:scale-105"
                            >
                              <span className="text-lg">💡</span>
                              <p className="text-purple-300/80 text-xs mt-1">創造的な思考を育む</p>
                            </button>
                            <button
                              onClick={() => handleQuickStart('問題解決力を高めたいです。')}
                              className="p-3 bg-purple-900/50 hover:bg-purple-900/70 rounded-xl border border-purple-400/30 text-left transition-all hover:scale-105"
                            >
                              <span className="text-lg">🧩</span>
                              <p className="text-purple-300/80 text-xs mt-1">問題解決力を高める</p>
                            </button>
                            <button
                              onClick={() => handleQuickStart('感情を理解し、うまく向き合いたいです。')}
                              className="p-3 bg-purple-900/50 hover:bg-purple-900/70 rounded-xl border border-purple-400/30 text-left transition-all hover:scale-105"
                            >
                              <span className="text-lg">💫</span>
                              <p className="text-purple-300/80 text-xs mt-1">感情を理解し前向きに向き合う</p>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs font-light text-purple-300/50">
                          上の入力欄に自由に言葉を書いてください<br/>
                          または「新規会話」ボタンでテーマを選択して始められます
                        </p>
                      </div>
                    </div>
                  ) : (
              log.map((m, i) => (
                <div key={i} className="space-y-3 animate-fadeIn">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-300 to-cyan-400 flex items-center justify-center text-white text-sm font-medium">
                      You
                    </div>
                    <div className="flex-1 bg-gradient-to-r from-blue-400/20 to-cyan-400/10 backdrop-blur-sm p-4 rounded-2xl border border-blue-400/20">
                      <p className="text-gray-100 font-light leading-relaxed">{m.user}</p>
                    </div>
                  </div>
                  {m.isLoading ? (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-300 to-pink-400 flex items-center justify-center text-white text-sm">
                        🌙
                      </div>
                      <div className="flex-1 bg-gradient-to-r from-purple-400/20 to-pink-400/10 backdrop-blur-sm p-4 rounded-2xl border border-purple-400/20">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                          <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-300 to-pink-400 flex items-center justify-center text-white text-sm">
                        ✨
                      </div>
                      <div className="flex-1 bg-gradient-to-r from-purple-400/20 to-pink-400/10 backdrop-blur-sm p-4 rounded-2xl border border-purple-400/20">
                        <p className="text-gray-100 font-light leading-relaxed whitespace-pre-wrap">{m.ai}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mx-6 mb-4 p-4 bg-red-500/20 border border-red-400/30 rounded-2xl text-red-200 text-sm backdrop-blur-sm">
              ⚠️ {error}
            </div>
          )}

          {/* 入力エリア */}
          <div className="border-t border-purple-400/20 p-6 bg-white/5 backdrop-blur-lg">
            <div className="flex space-x-3">
              <input
                className="flex-1 bg-white/10 border border-purple-300/30 rounded-2xl px-5 py-4 text-gray-100 placeholder-purple-200/50 focus:outline-none focus:border-purple-300/50 focus:bg-white/15 focus:ring-2 focus:ring-purple-400/30 transition-all font-light"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="内なる声を言葉に..."
                disabled={isLoading}
              />
              <button 
                onClick={sendMessage} 
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white px-8 py-4 rounded-2xl font-light disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:shadow-purple-500/50 active:scale-95 flex items-center"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    送信
                  </span>
                ) : (
                  "送信"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ウェルカムモーダル */}
      {showWelcome && (
        <WelcomeModal onClose={() => setShowWelcome(false)} />
      )}

      {/* リフレクションモーダル */}
      {showReflection && (
        <ReflectionModal
          prompt={reflectionPrompt}
          onClose={() => setShowReflection(false)}
          onSave={saveReflection}
        />
      )}

      {/* トレーニングトピック選択モーダル */}
      {showTopicModal && (
        <TrainingTopicModal
          onSelect={handleTopicSelect}
          onClose={() => setShowTopicModal(false)}
        />
      )}

      {/* サイドパネル - 会話履歴 */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end" onClick={() => setShowSidebar(false)}>
          <div className="w-80 h-full bg-gradient-to-br from-purple-900 to-indigo-900 border-l border-purple-400/20 overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-purple-400/20">
              <h2 className="text-2xl font-light text-purple-200 mb-4">📚 会話履歴</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="absolute top-6 right-6 text-purple-300 hover:text-purple-200"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2">
              {conversations.length === 0 ? (
                <p className="text-purple-300/50 text-center py-8">会話履歴がありません</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all ${
                      conversationId === conv.id
                        ? 'bg-purple-600/40 border-2 border-purple-400'
                        : 'bg-purple-800/30 border border-purple-400/20 hover:bg-purple-800/40'
                    }`}
                  >
                    <div className="text-purple-200 font-light">会話 #{conv.id}</div>
                    <div className="text-purple-300/50 text-xs mt-1">
                      {new Date(conv.created_at).toLocaleString('ja-JP')}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
