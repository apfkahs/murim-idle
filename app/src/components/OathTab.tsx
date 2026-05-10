/**
 * OathTab — 맹세(盟誓) 탭
 * 스펙: docs/맹세_시스템/맹세_시스템_스펙.md § 7
 * 구현 단계 S5
 */
import { useGameStore } from '../store/gameStore';
import {
  OATHS, type OathCategory, type OathDef,
  calcOathBoost, calcOathTier, OATH_TIER_LABELS, calcOathFlatBonuses,
  getOathsByCategory,
} from '../data/oaths';
import { getFieldDef } from '../data/fields';
import { getMonsterDef } from '../data/monsters';

// ── 카테고리 메타 ─────────────────────────────────────────────────────────────

const CATEGORY_ORDER: OathCategory[] = ['maxQi', 'maxHp', 'output', 'incoming'];

const CATEGORY_LABELS: Record<string, string> = {
  maxQi: '최대 내력',
  maxHp: '최대 체력',
  output: '출력 데미지',
  incoming: '받는 피해',
};

const CATEGORY_DESC: Record<string, string> = {
  maxQi: '내력 상한을 줄인다',
  maxHp: '체력 상한을 줄인다',
  output: '출력 데미지를 줄인다',
  incoming: '받는 피해를 늘린다',
};

// ── OathCard ──────────────────────────────────────────────────────────────────

interface OathCardProps {
  oath: OathDef;
  isActive: boolean;
  isForbid: boolean;
  isOtherActive: boolean;
  canToggle: boolean;
  onToggle: () => void;
}

function OathCard({ oath, isActive, isForbid, isOtherActive, canToggle, onToggle }: OathCardProps) {
  const cls = [
    'oath-card',
    isActive ? 'oath-card--active' : '',
    isForbid ? 'oath-card--forbid' : '',
    isOtherActive && !isActive ? 'oath-card--dim' : '',
  ].filter(Boolean).join(' ');

  const btnDisabled = !canToggle || isForbid;
  const btnTitle = isForbid
    ? '이 전장에서 무효화된 맹세입니다'
    : !canToggle
    ? '마을에서만 맹세를 변경할 수 있습니다'
    : '';

  return (
    <div className={cls}>
      <div className="oath-card-body">
        <div className="oath-card-title-row">
          <span className="oath-card-radio">{isActive ? '●' : '○'}</span>
          <span className="oath-card-name">{oath.name}</span>
          <span className="oath-card-hanja">{oath.nameHanja}</span>
          <span className="oath-card-weight">W{oath.weight}</span>
        </div>
        <div className="oath-card-desc">{oath.description}</div>
        <div className="oath-card-flavor">{oath.flavor}</div>
        {isForbid && (
          <div className="oath-card-forbid-label">이 전장에서 무효</div>
        )}
      </div>
      <button
        className={`oath-card-btn${isActive ? ' oath-card-btn--active' : ''}`}
        onClick={onToggle}
        disabled={btnDisabled}
        title={btnTitle}
      >
        {isActive ? '해제' : '서약'}
      </button>
    </div>
  );
}

// ── OathTab ───────────────────────────────────────────────────────────────────

