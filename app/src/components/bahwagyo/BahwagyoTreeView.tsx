// components/bahwagyo/BahwagyoTreeView.tsx
// 단계별 노드 배치 + 블러 영역 + 연결선

import type { BranchId, SkillNodeDef, NodeState } from './bahwagyoTypes';
import { ALL_NODES, getNodeMax, getCostResource, getLevelUpCost, SWORD_ULT_UNLOCK_THRESHOLD } from './bahwagyoData';
import BahwagyoNodeBox from './BahwagyoNodeBox';

interface Props {
  branch: Exclude<BranchId, 'mystery'>;
  nodeLevels: Record<string, number>;
  unlockedTiers: Record<string, boolean>;
  expandLevel: 0 | 1 | 2;
  resources: { ember: number; flame: number; divine: number };
  scrolls: Record<string, number>;
  onNodeClick: (nodeId: string) => void;
  onLockedClick: (branch: Exclude<BranchId, 'mystery'>, tier: 2 | 3) => void;
}

function getNodeState(
  node: SkillNodeDef,
  level: number,
  nodeLevels: Record<string, number>,
  expandLevel: 0 | 1 | 2,
  resources: { ember: number; flame: number; divine: number },
  scrolls: Record<string, number>,
): NodeState {
  const max = getNodeMax(node, expandLevel);
  if (level >= max) return 'maxed';

  // 흐림: 선행 조건 미충족
  if (node.requiresRoot) {
    const rootId = node.branch === 'sword' ? 'sword-main' : `${node.branch}-t1-1`;
    const rootLevel = nodeLevels[rootId] ?? 0;
    // sword-ult: 검화합일(劍火合一) 특성 — 성화검법 5Lv에서 절초 해금 (sword-main >= 5)
    const rootThreshold = node.id === 'sword-ult' ? SWORD_ULT_UNLOCK_THRESHOLD : 1;
    if (rootLevel < rootThreshold) return 'dimmed';
  }

  // 자원 부족
  const res = getCostResource(node, level);
  const cost = getLevelUpCost(node, level);
  if (resources[res] < cost) {
    const scrollKey = `${node.branch}-t${node.tier}`;
    const scrollCount = scrolls[scrollKey] ?? 0;
    // 정수 부족해도 비급이 있으면 normal
    // (버튼 비활성은 모달에서 처리)
    // 여기서는 둘 다 없을 때만 no_resource
    if (scrollCount <= 0) return 'no_resource';
  }

  return 'normal';
}

// 플레이스홀더 블러 노드 (흐릿한 박스들)
function BlurPlaceholder({ tier }: { tier: 2 | 3 }) {
  return (
    <div className="fire-tier2-row">
      {[0, 1].map(i => (
        <div key={i} className={`fire-node`}>
          <div className={`fire-node-box tier${tier}`} style={{ opacity: 0.5 }}>
            <div className="fire-node-icon">？</div>
            <div className="fire-node-level">0/—</div>
          </div>
          <div className="fire-node-name" style={{ opacity: 0.3 }}>???</div>
        </div>
      ))}
    </div>
  );
}

// 잠긴 단계 블록
function LockedBlock({
  tier,
  branch,
  onLockedClick,
}: {
  tier: 2 | 3;
  branch: Exclude<BranchId, 'mystery'>;
  onLockedClick: (branch: Exclude<BranchId, 'mystery'>, tier: 2 | 3) => void;
}) {
  return (
    <div
      className="fire-locked-area"
      onClick={() => onLockedClick(branch, tier)}
    >
      <div className="fire-locked-blur">
        <BlurPlaceholder tier={tier} />
      </div>
      <div className="fire-locked-overlay">
        <div className="fire-locked-icon">🔒</div>
        <div className="fire-locked-overlay-text">
          강적이 품은 비밀,<br />혹은 끊임없는 수련
        </div>
      </div>
    </div>
  );
}

