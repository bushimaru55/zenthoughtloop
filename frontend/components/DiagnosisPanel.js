import { useState, useEffect } from 'react';

export default function DiagnosisPanel({ userId }) {
  const [progress, setProgress] = useState(null);
  const [avgDepthScore, setAvgDepthScore] = useState(0);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const res = await fetch(`http://localhost:8000/progress/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setProgress(data);
        }
      } catch (err) {
        console.error('進捗の読み込みに失敗しました:', err);
      }
    };

    if (userId) {
      loadProgress();
      // 3秒ごとに更新
      const interval = setInterval(loadProgress, 3000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    const loadAvgDepthScore = async () => {
      try {
        const res = await fetch(`http://localhost:8000/conversations`);
        if (res.ok) {
          const data = await res.json();
          if (data.conversations && data.conversations.length > 0) {
            // 最新の会話のメッセージを取得して平均スコアを計算
            const latestConv = data.conversations[0];
            const msgRes = await fetch(`http://localhost:8000/conversations/${latestConv.id}/messages`);
            if (msgRes.ok) {
              const msgData = await msgRes.json();
              const scores = msgData.messages
                .filter(m => m.depth_score)
                .map(m => m.depth_score);
              if (scores.length > 0) {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                setAvgDepthScore(avg);
              }
            }
          }
        }
      } catch (err) {
        console.error('スコアの読み込みに失敗しました:', err);
      }
    };

    loadAvgDepthScore();
    const interval = setInterval(loadAvgDepthScore, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStageInfo = (stage) => {
    const stages = {
      1: { title: '🌱 Stage 1: 思考の覚醒', progress: '会話', target: 10 },
      2: { title: '🌿 Stage 2: 思考の洗練', progress: '振り返り', target: 3 },
      3: { title: '🌟 Stage 3: AI共創マスター', progress: 'マスター', target: 0 }
    };
    return stages[stage] || stages[1];
  };

  if (!progress) {
    return null;
  }

  const stageInfo = getStageInfo(progress.current_stage);
  const currentValue = stageInfo.progress === '会話' 
    ? progress.total_conversations 
    : progress.total_reflections;
  const progressPercent = progress.current_stage === 3 
    ? 100 
    : Math.min((currentValue / stageInfo.target) * 100, 100);

  return (
    <div className="bg-gradient-to-br from-purple-800/50 to-indigo-800/50 rounded-2xl p-6 border border-purple-400/20 mb-6">
      <h3 className="text-purple-200 font-light mb-4 text-center">📊 リアルタイム診断</h3>

      {/* 現在のステージ */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-purple-300">{stageInfo.title}</span>
          <span className="text-purple-200">
            {currentValue} / {stageInfo.target !== 0 ? stageInfo.target : '∞'}
          </span>
        </div>
        <div className="w-full bg-purple-900/50 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-400 to-pink-500 h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 思考の深さスコア */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-purple-900/30 rounded-xl p-3 border border-purple-400/20">
          <div className="text-xs text-purple-300 mb-1">思考の深さ</div>
          <div className="text-2xl font-light text-purple-200">
            {avgDepthScore.toFixed(1)}
          </div>
          <div className="text-xs text-purple-400">/ 10.0</div>
        </div>
        <div className="bg-purple-900/30 rounded-xl p-3 border border-purple-400/20">
          <div className="text-xs text-purple-300 mb-1">会話数</div>
          <div className="text-2xl font-light text-purple-200">
            {progress.total_conversations}
          </div>
        </div>
        <div className="bg-purple-900/30 rounded-xl p-3 border border-purple-400/20">
          <div className="text-xs text-purple-300 mb-1">振り返り</div>
          <div className="text-2xl font-light text-purple-200">
            {progress.total_reflections}
          </div>
        </div>
      </div>

      {/* 診断メッセージ */}
      {progress.current_stage < 3 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-purple-300/70">
            あと {Math.max(0, stageInfo.target - currentValue)} 回の{stageInfo.progress}で
            <br />次ステージに進めます
          </p>
        </div>
      )}
    </div>
  );
}