export default function OathTab() {
  const oathSystem = useGameStore(s => s.oathSystem);
  const currentField = useGameStore(s => s.currentField);
  const toggleOath = useGameStore(s => s.toggleOath);

  const { activeOathIds, lockedAt } = oathSystem;
  const isInTown = currentField == null;
  const isLocked = lockedAt !== null;
  const canToggle = isInTown;

  // 요약 수치
  const weightSum = activeOathIds.reduce((sum, id) => sum + (OATHS[id]?.weight ?? 0), 0);
  const { profMult, dropMult } = calcOathBoost(weightSum);
  const tier = calcOathTier(weightSum);
  const flatBonuses = calcOathFlatBonuses(weightSum);
  const profBoostPct = Math.round((profMult - 1) * 100);
  const dropBoostPct = Math.round((dropMult - 1) * 100);
  const extraDropBoostPct = Math.max(0, dropBoostPct - 140);

  // forbid (마을에선 표시 안 함)
  const fieldDef = currentField ? getFieldDef(currentField) : null;
  const forbidInField: string[] = (!isInTown && fieldDef?.forbidOathIds) ? fieldDef.forbidOathIds : [];

  // 배너용 정보
  const lockedFieldName = lockedAt ? (getFieldDef(lockedAt.fieldId)?.name ?? lockedAt.fieldId) : '';
  const fieldBossName = (() => {
    if (!currentField || isLocked || !fieldDef?.boss) return '';
    return getMonsterDef(fieldDef.boss)?.name ?? fieldDef.boss;
  })();
  const fieldHasBoss = !!fieldDef?.boss;

  return (
    <div className="oath-tab">

      {/* ── 상태 배너 (마을에선 없음) ───────────────────────────────────────── */}
      {!isInTown && (
        <div className={`oath-banner ${isLocked ? 'oath-banner--locked' : 'oath-banner--disabled'}`}>
          {isLocked ? (
            <span>
              <strong className="oath-banner-icon">🔒</strong>{' '}
              <strong>맹세 효과 적용 중</strong> — <strong>{lockedFieldName}</strong> 답파 중에는 변경할 수 없습니다. 마을로 귀환하면 다시 변경할 수 있습니다.
            </span>
          ) : (
            <span>
              <strong className="oath-banner-icon">⚠</strong>{' '}
              {fieldHasBoss ? (
                <>
                  <strong>맹세 비활성</strong> — <strong>{fieldBossName}</strong>을(를) 처치하지 않은 전장입니다. 설정한 맹세는 보존되며, 해금된 다른 전장에서 자동 발동됩니다.
                </>
              ) : (
                <>
                  <strong>맹세 비활성</strong> — 이 전장은 맹세 시스템을 사용할 수 없습니다.
                </>
              )}
            </span>
          )}
        </div>
      )}

      {/* ── 요약 패널 ─────────────────────────────────────────────────────── */}
      <div className="oath-summary">
        <div className="oath-summary-row">
          <span className="oath-summary-count">맹세 {activeOathIds.length}개</span>
          <span className="oath-summary-sep">·</span>
          <span>가중치 합 <strong>{weightSum}</strong></span>
          {weightSum > 0 && (
            <>
              <span className="oath-summary-sep">·</span>
              <span className="oath-summary-tier">{OATH_TIER_LABELS[tier]}</span>
            </>
          )}
        </div>
        {weightSum > 0 ? (
          <div className="oath-summary-boost">
            <span>숙련도 +{profBoostPct}%</span>
            <span className="oath-summary-sep">·</span>
            <span>드랍률 +{dropBoostPct}%</span>
            {flatBonuses.extraDropTableUnlocked && (
              <>
                <span className="oath-summary-sep">·</span>
                <span>추가 드랍 해금{extraDropBoostPct > 0 ? ` (+${extraDropBoostPct}%)` : ''}</span>
              </>
            )}
            {flatBonuses.monsterRankBonus > 0 && (
              <>
                <span className="oath-summary-sep">·</span>
                <span>숙련 등급 +{flatBonuses.monsterRankBonus}</span>
              </>
            )}
          </div>
        ) : (
          <div className="oath-summary-empty">
            활성 맹세 없음 — 서약하면 부스트가 발동합니다
          </div>
        )}
        {flatBonuses.extraDropTableUnlocked && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            추가 드랍 아이템은 무모한 도전(가중치 10) 이상부터 드랍률 보너스가 적용됩니다.
            적용 배율 = 전체 드랍률 보너스 − 140%
          </div>
        )}
      </div>

      {/* ── 카테고리 섹션 ─────────────────────────────────────────────────── */}
      {CATEGORY_ORDER.map(cat => {
        const oaths = getOathsByCategory(cat).sort((a, b) => a.weight - b.weight);
        const activeInGroup = oaths.find(o => activeOathIds.includes(o.id));

        return (
          <section key={cat} className="oath-category">
            <div className="oath-category-header">
              <span className="oath-category-name">{CATEGORY_LABELS[cat]}</span>
              <span className="oath-category-desc">{CATEGORY_DESC[cat]}</span>
              {activeInGroup && (
                <span className="oath-category-badge">{activeInGroup.name} 활성</span>
              )}
            </div>
            <div className="oath-cards">
              {oaths.map(oath => (
                <OathCard
                  key={oath.id}
                  oath={oath}
                  isActive={activeOathIds.includes(oath.id)}
                  isForbid={forbidInField.includes(oath.id)}
                  isOtherActive={!!(activeInGroup && activeInGroup.id !== oath.id)}
                  canToggle={canToggle}
                  onToggle={() => toggleOath(oath.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
