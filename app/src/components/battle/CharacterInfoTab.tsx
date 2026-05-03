import {
  useGameStore,
  calcStamina, calcTierMultiplier, calcCritRate,
  calcCritDamageMultiplier,
  calcDodge, calcDmgReduction, gatherEquipmentStats,
  getArtCurrentGrade, getArtDamageMultiplier,
} from '../../store/gameStore';
import { BALANCE_PARAMS as B } from '../../data/balance';
import { getArtDef } from '../../data/arts';
import { getEquipmentDef, type EquipSlot } from '../../data/equipment';
import { getActiveProfile } from '../../assets';
import { getTierDef } from '../../data/tiers';
import { formatPassiveEffectSummary, GRADE_KOREAN } from '../arts/artsUtils';
import { formatNumber } from '../../utils/format';

const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: '무기',
  armor: '방어구',
  gloves: '장갑',
  boots: '신발',
};
const SLOT_ORDER: EquipSlot[] = ['weapon', 'armor', 'gloves', 'boots'];

const GRADE_LABEL: Record<string, string> = {
  common: '보통',
  refined: '정품',
  superior: '명품',
};

/**
 * 로그 영역 "내 정보" 탭.
 * 실제 게임에 있는 값만 표기 — 명중·관통·이속·오행·원보·문파·타이틀 등은 제외.
 */
export default function CharacterInfoTab() {
  const hp = useGameStore(s => s.hp);
  const maxHp = useGameStore(s => s.maxHp);
  const stats = useGameStore(s => s.stats);
  const tier = useGameStore(s => s.tier);
  const equippedArts = useGameStore(s => s.equippedArts);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const activeMasteries = useGameStore(s => s.activeMasteries);
  const artGradeExp = useGameStore(s => s.artGradeExp);
  const equipment = useGameStore(s => s.equipment);
  const bahwagyoNodeLevels = useGameStore(s => s.bahwagyo.nodeLevels);
  const getAttackInterval = useGameStore(s => s.getAttackInterval);
  const state = useGameStore.getState();

  const tierMult = calcTierMultiplier(tier);
  const maxStamina = calcStamina(stats.sim, tierMult);
  const atkInterval = getAttackInterval();
  const equipStats = gatherEquipmentStats(state);
  const equipAtk = equipStats.bonusAtk ?? 0;
  const critRate = Math.round(
    Math.min(calcCritRate(state) + (equipStats.bonusCritRate ?? 0), B.CRIT_RATE_CAP) * 100
  );
  const critDmg = Math.round(calcCritDamageMultiplier(state));
  const dodge = Math.round(
    Math.min(calcDodge(state) + (equipStats.bonusDodge ?? 0) / 100, B.DODGE_CAP) * 100
  );
  const dmgRed = Math.round(calcDmgReduction(state) + (equipStats.bonusDmgReduction ?? 0));

  const selectedProfileKey = useGameStore(s => s.selectedProfileKey);
  const customProfileUrl = useGameStore(s => s.customProfileUrl);
  const player = getActiveProfile(selectedProfileKey, customProfileUrl, tier);
  const tierDef = getTierDef(tier);

  return (
    <div className="char-grid">
      <div className="char-header">
        <div className="char-avatar">
          {player.url ? <img src={player.url} alt="캐릭터" /> : <span>{player.emoji}</span>}
        </div>
        <div>
          <div className="char-name">
            {tierDef.name}
            <span className="char-tier">경지 {tier + 1}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            체력 {Math.floor(hp)} / {maxHp}
          </div>
        </div>
      </div>

      <div>
        <div className="stat-section-title">◈ 기본 스탯</div>
        <div className="stat-pair">
          <div><span className="k">체력</span><span className="v">{formatNumber(maxHp)}</span></div>
          <div><span className="k">내력</span><span className="v">{maxStamina > 0 ? formatNumber(maxStamina) : '-'}</span></div>
          <div><span className="k">공격속도</span><span className="v">{atkInterval.toFixed(1)}초</span></div>
          <div><span className="k">장비 공격력</span><span className="v">+{formatNumber(equipAtk)}</span></div>
          <div><span className="k">치명타율</span><span className="v warn">{critRate}%</span></div>
          <div><span className="k">치명타 피해</span><span className="v warn">+{critDmg}%</span></div>
          <div><span className="k">회피</span><span className="v">{dodge}%</span></div>
          <div><span className="k">피해 감소</span><span className="v">{dmgRed}%</span></div>
          <div><span className="k">기(氣)</span><span className="v">{stats.gi}</span></div>
          <div><span className="k">심(心)</span><span className="v">{stats.sim}</span></div>
          <div><span className="k">체(體)</span><span className="v">{stats.che}</span></div>
        </div>
      </div>

      <div>
        <div className="stat-section-title">◈ 장착 무공</div>
        <div className="art-grid">
          {equippedSimbeop ? (() => {
            const def = getArtDef(equippedSimbeop);
            if (!def) return null;
            const grade = getArtCurrentGrade(equippedSimbeop, artGradeExp);
            const mult = getArtDamageMultiplier(def, artGradeExp[equippedSimbeop] ?? 0, activeMasteries[equippedSimbeop] ?? []);
            const summary = formatPassiveEffectSummary(def, activeMasteries[equippedSimbeop] ?? [], mult, bahwagyoNodeLevels);
            return (
              <div className="art-card" key={equippedSimbeop}>
                <div className="art-slot">심법</div>
                <div className="art-name">{def.name}</div>
                <div className="art-meta">{GRADE_KOREAN[grade - 1] ?? ''} {summary}</div>
              </div>
            );
          })() : (
            <div className="art-card">
              <div className="art-slot">심법</div>
              <div className="art-name empty">비어 있음</div>
              <div className="art-meta">미장착</div>
            </div>
          )}
          {equippedArts.length === 0 && (
            <div className="art-card">
              <div className="art-slot">무공</div>
              <div className="art-name empty">장착된 무공 없음</div>
              <div className="art-meta">미장착</div>
            </div>
          )}
          {equippedArts.map((artId, i) => {
            const def = getArtDef(artId);
            if (!def) return null;
            const grade = getArtCurrentGrade(artId, artGradeExp);
            const mult = getArtDamageMultiplier(def, artGradeExp[artId] ?? 0, activeMasteries[artId] ?? []);
            const summary = formatPassiveEffectSummary(def, activeMasteries[artId] ?? [], mult, bahwagyoNodeLevels);
            return (
              <div className="art-card" key={artId}>
                <div className="art-slot">무공 {i + 1}</div>
                <div className="art-name">{def.name}</div>
                <div className="art-meta">
                  {GRADE_KOREAN[grade - 1] ?? ''}{summary ? ` · ${summary}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="stat-section-title">◈ 장착 장비</div>
        <div className="equip-grid">
          {SLOT_ORDER.map(slot => {
            const inst = equipment[slot];
            if (!inst) {
              return (
                <div className="equip" key={slot}>
                  <div className="equip-slot">{SLOT_LABELS[slot]}</div>
                  <div className="equip-name empty">비어 있음</div>
                  <div className="equip-grade common">—</div>
                </div>
              );
            }
            const def = getEquipmentDef(inst.defId);
            const rarity = def?.rarity ?? 'common';
            return (
              <div className="equip" key={slot}>
                <div className="equip-slot">{SLOT_LABELS[slot]}</div>
                <div className="equip-name">{def?.name ?? inst.defId}</div>
                <div className={`equip-grade ${rarity}`}>{GRADE_LABEL[rarity] ?? rarity}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
