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
  // 새외 몬스터
  hwahyulsa: '🐍',
  eunrang: '🐺',
};

export function getEnemyImage(key: string): string | null {
  return _enemyMap[key] ?? null;
}

export function getEnemyEmoji(key: string): string {
  return ENEMY_EMOJI[key] ?? '⚔️';
}

// 플레이어 경지별 이미지
const PLAYER_TIER_KEYS = ['tier0_hucheon', 'tier1_seongcheon', 'tier2_jeoljeong', 'tier3_hwagyeong'];

export function getPlayerByTier(tier: number): { url: string | null; emoji: string } {
  const key = PLAYER_TIER_KEYS[Math.min(Math.floor(tier / 3), PLAYER_TIER_KEYS.length - 1)];
  return {
    url: _playerMap[key] ?? null,
    emoji: '🧑',
  };
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
};

export function getFieldBackground(fieldId: string): string | null {
  const bgKey = FIELD_BG_MAP[fieldId];
  if (!bgKey) return null;
  return _bgMap[bgKey] ?? null;
}
