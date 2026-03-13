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
  feiyi: '🐉',
  dangkang: '🦏',
  tiger_boss: '🐯',
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
  const key = PLAYER_TIER_KEYS[Math.min(tier, PLAYER_TIER_KEYS.length - 1)];
  return {
    url: _playerMap[key] ?? null,
    emoji: '🧑',
  };
}

// 전장 배경 이미지
const FIELD_BG_MAP: Record<string, string> = {
  training: 'training_ground',
  yasan: 'mountain_forest',
};

export function getFieldBackground(fieldId: string): string | null {
  const bgKey = FIELD_BG_MAP[fieldId];
  if (!bgKey) return null;
  return _bgMap[bgKey] ?? null;
}