function OuterBranchView({
  nodeLevels,
  unlockedTiers,
  expandLevel,
  resources,
  scrolls,
  onNodeClick,
  onLockedClick,
}: Pick<Props, 'nodeLevels' | 'unlockedTiers' | 'expandLevel' | 'resources' | 'scrolls' | 'onNodeClick' | 'onLockedClick'>) {
  const tier1Nodes = ALL_NODES.filter(n => n.branch === 'outer' && n.tier === 1);
  const tier2Nodes = ALL_NODES.filter(n => n.branch === 'outer' && n.tier === 2);
  const tier3Nodes = ALL_NODES.filter(n => n.branch === 'outer' && n.tier === 3);
  const tier2Unlocked = unlockedTiers['outer-2'] ?? false;
  const tier3Unlocked = unlockedTiers['outer-3'] ?? false;

  function renderNode(node: SkillNodeDef) {
    const level = nodeLevels[node.id] ?? 0;
    const state = getNodeState(node, level, nodeLevels, expandLevel, resources, scrolls);
    return (
      <BahwagyoNodeBox
        key={node.id}
        node={node}
        level={level}
        expandLevel={expandLevel}
        nodeState={state}
        onClick={() => onNodeClick(node.id)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── 1단계: 보법 + 방어법 나란히 ── */}
      <div className="fire-tier-section">
        <div className="fire-tier-label">1 단계</div>
        <div className="fire-tier2-row">
          {tier1Nodes.map(n => renderNode(n))}
        </div>
      </div>

      <div className="fire-tier-divider" />

      {/* ── 2단계 ── */}
      {tier2Unlocked ? (
        <div className="fire-tier-section">
          <div className="fire-tier-label">2 단계</div>
          <div className="fire-tier2-row">
            {tier2Nodes.map(n => renderNode(n))}
          </div>
        </div>
      ) : (
        <LockedBlock tier={2} branch="outer" onLockedClick={onLockedClick} />
      )}

      <div className="fire-tier-divider" />

      {/* ── 3단계 ── */}
      {tier3Unlocked ? (
        <div className="fire-tier-section">
          <div className="fire-tier-label">3 단계</div>
          <div className="fire-tier2-row">
            {tier3Nodes.map(n => renderNode(n))}
          </div>
        </div>
      ) : (
        <LockedBlock tier={3} branch="outer" onLockedClick={onLockedClick} />
      )}
    </div>
  );
}

export default function BahwagyoTreeView({
  branch,
  nodeLevels,
  unlockedTiers,
  expandLevel,
  resources,
  scrolls,
  onNodeClick,
  onLockedClick,
}: Props) {
  // outer 브랜치: 독립 무공 병렬 노출 (tier 구조 없음)
  if (branch === 'outer') {
    return (
      <OuterBranchView
        nodeLevels={nodeLevels}
        unlockedTiers={unlockedTiers}
        expandLevel={expandLevel}
        resources={resources}
        scrolls={scrolls}
        onNodeClick={onNodeClick}
        onLockedClick={onLockedClick}
      />
    );
  }

  // sword / mind 공통 경로
  const branchNodes = ALL_NODES.filter(n => n.branch === branch);
  const tier1Nodes = branchNodes.filter(n => n.tier === 1);
  const tier2Nodes = branchNodes.filter(n => n.tier === 2);
  const tier3Nodes = branchNodes.filter(n => n.tier === 3);

  const rootNode = tier1Nodes.find(n => n.isRoot)!;
  const subNodes = tier1Nodes.filter(n => !n.isRoot);

  const tier2Unlocked = unlockedTiers[`${branch}-2`] ?? false;
  const tier3Unlocked = unlockedTiers[`${branch}-3`] ?? false;

  function renderNode(node: SkillNodeDef) {
    const level = nodeLevels[node.id] ?? 0;
    const state = getNodeState(node, level, nodeLevels, expandLevel, resources, scrolls);
    return (
      <BahwagyoNodeBox
        key={node.id}
        node={node}
        level={level}
        expandLevel={expandLevel}
        nodeState={state}
        onClick={() => onNodeClick(node.id)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── 1단계 ── */}
      <div className="fire-tier-section">
        <div className="fire-tier-label">1 단계</div>

        {/* 루트 노드 (중앙) */}
        <div className="fire-tier-root-row">
          {renderNode(rootNode)}
        </div>

        {/* 루트→하위 연결선 */}
        <div className="fire-tree-connector">
          <div className="fire-connector-line" />
          <div className="fire-connector-branch" />
        </div>

        {/* 하위 3노드 */}
        <div className="fire-tier1-sub-row">
          {subNodes.map(n => renderNode(n))}
        </div>
      </div>

      {/* 1/2단계 구분선 */}
      <div className="fire-tier-divider" />

      {/* ── 2단계 ── */}
      {tier2Unlocked ? (
        <div className="fire-tier-section">
          <div className="fire-tier-label">2 단계</div>
          <div className="fire-tier2-row">
            {tier2Nodes.map(n => renderNode(n))}
          </div>
        </div>
      ) : (
        <LockedBlock tier={2} branch={branch} onLockedClick={onLockedClick} />
      )}

      {/* 2/3단계 구분선 */}
      <div className="fire-tier-divider" />

      {/* ── 3단계 ── */}
      {tier3Unlocked ? (
        <div className="fire-tier-section">
          <div className="fire-tier-label">3 단계</div>
          <div className="fire-tier2-row">
            {tier3Nodes.map(n => renderNode(n))}
          </div>
        </div>
      ) : (
        <LockedBlock tier={3} branch={branch} onLockedClick={onLockedClick} />
      )}
    </div>
  );
}
