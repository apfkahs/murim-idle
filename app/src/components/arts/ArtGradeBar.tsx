import { getArtGradeInfo, getArtGradeInfoFromTable, getGradeTableForArt } from '../../store/gameStore';
import { getArtDef } from '../../data/arts';

export default function ArtGradeBar({ artId, artGradeExp }: {
  artId: string;
  artGradeExp: Record<string, number>;
}) {
  const cumExp = artGradeExp[artId] ?? 0;
  const artDef = getArtDef(artId);
  const customTable = artDef && artDef.growth.gradeMaxStars ? getGradeTableForArt(artDef) : undefined;
  const { starIndex, progress } = customTable
    ? getArtGradeInfoFromTable(cumExp, customTable)
    : getArtGradeInfo(cumExp);
  const isMax = customTable ? starIndex >= customTable.length : starIndex >= 60;
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
