import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { YASAN_MONSTERS, INN_MONSTERS } from '../../data/monsters';
import { getFieldDef } from '../../data/fields';
import { getFieldBackground } from '../../assets';
import FieldDetailScreen from './FieldDetailScreen';

// ─────────────────────────────────────────────
// 네비게이션: 전장 목록 → (천산 대맥) → 전장 상세
// ─────────────────────────────────────────────
export default function FieldNavigation() {
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  if (selectedField) {
    return <FieldDetailScreen fieldId={selectedField} onBack={() => setSelectedField(null)} />;
  }
  if (selectedLocation === 'cheonsan') {
    return <CheonsanDetailScreen
      onSelect={setSelectedField}
      onBack={() => setSelectedLocation(null)}
    />;
  }
  return <FieldListScreen onSelectField={setSelectedField} onSelectLocation={setSelectedLocation} />;
}

// ─────────────────────────────────────────────
// 전장 목록 — 중원(中原) / 새외(塞外) 독립 섹션
// ─────────────────────────────────────────────
function FieldListScreen({
  onSelectField,
  onSelectLocation,
}: {
  onSelectField: (id: string) => void;
  onSelectLocation: (loc: string) => void;
}) {
  const fieldUnlocks = useGameStore(s => s.fieldUnlocks);
  const killCounts = useGameStore(s => s.killCounts);
  const tutorialFlags = useGameStore(s => s.tutorialFlags);
  const stats = useGameStore(s => s.stats);

  return (
    <div>
      {/* ── 중원(中原) ── */}
      <div className="card-label" style={{ padding: '0 4px', marginBottom: 8 }}>중원(中原)</div>

      {/* 수련장 */}
      <div className="card field-card" onClick={() => onSelectField('training')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, fontSize: 13 }}>수련장</span>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>무공의 기초를 다지는 곳 · 지정사냥</div>
          </div>
          <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
        </div>
      </div>

      {/* 야산 */}
      {fieldUnlocks.yasan ? (
        <div className="card field-card" onClick={() => onSelectField('yasan')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 500, fontSize: 13 }}>야산</span>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                수련장 너머 펼쳐진 야산 · {YASAN_MONSTERS.filter(m => (killCounts[m.id] ?? 0) > 0).length > 0
                  ? `${YASAN_MONSTERS.filter(m => (killCounts[m.id] ?? 0) > 0).length}종 발견`
                  : '???'}
              </div>
            </div>
            <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
          </div>
        </div>
      ) : (
        <div className="card field-card locked">
          <span style={{ fontWeight: 500, fontSize: 13 }}>🔒 야산</span>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            {tutorialFlags.equippedSword && tutorialFlags.equippedSimbeop
              && (stats.gi + stats.sim + stats.che) < 10
              ? '스탯이 부족합니다. 기운(氣) 탭에서 내공을 키우십시오.'
              : '삼재검법과 삼재심법을 장착해야 해금됩니다'}
          </div>
        </div>
      )}

      {/* 허름한 객잔 */}
      {fieldUnlocks.inn ? (
        <div className="card field-card" onClick={() => onSelectField('inn')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 500, fontSize: 13 }}>허름한 객잔</span>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                산길 끝 허름한 주막 · {INN_MONSTERS.filter(m => (killCounts[m.id] ?? 0) > 0).length > 0
                  ? `${INN_MONSTERS.filter(m => (killCounts[m.id] ?? 0) > 0).length}종 발견`
                  : '???'}
              </div>
            </div>
            <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
          </div>
        </div>
      ) : fieldUnlocks.yasan ? (
        <div className="card field-card locked">
          <span style={{ fontWeight: 500, fontSize: 13 }}>🔒 ???</span>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            아직 발견하지 못한 전장
          </div>
        </div>
      ) : null}

      {/* ── 새외(塞外) — tiger_boss 처치 후 독립 섹션으로 등장 ── */}
      {fieldUnlocks.cheonsan_jangmak && (
        <>
          <div className="card-label" style={{ padding: '0 4px', marginTop: 16, marginBottom: 8 }}>새외(塞外)</div>

          {/* 천산 대맥 — 독립 위치 카드 */}
          <div className="card field-card" onClick={() => onSelectLocation('cheonsan')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 500, fontSize: 13 }}>천산 대맥(天山大脈)</span>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  하늘의 옥좌, 신의 계단 · 3단계
                </div>
              </div>
              <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
            </div>
          </div>
          {/* 미래: 하남성, 길림성 등 추가 시 이 섹션 아래에 카드 추가 */}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 천산 대맥 3단계 선택 화면
// ─────────────────────────────────────────────
const CHEONSAN_STAGES = [
  { id: 'cheonsan_jangmak', name: '백색의 장막' },
  { id: 'cheonsan_godo', name: '백색의 고도' },
  { id: 'cheonsan_simjang', name: '백색의 심장' },
] as const;

function CheonsanDetailScreen({
  onSelect,
  onBack,
}: {
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const fieldUnlocks = useGameStore(s => s.fieldUnlocks);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const killCounts = useGameStore(s => s.killCounts);
  const cheonsanBg = getFieldBackground('cheonsan');

  return (
    <div>
      <div className="field-detail-banner" style={cheonsanBg ? { backgroundImage: `url(${cheonsanBg})` } : {}}>
        <div className="field-detail-banner-overlay">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="field-back-btn" onClick={onBack}>←</button>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>천산 대맥(天山大脈)</div>
              <div style={{ fontSize: 11, opacity: 0.7, fontStyle: 'italic' }}>
                하늘의 옥좌, 신의 계단. 새외와 천축으로 향하는 위대한 여정, 그 시작.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {CHEONSAN_STAGES.map((stage, i) => {
          const unlocked = fieldUnlocks[stage.id];
          const fieldDef = getFieldDef(stage.id);
          const cleared = fieldDef?.boss
            ? (bossKillCounts[fieldDef.boss] ?? 0) > 0
            : fieldDef?.monsters.length
              ? (killCounts[fieldDef.monsters[fieldDef.monsters.length - 1]] ?? 0) > 0
              : false;

          if (unlocked) {
            return (
              <div
                key={stage.id}
                className="stat-row"
                style={{ cursor: 'pointer', padding: '8px 0' }}
                onClick={() => onSelect(stage.id)}
              >
                <div>
                  <div style={{ fontSize: 13 }}>{i + 1}단계. {stage.name}</div>
                  {cleared && <span style={{ fontSize: 11, color: 'var(--green)' }}>답파 완료</span>}
                </div>
                <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
              </div>
            );
          }
          return (
            <div key={stage.id} className="stat-row" style={{ opacity: 0.3, padding: '8px 0' }}>
              <div>
                <div style={{ fontSize: 13 }}>{i + 1}단계. ???</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>이전 단계 답파 필요</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
