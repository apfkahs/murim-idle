// components/bahwagyo/BahwagyoMysteryNode.tsx
// ??? 탭 하단 어둠의 노드 + 편 상태 + 서사

interface Props {
  fragments: { first: boolean; second: boolean };
}

export default function BahwagyoMysteryNode({ fragments }: Props) {
  return (
    <div className="fire-mystery-node">
      <div className="fire-mystery-node-icon">❓</div>
      <div className="fire-mystery-title">[???]</div>
      <div className="fire-mystery-subtitle">아직 모습을 드러내지 않은 비급...</div>

      <div className="fire-mystery-fragments">
        {([
          { key: 'first', label: '첫 번째 편', acquired: fragments.first },
          { key: 'second', label: '두 번째 편', acquired: fragments.second },
        ] as const).map(({ key, label, acquired }) => (
          <div key={key} className="fire-mystery-fragment">
            <span className={acquired ? 'check' : 'cross'}>
              {acquired ? '✓' : '✗'}
            </span>
            <span>{label} — {acquired ? '획득' : '미획득'}</span>
          </div>
        ))}
      </div>

      <div className="fire-mystery-narrative">
        언젠가 모든 비밀이 밝혀지면<br />
        신화가 모습을 드러내리라.
      </div>
    </div>
  );
}
