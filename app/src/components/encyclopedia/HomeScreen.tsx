export default function HomeScreen({ onMonsters, onAchievements, onItems, onEquipment }: {
  onMonsters: () => void;
  onAchievements: () => void;
  onItems: () => void;
  onEquipment: () => void;
}) {
  return (
    <div>
      <div className="card-label" style={{ padding: '0 4px', marginBottom: 8 }}>도감</div>
      <div className="card field-card" onClick={onMonsters}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>몬스터 도감</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>처치한 몬스터의 정보를 기록</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>
      <div className="card field-card" onClick={onItems}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>물건 도감</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>전장별 드롭 재료와 제작법</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>
      <div className="card field-card" onClick={onEquipment}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>장비 도감</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>획득·제작한 장비 목록</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>
      <div className="card field-card" onClick={onAchievements}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>업적</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>강호에서 이룬 발자취</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>
    </div>
  );
}
