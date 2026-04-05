import { getArtGradeInfo } from '../../store/gameStore';

export default function ArtGradeBar({ artId, artGradeExp }: {
  artId: string;
  artGradeExp: Record<string, number>;
}) {
  const cumExp = artGradeExp[artId] ?? 0;
  const { starIndex, progress } = getArtGradeInfo(cumExp);
  const isMax = starIndex >= 60;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          {isMax ? '최고경지' : '다음 등급까지'}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          {isMax ? '' : `${(progress * 100).toFixed(1)}%`}
        </span>
      </div>
      <div className="hp-bar-container">
        <div className="hp-bar-fill" style={{ width: `${progress * 100}%`, background: 'var(--gold)', opacity: 0.7 }} />
      </div>
    </div>
  );
}
