/**
 * 자연의 기운/경맥 탭 — v4.1
 * 기(氣)/심(心)/체(體) 스탯. 내력 게이지 추가.
 */
import { useState } from 'react';
import { useGameStore, calcMaxHp, calcStamina, calcStaminaRegen, calcEffectiveRegen, calcTierMultiplier } from '../store/gameStore';
import { getTierDef, TIERS } from '../data/tiers';
import { getArtDef } from '../data/arts';
import { getActiveProfile, getUnlockedProfileKeys, getPlayerImageByKey, getPlayerByTier, PLAYER_TIER_KEYS } from '../assets';
import { formatNumber } from '../utils/format';

export default function NeigongTab() {
  const qi = useGameStore(s => s.qi);
  const stats = useGameStore(s => s.stats);
  const hp = useGameStore(s => s.hp);
  const maxHp = useGameStore(s => s.maxHp);
  const stamina = useGameStore(s => s.stamina);
  const tier = useGameStore(s => s.tier);
  const equippedSimbeop = useGameStore(s => s.equippedSimbeop);
  const ownedArts = useGameStore(s => s.ownedArts);
  const investStat = useGameStore(s => s.investStat);
  const healWithQi = useGameStore(s => s.healWithQi);
  const getQiPerSec = useGameStore(s => s.getQiPerSec);
  const getStatCost = useGameStore(s => s.getStatCost);
  const getTotalStats = useGameStore(s => s.getTotalStats);
  const getAttackInterval = useGameStore(s => s.getAttackInterval);
  const attemptBreakthrough = useGameStore(s => s.attemptBreakthrough);
  const equipSimbeop = useGameStore(s => s.equipSimbeop);
  const unequipSimbeop = useGameStore(s => s.unequipSimbeop);
  const battleMode = useGameStore(s => s.battleMode);
  const selectedProfileKey = useGameStore(s => s.selectedProfileKey);
  const customProfileUrl = useGameStore(s => s.customProfileUrl);
  const setProfileKey = useGameStore(s => s.setProfileKey);
  const setCustomProfile = useGameStore(s => s.setCustomProfile);

  const battling = battleMode !== 'none';
  const [investMode, setInvestMode] = useState<1 | 10 | 100 | 'max'>(1);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);

  function calcFixedCost(level: number, count: number): number {
    let total = 0;
    let lv = level;
    for (let i = 0; i < count; i++) {
      total += getStatCost(lv);
      lv += 1;
    }
    return total;
  }

  function calcMaxLevels(level: number): number {
    let remaining = qi;
    let lv = level;
    let count = 0;
    while (true) {
      const c = getStatCost(lv);
      if (remaining < c) break;
      remaining -= c;
      lv += 1;
      count += 1;
    }
    return count;
  }
  const tierDef = getTierDef(tier);
  const qiRate = getQiPerSec();
  const totalStats = getTotalStats();
  const player = getActiveProfile(selectedProfileKey, customProfileUrl, tier);
  const atkInterval = getAttackInterval();

  // 파생 수치
  const maxStamina = calcStamina(stats.sim, calcTierMultiplier(tier));
  const effRegen = calcEffectiveRegen(useGameStore.getState());

  const nextTier = TIERS[tier + 1];
  const canBreakthrough = nextTier?.requirements ? (() => {
    const reqs = nextTier.requirements!;
    if (reqs.totalStats && totalStats < reqs.totalStats) return false;
    if (reqs.bossKills) {
      const bk = Object.values(useGameStore.getState().bossKillCounts).reduce((s, n) => s + n, 0);
      if (bk < reqs.bossKills) return false;
    }
    if (reqs.totalKills) {
      const tk = useGameStore.getState().totalKills ?? 0;
      if (tk < reqs.totalKills) return false;
    }
    if (reqs.achievementCount) {
      const ac = useGameStore.getState().achievementCount ?? 0;
      if (ac < reqs.achievementCount) return false;
    }
    return true;
  })() : false;

  const simbeopArts = ownedArts.filter(a => getArtDef(a.id)?.artType === 'simbeop');

  const statEntries: { key: 'gi' | 'sim' | 'che'; name: string; sub: string; dot: string; desc: string }[] = [
    { key: 'gi', name: '기', sub: '氣', dot: 'var(--dot-sungi)', desc: `내력 회복 ${calcStaminaRegen(stats.gi).toFixed(2)}/초` },
    { key: 'sim', name: '심', sub: '心', dot: 'var(--dot-gyeongsin)', desc: `최대 내력 ${maxStamina}` },
    { key: 'che', name: '체', sub: '體', dot: 'var(--dot-magi)', desc: `최대 체력 ${calcMaxHp(stats.che)}` },
  ];

  return (
    <div>
      {/* 캐릭터 + 자연의 기운 */}
      <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
        <div
          className={`char-circle${profilePanelOpen ? ' char-circle--active' : ''}`}
          onClick={() => setProfilePanelOpen(v => !v)}
          title="프로필 사진 변경"
        >
          {player.url ? (
            <img src={player.url} alt="캐릭터" />
          ) : (
            <span style={{ fontSize: 40 }}>{player.emoji}</span>
          )}
        </div>
        <div className="neigong-value">
          {formatNumber(Math.floor(qi))}
        </div>
        <div className="neigong-rate">
          {battling
            ? '전투 중'
            : `+${qiRate.toFixed(1)}/초`}
        </div>
      </div>

      {/* 프로필 선택 패널 */}
      {profilePanelOpen && (
        <ProfilePanel
          tier={tier}
          selectedProfileKey={selectedProfileKey}
          customProfileUrl={customProfileUrl}
          onSelectKey={setProfileKey}
          onSelectCustom={setCustomProfile}
        />
      )}

      {/* HP 카드 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>체력</span>
          <span style={{ fontSize: 13 }}>{Math.floor(hp)}/{maxHp}</span>
        </div>
        <div className="hp-bar-container">
          <div className="hp-bar-fill" style={{ width: `${(hp / maxHp) * 100}%` }} />
        </div>

        {/* 내력 게이지 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>내력</span>
          <span style={{ fontSize: 13 }}>{Math.floor(stamina)}/{maxStamina}</span>
        </div>
        <div className="hp-bar-container">
          <div className="hp-bar-fill" style={{
            width: `${maxStamina > 0 ? (stamina / maxStamina) * 100 : 0}%`,
            background: 'var(--blue, #4a9eff)',
          }} />
        </div>

        <div
          className={`heal-link ${(battling || hp >= maxHp || qi < 1) ? 'disabled' : ''}`}
          onClick={() => { if (!battling && hp < maxHp && qi >= 1) healWithQi(); }}
        >
          기운으로 회복 →
        </div>
      </div>

      {/* 경지 카드 */}
      <div className="card">
        <div className="tier-row">
          <span className="badge badge-gold">{tierDef.name}</span>
          {nextTier && (
            <button
              className={`btn btn-small btn-gold ${canBreakthrough ? 'glow' : ''}`}
              onClick={attemptBreakthrough}
              disabled={battling || !canBreakthrough}
            >
              경지 돌파
            </button>
          )}
        </div>
        {nextTier?.requirements && (
          <div className="tier-requirements">
            {nextTier.requirements.totalStats && (
              <span>경맥합 {totalStats}/{nextTier.requirements.totalStats}</span>
            )}
            {nextTier.requirements.bossKills && (
              <span style={{ marginLeft: 12 }}>
                보스 {Object.values(useGameStore.getState().bossKillCounts).reduce((s, n) => s + n, 0)}/{nextTier.requirements.bossKills}회
              </span>
            )}
            {nextTier.requirements.totalKills && (
              <span style={{ marginLeft: 12 }}>
                처치 {useGameStore.getState().totalKills ?? 0}/{nextTier.requirements.totalKills}마리
              </span>
            )}
            {nextTier.requirements.achievementCount && (
              <span style={{ marginLeft: 12 }}>
                업적 {useGameStore.getState().achievementCount ?? 0}/{nextTier.requirements.achievementCount}개
              </span>
            )}
          </div>
        )}
      </div>

      {/* 경맥 투자 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="card-label" style={{ marginBottom: 0 }}>경맥</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>공격간격 {atkInterval.toFixed(1)}초</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {([1, 10, 100, 'max'] as const).map(mode => (
            <button
              key={String(mode)}
              className={`btn btn-small${investMode === mode ? ' btn-gold' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setInvestMode(mode)}
            >
              {mode === 'max' ? '최대' : `+${mode}`}
            </button>
          ))}
        </div>
        {statEntries.map(({ key, name, sub, dot, desc }) => {
          const level = stats[key];
          const nextCost = getStatCost(level);
          const maxLevels = investMode === 'max' ? calcMaxLevels(level) : null;
          const modeCost = investMode !== 'max' ? calcFixedCost(level, investMode) : null;
          return (
            <div key={key} className="stat-row">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="stat-dot" style={{ background: dot }} />
                <div>
                  <span className="stat-label">{name}<span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 2 }}>{sub}</span></span>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{desc}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="stat-level">Lv.{level}</span>
                {investMode === 'max'
                  ? <span style={{ fontSize: 12, color: 'var(--blue, #4a9eff)' }}>+{maxLevels}레벨</span>
                  : <span className="stat-cost" style={{ color: qi < modeCost! ? 'var(--text-dim)' : undefined }}>{formatNumber(modeCost!)}</span>
                }
                <button
                  className="btn btn-plus"
                  onClick={() => investStat(key, investMode === 'max' ? 999999 : investMode)}
                  disabled={battling || qi < nextCost}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 심법 */}
      <div className="card">
        <div className="card-label">심법</div>
        {equippedSimbeop ? (() => {
          const artDef = getArtDef(equippedSimbeop);
          const owned = ownedArts.find(a => a.id === equippedSimbeop);
          if (!artDef || !owned) return null;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="simbeop-icon">📖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--blue)' }}>
                  {artDef.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  장착 중
                </div>
              </div>
              <button className="btn btn-small" onClick={unequipSimbeop} disabled={battling}>교체</button>
            </div>
          );
        })() : (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>심법 미장착</div>
        )}

        {simbeopArts.length > 0 && !battling && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            {simbeopArts
              .filter(a => a.id !== equippedSimbeop)
              .map(a => {
                const def = getArtDef(a.id);
                if (!def) return null;
                return (
                  <button
                    key={a.id}
                    className="btn btn-small"
                    onClick={() => equipSimbeop(a.id)}
                  >
                    {def.name} 장착
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 경지 키 → 표시 이름 ──
const TIER_KEY_LABEL: Record<string, string> = {
  tier0_hucheon: '후천경',
  tier1_seongcheon: '성천경',
  tier2_jeoljeong: '절정경',
  tier3_hwagyeong: '화경',
};

type ProfilePanelProps = {
  tier: number;
  selectedProfileKey: string | null;
  customProfileUrl: string | null;
  onSelectKey: (key: string | null) => void;
  onSelectCustom: (dataUrl: string | null) => void;
};

function ProfilePanel({ tier, selectedProfileKey, customProfileUrl, onSelectKey, onSelectCustom }: ProfilePanelProps) {
  const unlockedKeys = getUnlockedProfileKeys(tier);
  const isAuto = !selectedProfileKey && !customProfileUrl;
  const autoUrl = getPlayerByTier(tier).url;

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      alert('파일을 읽을 수 없습니다. 다른 이미지를 시도해 주세요.');
    };
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => {
        alert('지원하지 않는 이미지 형식입니다. PNG·JPG 파일을 사용해 주세요.');
      };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d')!;
        const size = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 200, 200);
        onSelectCustom(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // PLAYER_TIER_KEYS를 기준으로 해금된 키만 중복 없이 표시
  const displayKeys = PLAYER_TIER_KEYS.filter(k => unlockedKeys.includes(k));

  return (
    <div className="profile-panel">
      <div className="profile-panel-title">프로필 사진 선택</div>
      <div className="profile-thumb-grid">
        {/* 자동 (현재 경지 기준) */}
        <div
          className={`profile-thumb${isAuto ? ' selected' : ''}`}
          onClick={() => onSelectKey(null)}
        >
          {autoUrl
            ? <img src={autoUrl} alt="자동" />
            : <span className="upload-icon">🧑</span>}
          <span>자동</span>
        </div>

        {/* 해금된 게임 프로필 */}
        {displayKeys.map(key => {
          const url = getPlayerImageByKey(key);
          return (
            <div
              key={key}
              className={`profile-thumb${selectedProfileKey === key ? ' selected' : ''}`}
              onClick={() => onSelectKey(key)}
            >
              {url
                ? <img src={url} alt={TIER_KEY_LABEL[key] ?? key} />
                : <span className="upload-icon">🧑</span>}
              <span>{TIER_KEY_LABEL[key] ?? key}</span>
            </div>
          );
        })}

        {/* 커스텀 업로드 */}
        <div
          className={`profile-thumb${customProfileUrl ? ' selected' : ''}`}
          onClick={() => document.getElementById('profile-upload-input')?.click()}
        >
          {customProfileUrl
            ? <img src={customProfileUrl} alt="직접 등록" />
            : <span className="upload-icon">+</span>}
          <span>직접 등록</span>
        </div>
      </div>

      <input
        id="profile-upload-input"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
    </div>
  );
}
