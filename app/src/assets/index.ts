/**
 * 이미지 에셋 매핑 — UI개편
 */

const enemyImages = import.meta.glob<{ default: string }>(
  './enemies/*.png', { eager: true }
);
const playerImages = import.meta.glob<{ default: string }>(
  './player/*.png', { eager: true }
);
const backgroundImages = import.meta.glob<{ default: string }>(
  './backgrounds/*.png', { eager: true }
);
const seonghwaImages = import.meta.glob<{ default: string }>(
  './seonghwa/*.png', { eager: true }
);

function buildMap(
  globResult: Record<string, { default: string }>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, mod] of Object.entries(globResult)) {
    const filename = path.split('/').pop()?.replace('.png', '') ?? '';
    map[filename] = mod.default;
  }
  return map;
}

const _enemyMap = buildMap(enemyImages);
const _playerMap = buildMap(playerImages);
const _bgMap = buildMap(backgroundImages);
const _seonghwaMap = buildMap(seonghwaImages);

/**
 * 희미한 성화 드롭 이미지 조회.
 * - 잔불: 수량(materialCount)에 해당하는 ember_{count}.png
 * - 장비: equipId를 그대로 키로 사용
 */
export function getSeonghwaDropImage(
  reward: { materialId?: string; materialCount?: number; equipId?: string }
): string | null {
  if (reward.equipId) return _seonghwaMap[reward.equipId] ?? null;
  if (reward.materialId === 'huimihan_janbul' && reward.materialCount != null) {
    return _seonghwaMap[`ember_${reward.materialCount}`] ?? null;
  }
  return null;
}

// 적 이모지 폴백
const ENEMY_EMOJI: Record<string, string> = {
  training_wood: '🪵',
  training_iron: '🗿',
  squirrel: '🐿️',
  rabbit: '🐇',
  fox: '🦊',
  deer: '🦌',
  boar: '🐗',
  wolf: '🐺',
  bear: '🐻',
  dangkang: '🦏',
  tiger_boss: '🐯',
  drunk_thug: '🍺',
  peddler: '🎒',
  troublemaker: '👊',
  wanderer: '⚔️',
  bounty_hunter: '🎯',
  ronin: '🗡️',
  bandit_chief: '💀',
  masked_swordsman: '🎭',
  innkeeper_true: '👤',
  bandit_leader: '⚔️',
  // 흑풍채 신규 몬스터
  heugpung_mokryeong: '🐕',
  sanbaram_gungsu: '🏹',
  nokrim_patrol_chief: '👊',
  // 새외 몬스터
  hwahyulsa: '🐍',
  eunrang: '🐺',
  // 배화교 몬스터
  baehwa_haengja: '🔥',
  baehwa_howi: '🛡️',
  baehwa_geombosa: '🗡️',
  baehwa_hwabosa: '🔥',
  baehwa_gyeongbosa: '📖',
};

export function getEnemyImage(key: string): string | null {
  return _enemyMap[key] ?? null;
}

export function getEnemyEmoji(key: string): string {
  return ENEMY_EMOJI[key] ?? '⚔️';
}

// 플레이어 경지별 이미지
export const PLAYER_TIER_KEYS = ['tier0_hucheon', 'tier1_seongcheon', 'tier2_jeoljeong', 'tier3_hwagyeong'];

export function getPlayerByTier(tier: number): { url: string | null; emoji: string } {
  const key = PLAYER_TIER_KEYS[Math.min(Math.floor(tier / 3), PLAYER_TIER_KEYS.length - 1)];
  return {
    url: _playerMap[key] ?? null,
    emoji: '🧑',
  };
}

export function getUnlockedProfileKeys(tier: number): string[] {
  const maxIdx = Math.min(Math.floor(tier / 3), PLAYER_TIER_KEYS.length - 1);
  return PLAYER_TIER_KEYS.slice(0, maxIdx + 1);
}

export function getPlayerImageByKey(key: string): string | null {
  return _playerMap[key] ?? null;
}

export function getActiveProfile(
  selectedKey: string | null,
  customUrl: string | null,
  tier: number,
): { url: string | null; emoji: string } {
  if (customUrl) return { url: customUrl, emoji: '🧑' };
  if (selectedKey && _playerMap[selectedKey]) return { url: _playerMap[selectedKey], emoji: '🧑' };
  return getPlayerByTier(tier);
}

// 전장 배경 이미지
const FIELD_BG_MAP: Record<string, string> = {
  training: 'training_ground',
  yasan: 'mountain_forest',
  inn: 'inn_interior',
  cheonsan: 'cheonsan_daebaek',
  cheonsan_jangmak: 'cheonsan_daebaek',
  cheonsan_godo: 'cheonsan_daebaek',
  cheonsan_simjang: 'cheonsan_daebaek',
  baehwagyo: 'baehwagyo',
  baehwagyo_oemun: 'baehwagyo',
  baehwagyo_naemun: 'baehwagyo',
  baehwagyo_sawon: 'baehwagyo',
  baehwagyo_simcheo: 'baehwagyo',
};

export function getFieldBackground(fieldId: string): string | null {
  const bgKey = FIELD_BG_MAP[fieldId];
  if (!bgKey) return null;
  return _bgMap[bgKey] ?? null;
}
