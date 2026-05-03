import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { FIELDS } from '../../data/fields';
import { getMonsterDef, getGradeName, BOSS_PATTERNS } from '../../data/monsters';
import { ARTS } from '../../data/arts';
import { EQUIPMENT } from '../../data/equipment';
import { MATERIALS } from '../../data/materials';
import { getEnemyImage, getEnemyEmoji } from '../../assets/index';
import { ALL_MONSTERS, getDocRevealLevel, getNextThreshold } from './encyclopediaUtils';

// ── FieldListScreen ─────────────────────────────────────────────────────────

export function FieldListScreen({ onBack, onSelect }: {
  onBack: () => void;
  onSelect: (fieldId: string) => void;
}) {
  const killCounts = useGameStore(s => s.killCounts);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const fieldUnlocks = useGameStore(s => s.fieldUnlocks);

  const unlockedFields = FIELDS.filter(f => {
    if (f.id === 'training') return true;
    return fieldUnlocks[f.id] ?? false;
  });

  return (
    <div>
      <div className="field-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="field-back-btn" onClick={onBack}>←</button>
          <div style={{ fontWeight: 500, fontSize: 14 }}>전장 선택</div>
        </div>
      </div>

      {unlockedFields.map(field => {
        const allIds = [...field.monsters, ...(field.boss ? [field.boss] : [])];
        const encountered = allIds.filter(id => (killCounts[id] ?? 0) + (bossKillCounts[id] ?? 0) >= 1).length;
        const hiddenEncountered = field.hiddenMonsters.filter(id => (killCounts[id] ?? 0) >= 1).length;
        const totalVisible = allIds.length + hiddenEncountered;
        const encTotal = encountered + hiddenEncountered;

        return (
          <div
            key={field.id}
            className="card field-card"
            onClick={() => onSelect(field.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{field.name}</span>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {encTotal} / {totalVisible} 조우
                </div>
              </div>
              <span style={{ fontSize: 14, opacity: 0.3 }}>→</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MonsterListScreen ───────────────────────────────────────────────────────

export function MonsterListScreen({ fieldId, onBack, onSelect }: {
  fieldId: string;
  onBack: () => void;
  onSelect: (monsterId: string) => void;
}) {
  const killCounts = useGameStore(s => s.killCounts);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);

  const field = FIELDS.find(f => f.id === fieldId);
  if (!field) return null;

  const allIds = [
    ...field.monsters,
    ...field.hiddenMonsters,
    ...(field.boss ? [field.boss] : []),
  ];

  return (
    <div>
      <div className="field-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="field-back-btn" onClick={onBack}>←</button>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{field.name}</div>
        </div>
      </div>

      <div className="card">
        {allIds.map((id, idx) => {
          const mon = getMonsterDef(id);
          if (!mon) return null;
          const kc = mon.isBoss ? (bossKillCounts[id] ?? 0) : (killCounts[id] ?? 0);

          // 히든 몬스터 미조우 시 미표시
          if (mon.isHidden && kc === 0) return null;

          const reveal = getDocRevealLevel(kc, mon);
          const isFirst = idx === 0;

          return (
            <div
              key={id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderTop: isFirst ? 'none' : '1px solid rgba(255,255,255,0.05)',
                cursor: reveal >= 1 ? 'pointer' : 'default',
                opacity: reveal >= 1 ? 1 : 0.5,
              }}
              onClick={() => reveal >= 1 && onSelect(id)}
            >
              <span style={{ fontSize: 13 }}>
                {reveal >= 1 ? mon.name : '???'}
                {mon.isBoss && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', borderRadius: 3, padding: '1px 4px' }}>보스</span>
                )}
                {mon.isHidden && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-dim)', border: '1px solid var(--border-card)', borderRadius: 3, padding: '1px 4px' }}>은신</span>
                )}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {reveal >= 1 ? `${kc}마리` : '미조우'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SKILL_TYPE_LABELS: Record<string, string> = {
  stun: '기절',
  rage_attack: '분노 강타',
  replace_normal: '특수 패시브',
  charged_attack: '차지 공격',
  dot_apply: '독/지속피해',
  double_hit: '이중 타격',
  freeze_attack: '고정 피해',
  multi_hit: '다중 타격',
  passive_dodge: '회피 패시브',
  passive_crit: '치명 패시브',
  passive_dmg_absorb: '피해 흡수',
  potion_heal: '자가 회복',
  atk_buff_bypass: '공격력 강화',
  stack_smash: '누적 강타',
  passive_bleed: '출혈 패시브',
  rapid_fire: '속사',
  timed_buff: '시한 버프',
  multi_dot: '다중 독',
  condition_strike: '조건부 강타',
  berserker_scale: '광전사',
  last_stand: '최후의 발악',
  cheolbyeok: '철벽 방어',
  revenge: '복수심',
  phase_sequence: '페이즈 전환',
  conditional_passive: '조건부 패시브',
  final_phase: '최종 페이즈',
  variable_multi_hit: '가변 다연타',
  dodge_buff_passive: '회피 반격',
  baehwa_guard: '조건부 방어',
  baehwa_ember_song: '회복·불씨',
  baehwa_atar_sacrifice: '반사·자폭',
  baehwa_hwachang: '확률 분기',
  sraosha_response: '누적 버프',
  sacred_oath: '페이즈 각성',
  geombosa_attack: '3태세 검법',
  hwabosa_attack: '4페이즈 성화',
  gyeongbosa_attack: '경전 낭송',
  oemun_suja_guard: '삼행의 철칙',
  oemun_suja_attack: '의식과 광화',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTriggerLabel(skill: any): string {
  if (skill.triggerCondition === 'stamina_full') return '내력 만충 시';
  if (skill.triggerCondition === 'hp_threshold')
    return `체력 ${Math.round((skill.hpThreshold ?? 0) * 100)}% 이하`;
  if (skill.chance) return `${Math.round(skill.chance * 100)}% 확률`;
  return '항시';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSkillEffectDesc(skill: any): string {
  switch (skill.type) {
    case 'stun': return `${skill.stunDuration}초 기절`;
    case 'rage_attack': return `피해 ×${skill.damageMultiplier}`;
    case 'charged_attack': return `피해 ×${skill.damageMultiplier}${skill.stunAfterHit ? `, ${skill.stunAfterHit}초 기절` : ''}`;
    case 'dot_apply': return '독 적용';
    case 'freeze_attack': return skill.fixedDamage ? `고정 ${skill.fixedDamage}` : `피해 ×${skill.damageMultiplier}`;
    case 'double_hit': return `2타 ×${skill.hitMultiplier}`;
    case 'multi_hit': return `${skill.hitCount}타 ×${skill.hitMultiplier}`;
    case 'passive_dodge': return `${Math.round((skill.dodgeChance ?? 0) * 100)}% 회피`;
    case 'passive_crit': return `${Math.round((skill.critChance ?? 0) * 100)}% 치명 ×${skill.critMultiplier}`;
    case 'passive_dmg_absorb': return `${Math.round((skill.absorbChance ?? 0) * 100)}% 흡수 ×${skill.absorbMultiplier}`;
    case 'potion_heal': return '체력 회복';
    case 'atk_buff_bypass': return `공격력 +${Math.round((skill.atkBuffPercent ?? 0) * 100)}%`;
    case 'replace_normal': return '일반 공격 대체';
    case 'stack_smash': return `${skill.stackTriggerCount}회 누적 → ×${skill.stackSmashMultiplier}`;
    case 'passive_bleed': return `${Math.round((skill.bleedChance ?? 0) * 100)}% 출혈`;
    case 'rapid_fire': return `${skill.rapidFireHits}타 ×${skill.rapidFireMultiplier}`;
    case 'timed_buff': return `공격력 +${Math.round((skill.buffAtkPercent ?? 0) * 100)}%`;
    case 'multi_dot': return skill.dotType === 'slow' ? '감속' : (skill.dotType === 'stamina_drain' ? '내공 소모' : '독');
    case 'condition_strike': return `고정 ${skill.baseFixedDamage}`;
    case 'berserker_scale': return '체력% 연동 강화';
    case 'last_stand': return `피해 ×${skill.damageMultiplier}`;
    case 'cheolbyeok': return `${Math.round((skill.cheolbyeokChance ?? 0) * 100)}% 방어`;
    case 'revenge': return `피해 ×${skill.revengeMultiplier}`;
    case 'phase_sequence': return '다단계 시퀀스';
    case 'conditional_passive': return `피해 ×${skill.damageMultiplier}`;
    case 'final_phase': return '최종 변환';
    case 'variable_multi_hit': {
      const tiers = skill.hitTiers ?? [];
      return tiers.map((t: { chance: number; hitCount: number }) => `${Math.round(t.chance * 100)}%→${t.hitCount}타`).join(', ');
    }
    case 'dodge_buff_passive': return `${Math.round((skill.dodgeChance ?? 0) * 100)}% 회피 + ATK${skill.dodgeBuffAtkPercent ?? 0}%`;
    case 'baehwa_guard': {
      const noArtPct = Math.round((1 - (skill.damageTakenMultiplierIfCondition ?? 0.5)) * 100);
      if (skill.damageTakenMultiplierWhenFactionEquipped != null) {
        const partialPct = Math.round((1 - skill.damageTakenMultiplierWhenFactionEquipped) * 100);
        return `미착용 ${noArtPct}%↓ / 일부착용 ${partialPct}%↓`;
      }
      return `미착용 시 피해 ${noArtPct}%↓`;
    }
    case 'baehwa_ember_song':
      return `${Math.round((skill.chance ?? 0) * 100)}% 확률 · 자가회복 ${skill.selfHealPercent ?? 0}% · 불씨 ${Math.round((skill.emberApplyChance ?? 0) * 100)}%`;
    case 'baehwa_atar_sacrifice':
      return `HP ${Math.round((skill.hpThreshold ?? 0.3) * 100)}% 이하 · ${skill.sacrificeDurationTurns ?? 3}턴 피격반사→자폭`;
    case 'sraosha_response': {
      const maxT = (skill.sraoshaTiers ?? []).at(-1);
      return maxT ? `불씨 스택 연동 · ATK 최대+${Math.round(maxT.atkBonus * 100)}% · ATS+${Math.round(maxT.aspdBonus * 100)}%` : '불씨 연동 버프';
    }
    case 'baehwa_hwachang':
      return `단타 ${Math.round((skill.hwachangSingleChance ?? 0) * 100)}%(×${skill.hwachangSingleDamageMult}) / 이타 ${Math.round((skill.hwachangDoubleChance ?? 0) * 100)}%(×${skill.hwachangDoubleDamageMult})`;
    case 'sacred_oath':
      return `HP ${Math.round((skill.hpThreshold ?? 0.3) * 100)}% · 광화 ${skill.sacredOathAwakeningTurns ?? 1}턴 + 피격 반사`;
    case 'geombosa_attack':
      return skill.geombosaSkills ? '방어태세 → 공격태세 → 명인태세 · 성화 게이지 100' : '3태세 검법';
    case 'hwabosa_attack':
      return skill.hwabosaSkills ? '기도 → 명상(고호방어) → 해방(단죄) → 승천(아타시바흐람)' : '4페이즈 성화';
    case 'gyeongbosa_attack':
      return skill.gyeongbosaSkills ? `억제·단죄·규율 / 절대규율 ${skill.gyeongbosaSkills.discipline?.absolute?.stunSec ?? 15}초 스턴` : '경전 낭송';
    case 'oemun_suja_guard':
      return '0종 미착용 75%↓ / 1+종 장착 25%↓';
    case 'oemun_suja_attack':
      return 'P1 사제(철칙) → HP 0 → P2 광전사';
    default: return '';
  }
}

type DetailSection = {
  label?: string;
  badge?: string;
  items: string[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSkillDetailSections(skill: any): DetailSection[] {
  switch (skill.type) {
    case 'sraosha_response': {
      const tiers: { stackMin: number; stackMax: number; atkBonus: number; aspdBonus: number }[] = skill.sraoshaTiers ?? [];
      const rows = tiers.filter(t => t.atkBonus > 0 || t.aspdBonus > 0).map(t =>
        `스택 ${t.stackMin}${t.stackMax < 9999 ? '~' + t.stackMax : '+'} — ATK +${Math.round(t.atkBonus * 100)}% / 공속 +${Math.round(t.aspdBonus * 100)}%`
      );
      return rows.length ? [{ label: '불씨 스택 단계', items: rows }] : [];
    }
    case 'baehwa_atar_sacrifice': {
      const turns = skill.sacrificeDurationTurns ?? 3;
      const healPct = Math.round((skill.sacrificeHealPercentPerTurn ?? 0) * 100);
      return [
        {
          label: '발동 조건',
          items: [`HP ${Math.round((skill.hpThreshold ?? 0.3) * 100)}% 이하 · 1회성`],
        },
        {
          label: `${turns}턴간 효과`,
          items: [
            `피격 시 불씨 ${skill.sacrificeReflectEmberOnHit ?? 1}개를 역으로 적에게 부여`,
            `매 턴 자가회복 ${healPct}%`,
          ],
        },
        {
          label: `${turns}턴 종료 시`,
          items: [
            `불씨 ${skill.sacrificeEndPreEmber ?? 3}개 부여 후 ×${skill.sacrificeDamageMultiplier ?? 1.5} 자폭`,
            `주의: 자폭 전에 처치하면 스킬 실패 (처치 불가 판정)`,
          ],
        },
      ];
    }
    case 'sacred_oath': {
      return [
        {
          label: '발동 조건',
          items: [`HP ${Math.round((skill.hpThreshold ?? 0.3) * 100)}% 이하 · 1회성`],
        },
        {
          label: '광화 구간',
          badge: `${skill.sacredOathAwakeningTurns ?? 1}턴`,
          items: [
            `스턴 면역`,
            `피격 시 불씨 ${skill.sacredOathReflectPerHit ?? 1}개 반사`,
          ],
        },
        {
          label: '광화 종료 후',
          items: [`매 ${skill.sacredOathBreathIntervalTurns ?? 4}턴마다 불씨 자동 부여`],
        },
      ];
    }
    case 'geombosa_attack': {
      const gs = skill.geombosaSkills;
      if (!gs) return [];
      const sf = gs.sacredFlame;
      return [
        {
          label: '방어태세',
          badge: `피격감소 ${Math.round((1 - (gs.defenseInMult ?? 0.7)) * 100)}%`,
          items: [
            `검술 ×${gs.swordsmanship?.mult} — 기본 공격`,
            `화염검 ×${gs.flameSword?.mult} — 명중 시 불씨 100% 부여`,
            `연격 ×${gs.flameCombo?.mult} — ${gs.flameCombo?.hits}타 / 타당 불씨 ${Math.round((gs.flameCombo?.emberApplyChancePerHit ?? 0.6) * 100)}%`,
          ],
        },
        {
          label: '공격태세',
          badge: `출력+${Math.round(((gs.attackOutMult ?? 1.3) - 1) * 100)}%`,
          items: [
            `위 3종 유지`,
            `점화 ×${gs.emberIgnition?.baseMult} — 불씨 ${gs.emberIgnition?.consumeStacks}스택 소모 · 스택당 +×${gs.emberIgnition?.perStackMult}`,
          ],
        },
        {
          label: '명인태세',
          badge: '성화 게이지',
          items: [
            `공격마다 게이지 +${sf?.gaugePerNormalAttack} / 만충 ${sf?.gaugeMax} → 성화일섬 발동`,
            `성화일섬 ×${sf?.mult} — 불씨 ${sf?.emberApply}개 부여 · 차징 중 경고 표시`,
            `발동 후 그로기 ${sf?.grogyDurationMs}초 (양측 행동 멈춤)`,
          ],
        },
      ];
    }
    case 'hwabosa_attack': {
      const hs = skill.hwabosaSkills;
      if (!hs) return [];
      return [
        {
          label: 'P1 기도',
          badge: `흡수량 0~${(hs.phaseAbsorptionThresholds?.[0] ?? 6) - 1}`,
          items: [
            `화염검 ×${hs.flameSwing?.mult} — 기본 공격`,
            `아타르표식 ×${hs.atarBrand?.mult} — 자신·적 모두 불씨 +1`,
            `묵상 — 불씨 최대 ${hs.ashaMeditation?.maxAbsorbPerUse}스택 흡수 → 회복 ${Math.round((hs.ashaMeditation?.healPercentPerStack ?? 0.02) * 100)}%/스택 · 다음 공격 배율 +${hs.ashaMeditation?.nextAttackBonusPerStack}/스택`,
            `기도 ${hs.prayerDurationSec}초 — 주기적으로 자신·적 불씨 부여`,
          ],
        },
        {
          label: 'P2 명상',
          badge: `흡수량 ${hs.phaseAbsorptionThresholds?.[0] ?? 6} 이상`,
          items: [
            `+ 베레트라그나 ×${hs.verethragna?.mult} — 자신·적 모두 불씨 +2`,
            `고호방어 활성 — 불씨 흡수 스택당 피해감소 ${Math.round((hs.gohoDrPerStack ?? 0.05) * 100)}% · 최대 ${Math.round((hs.gohoDrMaxCap ?? 0.5) * 100)}%`,
          ],
        },
        {
          label: 'P3 해방',
          badge: `흡수량 ${hs.phaseAbsorptionThresholds?.[1] ?? 16} 이상`,
          items: [
            `+ 드루즈 단죄 — DoT ×${hs.druzVerdict?.dotCoefficient} (${hs.druzVerdict?.durationSec}초) · 자신·적 불씨 +2`,
          ],
        },
        {
          label: 'P4 승천',
          badge: `흡수량 ${hs.phaseAbsorptionThresholds?.[2] ?? 31} 이상`,
          items: [
            `+ 아타시바흐람 — 자신·적 불씨 +${hs.atashBahram?.selfEmberGain}`,
            `바흐람 게이지: 공격마다 +${hs.bahramGainPerAttack} · 만충 ${hs.bahramGaugeMax} → 발동`,
          ],
        },
      ];
    }
    case 'gyeongbosa_attack': {
      const gs = skill.gyeongbosaSkills;
      if (!gs) return [];
      const disc = gs.discipline;
      const ab = disc?.absolute;
      return [
        {
          label: '기본 패턴',
          items: [
            `기본 낭송 ×${gs.normal?.mult}`,
            `억제 ×${gs.suppression?.mult} — 적 ATK·공속 -${Math.round((gs.suppression?.debuffAtkPercent ?? 0) * 100)}% (${gs.suppression?.durationSec}초) · 불씨 +1`,
            `자기조화 — 회복 ${Math.round((gs.selfHarmony?.healPercent ?? 0.006) * 1000) / 10}%/초 (${gs.selfHarmony?.durationSec}초) · 다음 공격 회피 +${Math.round((gs.selfHarmony?.nextAttackDodgeBonus ?? 0.3) * 100)}%`,
            `단죄 — DoT ×${gs.verdict?.dotCoefficient} (${gs.verdict?.durationSec}초) · 불씨 +1`,
          ],
        },
        {
          label: '규율 시스템',
          badge: 'HP 50% 이하 발동',
          items: [
            `규율이 쌓일 때마다 3종 중 랜덤 버프 (${disc?.buffDurationSec}초): 단언(크리율 0) / 경공(회피 +${Math.round((disc?.lightStep?.enemyDodgeBonus ?? 0) * 100)}%) / 집행(ATK ×${disc?.enforcement?.enemyAtkMult})`,
            `최대 ${disc?.stackCap}회까지 중첩 가능`,
          ],
        },
        {
          label: '절대 규율',
          badge: `${disc?.absoluteMod}회차마다`,
          items: [
            `서문(序文) 3구절 낭송 시작 — 플레이어 ${ab?.stunSec}초 스턴`,
            `DoT ×${ab?.dotCoefficient} (${ab?.dotDurationSec}초) 적용`,
            `경보사도 ${ab?.ceremonySec}초 동안 행동 불가 (양측 액션락)`,
          ],
        },
      ];
    }
    case 'oemun_suja_attack':
      return [
        {
          label: 'P1 사제',
          items: [
            `삼행의 철칙 유지 — 0종 미착용 시 75%↓ / 1+종 장착 시 25%↓`,
            `기본 공격 패턴`,
          ],
        },
        {
          label: 'P2 진입 조건',
          items: [
            `HP 0 도달 시 체력 100% 회복 후 페이즈 전환`,
            `전환 시 6초 양측 액션락`,
          ],
        },
        {
          label: 'P2 광전사',
          items: [
            `삼행의 철칙 해제 — 피해감소 사라짐`,
            `강화 공격 패턴 (광화 상태 지속)`,
          ],
        },
      ];
    default:
      return [];
  }
}

function formatChance(chance: number): string {
  const pct = chance * 100;
  if (pct >= 1)   return `${pct.toFixed(1)}%`;
  if (pct >= 0.1) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}

// ── MonsterDetailScreen ─────────────────────────────────────────────────────

export function MonsterDetailScreen({ monsterId, onBack }: {
  monsterId: string;
  onBack: () => void;
}) {
  const killCounts = useGameStore(s => s.killCounts);
  const bossKillCounts = useGameStore(s => s.bossKillCounts);
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});

  function toggleSkill(skillId: string) {
    setExpandedSkills(prev => ({ ...prev, [skillId]: !prev[skillId] }));
  }

  const mon = getMonsterDef(monsterId);
  if (!mon) return null;

  const kc = mon.isBoss ? (bossKillCounts[monsterId] ?? 0) : (killCounts[monsterId] ?? 0);
  const reveal = getDocRevealLevel(kc, mon);
  const nextThreshold = getNextThreshold(kc, mon);

  const imgUrl = getEnemyImage(mon.imageKey);
  const emoji = getEnemyEmoji(mon.imageKey);

  // 드랍 아이템 목록
  const drops: { name: string; type: string; chance: number }[] = [
    ...mon.drops.map(d => {
      const art = ARTS.find(a => a.id === d.artId);
      return { name: art?.name ?? d.artId, type: '무공서', chance: d.chance };
    }),
    ...(mon.equipDrops ?? []).map(d => {
      const equip = EQUIPMENT.find(e => e.id === d.equipId);
      return { name: equip?.name ?? d.equipId, type: '장비', chance: d.chance };
    }),
    ...(mon.materialDrops ?? []).map(d => {
      const mat = MATERIALS.find(m => m.id === d.materialId);
      return { name: mat?.name ?? d.materialId, type: '재료', chance: d.chance };
    }),
  ];

  const QM = <span style={{ color: 'var(--text-dim)', letterSpacing: 1 }}>???</span>;

  return (
    <div>
      <div className="field-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="field-back-btn" onClick={onBack}>←</button>
          <div style={{ fontWeight: 500, fontSize: 14 }}>
            {mon.name}
            {mon.isBoss && (
              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)', borderRadius: 3, padding: '1px 4px' }}>보스</span>
            )}
            {mon.isHidden && (
              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-dim)', border: '1px solid var(--border-card)', borderRadius: 3, padding: '1px 4px' }}>은신</span>
            )}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>처치 {kc}마리</span>
      </div>

      {/* 이미지 + 설명 + 스탯 */}
      <div className="card">
        <div style={{ display: 'flex', gap: 14 }}>
          {/* 이미지 */}
          <div style={{ flexShrink: 0, width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', borderRadius: 8, overflow: 'hidden' }}>
            {imgUrl
              ? <img src={imgUrl} alt={mon.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: 44 }}>{emoji}</span>}
          </div>

          {/* 설명 + 스탯 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* 설명 */}
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.7 }}>
              {reveal >= 2 ? (mon.description ?? '기록된 설명이 없다.') : QM}
            </p>

            {/* 등급 */}
            <div style={{ fontSize: 12 }}>
              <span style={{ color: 'var(--text-dim)' }}>등급</span>{' '}
              {reveal >= 3
                ? <span style={{ color: 'var(--accent-gold)' }}>{getGradeName(mon.grade)}</span>
                : QM}
            </div>
          </div>
        </div>

        {/* 스탯 (100마리 이상) */}
        {reveal >= 4 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <StatItem label="생명" value={mon.hp} />
            <StatItem label="공격" value={mon.attackPower} />
            {mon.attackInterval > 0 && <StatItem label="공속" value={`${mon.attackInterval}초`} />}
            {mon.regen > 0 && <StatItem label="회복" value={`${mon.regen}/초`} />}
            {(mon.baseProficiency ?? 0) > 0 && <StatItem label="숙련도" value={mon.baseProficiency!} />}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            생명 {QM}　공격 {QM}　숙련도 {QM}
          </div>
        )}
      </div>

      {/* 사용 기술 */}
      {(() => {
        const pattern = BOSS_PATTERNS[monsterId];
        const skills = pattern?.skills ?? [];
        if (skills.length === 0) return null;
        return (
          <div className="card">
            <div className="card-label">사용 기술</div>
            {reveal >= 4 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {skills.map(skill => (
                  <div key={skill.id} style={{ fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{skill.displayName}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 3,
                        background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)',
                      }}>
                        {SKILL_TYPE_LABELS[skill.type] ?? skill.type}
                      </span>
                    </div>
                    {reveal >= 5 && (() => {
                      const effectDesc = getSkillEffectDesc(skill);
                      const sections = getSkillDetailSections(skill);
                      const isExpanded = expandedSkills[skill.id] ?? false;
                      return (
                        <>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span>{getTriggerLabel(skill)}</span>
                              {effectDesc && (
                                <span style={{ color: 'var(--accent-gold)' }}>{effectDesc}</span>
                              )}
                            </div>
                            {sections.length > 0 && (
                              <button
                                onClick={() => toggleSkill(skill.id)}
                                style={{
                                  fontSize: 10, color: isExpanded ? 'var(--text-secondary)' : 'var(--text-dim)',
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 3, padding: '1px 7px', cursor: 'pointer', flexShrink: 0,
                                }}
                              >
                                패턴 상세 {isExpanded ? '▲' : '▼'}
                              </button>
                            )}
                          </div>
                          {sections.length > 0 && isExpanded && (
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {sections.map((sec, si) => (
                                <div key={si}>
                                  {sec.label && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{sec.label}</span>
                                      {sec.badge && (
                                        <span style={{ fontSize: 10, color: 'var(--accent-gold)', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 3, padding: '1px 5px' }}>{sec.badge}</span>
                                      )}
                                    </div>
                                  )}
                                  <div style={{ paddingLeft: sec.label ? 10 : 0, borderLeft: sec.label ? '2px solid rgba(255,255,255,0.08)' : 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {sec.items.map((item, ii) => (
                                      <div key={ii} style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.65, display: 'flex', gap: 5 }}>
                                        <span style={{ color: 'rgba(212,175,55,0.45)', flexShrink: 0, marginTop: 1 }}>·</span>
                                        <span>{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--text-dim)', letterSpacing: 1, fontSize: 12 }}>???</span>
            )}
          </div>
        );
      })()}

      {/* 드랍 아이템 */}
      <div className="card">
        <div className="card-label">드랍 아이템</div>
        {drops.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: 0 }}>드랍 아이템 없음</p>
        ) : reveal < 5 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: 0, letterSpacing: 1 }}>???</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'var(--text-dim)', textAlign: 'left' }}>
                <th style={{ paddingBottom: 6, fontWeight: 400 }}>이름</th>
                <th style={{ paddingBottom: 6, fontWeight: 400 }}>종류</th>
                <th style={{ paddingBottom: 6, fontWeight: 400, textAlign: 'right' }}>확률</th>
              </tr>
            </thead>
            <tbody>
              {drops.map((d, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 0' }}>{d.name}</td>
                  <td style={{ padding: '6px 0', color: 'var(--text-dim)' }}>{d.type}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>
                    {reveal >= 6 ? formatChance(d.chance) : QM}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 해금 진행도 */}
      {nextThreshold !== null ? (
        <div className="card" style={{ fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: 6 }}>
            <span>다음 해금</span>
            <span>{kc} / {nextThreshold}마리</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent-gold)', width: `${Math.min(100, (kc / nextThreshold) * 100)}%`, borderRadius: 2 }} />
          </div>
        </div>
      ) : (
        <div className="card" style={{ fontSize: 12, textAlign: 'center', color: 'var(--accent-gold)', letterSpacing: 2 }}>
          도감 완성
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <span>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>{' '}
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </span>
  );
}
