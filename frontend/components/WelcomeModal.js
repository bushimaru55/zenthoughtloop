import { useState } from 'react';

export default function WelcomeModal({ onClose }) {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: "Thought Loopへようこそ",
      icon: "✨",
      content: (
        <div className="space-y-4 text-purple-200">
          <p className="text-lg leading-relaxed">
            このアプリは、<span className="text-yellow-300 font-medium">AIとの対話を通じて</span>あなたの思考力・創造性・人間性を高めるためのトレーニングツールです。
          </p>
          <p className="text-lg leading-relaxed">
            最終的には、<span className="text-pink-300 font-medium">AIと共創できるスキル</span>を身につけることを目指します。
          </p>
        </div>
      )
    },
    {
      title: "3ステージの成長の旅",
      icon: "🌳",
      content: (
        <div className="space-y-6">
          <div className="bg-purple-800/30 p-4 rounded-2xl border border-purple-400/30">
            <h3 className="text-purple-300 font-medium mb-2 flex items-center gap-2">
              <span>Stage 1: 思考の覚醒</span>
            </h3>
            <p className="text-purple-200 text-sm">AIの問いかけを通じて、自分自身の思考を深めていきます。</p>
          </div>
          <div className="bg-purple-800/30 p-4 rounded-2xl border border-purple-400/30">
            <h3 className="text-purple-300 font-medium mb-2 flex items-center gap-2">
              <span>Stage 2: 思考の洗練</span>
            </h3>
            <p className="text-purple-200 text-sm">定期的な振り返りで、自分の思考パターンを認識します。</p>
          </div>
          <div className="bg-purple-800/30 p-4 rounded-2xl border border-purple-400/30">
            <h3 className="text-purple-300 font-medium mb-2 flex items-center gap-2">
              <span>Stage 3: AI共創マスター</span>
            </h3>
            <p className="text-purple-200 text-sm">AIへの効果的な指示方法を学び、創造的なAI活用スキルを習得します。</p>
          </div>
        </div>
      )
    },
    {
      title: "始め方",
      icon: "🚀",
      content: (
        <div className="space-y-4">
          <div className="bg-purple-800/30 p-4 rounded-2xl border border-purple-400/30">
            <p className="text-purple-200 text-sm leading-relaxed">
              AIは答えを与えません。<span className="text-yellow-300">問いを返してくれます。</span>
            </p>
          </div>
          <div className="bg-purple-800/30 p-4 rounded-2xl border border-purple-400/30">
            <p className="text-purple-200 text-sm leading-relaxed">
              <span className="text-yellow-300">素直に思ったことを話してみてください。</span>どんな話でも大丈夫です。
            </p>
          </div>
          <div className="bg-purple-800/30 p-4 rounded-2xl border border-purple-400/30">
            <p className="text-purple-200 text-sm leading-relaxed">
              「最近悩んでいること」「やりたいこと」「感じていること」を自由にシェアしてください。
            </p>
          </div>
        </div>
      )
    }
  ];

  const current = steps[step - 1];

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

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i + 1 === step ? 'bg-purple-300 w-8' : 'bg-purple-600'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-pulse">{current.icon}</div>
          <h2 className="text-3xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-purple-200 to-pink-200 mb-6">
            {current.title}
          </h2>
          {current.content}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 justify-center">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 bg-purple-800/50 hover:bg-purple-800/70 text-purple-200 rounded-2xl font-light transition-all border border-purple-400/30"
            >
              戻る
            </button>
          )}
          {step < steps.length ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white rounded-2xl font-light transition-all shadow-lg"
            >
              次へ
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white rounded-2xl font-light transition-all shadow-lg"
            >
              始める
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

