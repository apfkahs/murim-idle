// components/bahwagyo/BahwagyoNodeBox.tsx
// 개별 노드 박스 — 5가지 상태 시각화

import type { SkillNodeDef, NodeState } from './bahwagyoTypes';
import { getNodeMax, getAbbrev } from './bahwagyoData';

interface Props {
  node: SkillNodeDef;
  level: number;
  expandLevel: 0 | 1 | 2;
  nodeState: NodeState;
  onClick: () => void;
}

export default function BahwagyoNodeBox({ node, level, expandLevel, nodeState, onClick }: Props) {
  const max = getNodeMax(node, expandLevel);
  const tierClass = `tier${node.tier}`;

  if (node.placeholder) {
    return (
      <div className="fire-node dimmed" onClick={onClick} title={node.description}>
        <div className={`fire-node-box ${tierClass}`} style={{ opacity: 0.45 }} data-node-id={node.id}>
          <div className="fire-node-icon">?</div>
          <div className="fire-node-level">—</div>
        </div>
        <div className="fire-node-name">{node.name}</div>
      </div>
    );
  }

  const stateClass =
    nodeState === 'dimmed' ? 'dimmed' :
    nodeState === 'maxed' ? 'maxed' :
    nodeState === 'no_resource' ? 'no-resource' : '';

  return (
    <div className={`fire-node ${stateClass}`} onClick={onClick} title={node.name}>
      <div className={`fire-node-box ${tierClass}`} data-node-id={node.id}>
        <div className="fire-node-icon">{getAbbrev(node.name)}</div>
        <div className="fire-node-level">{level}/{max}</div>
      </div>
      <div className="fire-node-name">{node.name}</div>
    </div>
  );
}
