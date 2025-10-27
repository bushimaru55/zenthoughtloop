'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

const nodeColors = {
  user: 'from-blue-400 to-cyan-500',
  ai: 'from-purple-400 to-pink-500',
};

export default function ThoughtTree({ conversations }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 会話データからツリー構造を生成
  useMemo(() => {
    if (!conversations || conversations.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes = [];
    const newEdges = [];
    let xPosition = 0;

    conversations.forEach((conv, convIndex) => {
      // 会話のルートノード
      const rootId = `conv-${conv.id}`;
      newNodes.push({
        id: rootId,
        type: 'default',
        data: {
          label: (
            <div className="px-4 py-2">
              <div className="text-xs text-purple-400">会話 #{conv.id}</div>
              <div className="text-xs text-purple-300 mt-1">
                {new Date(conv.created_at).toLocaleDateString('ja-JP')}
              </div>
            </div>
          ),
        },
        position: { x: xPosition, y: 0 },
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
        },
      });

      // 会話ごとのノード
      xPosition += 300;
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [conversations, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-purple-300/50">
        <div className="text-center">
          <div className="text-5xl mb-4">🌳</div>
          <p className="text-lg font-light">会話を始めて思考のツリーを作りましょう</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 bg-purple-900/30 rounded-2xl border border-purple-400/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#8b5cf6" gap={16} />
        <Controls 
          style={{
            button: {
              backgroundColor: 'rgba(139, 92, 246, 0.3)',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              color: '#e9d5ff',
            }
          }}
        />
        <MiniMap 
          nodeColor={(node) => {
            if (node.style?.background) return '#8b5cf6';
            return '#6366f1';
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
          style={{
            backgroundColor: 'rgba(30, 27, 75, 0.8)',
          }}
        />
      </ReactFlow>
    </div>
  );
}

