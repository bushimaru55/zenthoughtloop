import { useState } from 'react';

export default function ReflectionModal({ prompt, onClose, onSave }) {
  const [response, setResponse] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!response.trim()) {
      alert('振り返りを入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(response);
      setResponse('');
      onClose();
    } catch (err) {
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-8 max-w-2xl w-full mx-4 border border-purple-400/30 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-purple-300 hover:text-purple-100 transition-colors text-2xl"
        >
          ✕
        </button>

        {/* Content */}
        <div className="mb-6">
          <div className="text-5xl mb-4 text-center animate-pulse">🤔</div>
          <h2 className="text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-pink-200 text-center mb-4">
            振り返りの時間
          </h2>
          <div className="bg-purple-800/30 p-4 rounded-2xl border border-purple-400/30 mb-6">
            <p className="text-purple-200 leading-relaxed">{prompt}</p>
          </div>
        </div>

        {/* Input */}
        <textarea
          className="w-full bg-white/10 border border-purple-300/30 rounded-2xl px-4 py-4 text-gray-100 placeholder-purple-200/50 focus:outline-none focus:border-purple-300/50 focus:bg-white/15 font-light min-h-[120px] custom-scrollbar resize-none"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="自由に思ったことを書いてください..."
          disabled={isSaving}
        />

        {/* Buttons */}
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-purple-800/50 hover:bg-purple-800/70 text-purple-200 rounded-2xl font-light transition-all border border-purple-400/30"
            disabled={isSaving}
          >
            後で
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !response.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white rounded-2xl font-light transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

