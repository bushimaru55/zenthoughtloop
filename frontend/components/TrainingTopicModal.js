import { useState } from 'react';

export default function TrainingTopicModal({ onSelect, onClose }) {
  const [selectedTopic, setSelectedTopic] = useState(null);

  const topics = [
    {
      id: 'self-understanding',
      title: '自己理解を深める',
      icon: '🔍',
      description: '自分自身の価値観、感情、思考パターンを理解する',
      color: 'from-blue-400 to-cyan-500'
    },
    {
      id: 'creativity',
      title: '創造性を育む',
      icon: '💡',
      description: '新しいアイデアや視点を見つける力を高める',
      color: 'from-purple-400 to-pink-500'
    },
    {
      id: 'problem-solving',
      title: '問題解決力を高める',
      icon: '🧩',
      description: '問題を多角的に捉え、解決策を見つける',
      color: 'from-amber-400 to-orange-500'
    },
    {
      id: 'goal-setting',
      title: '目標設定と実行',
      icon: '🎯',
      description: '具体的な目標を立て、行動につなげる',
      color: 'from-green-400 to-emerald-500'
    },
    {
      id: 'emotion-management',
      title: '感情の理解と管理',
      icon: '💫',
      description: '感情を理解し、前向きに向き合う',
      color: 'from-indigo-400 to-purple-500'
    },
    {
      id: 'free-talk',
      title: '自由な対話',
      icon: '💬',
      description: '自由なテーマで気軽に話す',
      color: 'from-gray-400 to-slate-500'
    }
  ];

  const handleSelect = () => {
    if (selectedTopic) {
      onSelect(selectedTopic);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-3xl w-full mx-4 border border-purple-400/30 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-purple-300 hover:text-purple-100 transition-colors text-2xl"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-pulse">✨</div>
          <h2 className="text-3xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-pink-200 mb-2">
            今日は何について考えますか？
          </h2>
          <p className="text-purple-200 text-sm">番号を選んでトレーニングを始めましょう</p>
        </div>

        {/* Topics */}
        <div className="grid grid-cols-2 gap-4 mb-8 max-h-96 overflow-y-auto custom-scrollbar">
          {topics.map((topic, index) => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic.id)}
              className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                selectedTopic === topic.id
                  ? 'border-purple-300 bg-purple-800/30 shadow-lg scale-105'
                  : 'border-purple-400/20 bg-purple-800/10 hover:border-purple-400/40 hover:bg-purple-800/20'
              }`}
            >
              {/* 番号バッジ */}
              <div className="absolute top-3 left-3 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {index + 1}
              </div>
              
              <div className="text-3xl mb-2 mt-2">{topic.icon}</div>
              <h3 className="text-purple-200 font-medium mb-1">{topic.title}</h3>
              <p className="text-purple-300/70 text-xs leading-relaxed">{topic.description}</p>
              {selectedTopic === topic.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-purple-800/50 hover:bg-purple-800/70 text-purple-200 rounded-2xl font-light transition-all border border-purple-400/30"
          >
            キャンセル
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedTopic}
            className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white rounded-2xl font-light transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            始める
          </button>
        </div>
      </div>
    </div>
  );
}

