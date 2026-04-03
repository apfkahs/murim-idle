/**
 * 전장 데이터 (v1.0)
 */

// ── 해금 조건 ──
export interface FieldUnlockCondition {
  bossKill?: string;   // 특정 보스 처치 시 해금 (보스 ID)
  minTier?: number;    // 최소 경지 (tier)
}

export interface FieldDef {
  id: string;
  name: string;
  monsters: string[]; // monster IDs in order
  hiddenMonsters: string[];
  boss?: string;
  bossTimer?: number; // seconds
  isTraining?: boolean;
  canExplore?: boolean; // 답파 가능 여부
  unlockCondition?: FieldUnlockCondition; // 선언적 해금 조건
  hiddenRate?: number;              // 히든 출현 확률 (기본 0.05)
  hiddenRequiresBossKill?: boolean; // 보스 처치 후 히든 출현 (기본 false)
  region?: string;           // 'jungwon' | 'saewoe' 등, 기본값 'jungwon'
  location?: string;         // 지역 그룹명 (예: '천산 대맥')
  sequential?: boolean;      // true이면 몬스터를 순서대로 배치 (랜덤 아님)
  totalMonsterSlots?: number; // 총 몬스터 슬롯 수 (미구현 슬롯은 ??? 표시)
}

export const FIELDS: FieldDef[] = [
  {
    id: 'training',
    name: '수련장',
    monsters: ['training_wood', 'training_iron'],
    hiddenMonsters: [],
    isTraining: true,
    canExplore: false,
  },
  {
    id: 'yasan',
    name: '야산',
    monsters: ['squirrel', 'rabbit', 'fox', 'deer', 'boar', 'wolf', 'bear'],
    hiddenMonsters: ['dangkang'],
    boss: 'tiger_boss',
    bossTimer: 60,
    canExplore: true,
    hiddenRate: 0.03,
    hiddenRequiresBossKill: true,
  },
  {
    id: 'inn',
    name: '허름한 객잔',
    monsters: [
      'drunk_thug', 'peddler', 'troublemaker', 'wanderer',
      'bounty_hunter', 'ronin', 'bandit_chief',
    ],
    hiddenMonsters: ['masked_swordsman', 'innkeeper_true'],
    boss: 'bandit_leader',
    bossTimer: 60,
    canExplore: true,
    unlockCondition: { bossKill: 'tiger_boss' },
  },
  // ── 새외(塞外) — 천산 대맥(天山大脈) ──
  {
    id: 'cheonsan_jangmak',
    name: '백색의 장막',
    region: 'saewoe',
    location: '천산 대맥',
    monsters: ['hwahyulsa', 'eunrang'],
    hiddenMonsters: [],
    canExplore: true,
    sequential: true,
    totalMonsterSlots: 5,
    unlockCondition: { bossKill: 'tiger_boss' },
  },
  {
    id: 'cheonsan_godo',
    name: '백색의 고도',
    region: 'saewoe',
    location: '천산 대맥',
    monsters: [],
    hiddenMonsters: [],
    canExplore: true,
    sequential: true,
    totalMonsterSlots: 5,
    unlockCondition: { bossKill: 'jangmak_boss' },
  },
  {
    id: 'cheonsan_simjang',
    name: '백색의 심장',
    region: 'saewoe',
    location: '천산 대맥',
    monsters: [],
    hiddenMonsters: [],
    canExplore: true,
    sequential: true,
    totalMonsterSlots: 5,
    unlockCondition: { bossKill: 'godo_boss' },
  },
];

export function getFieldDef(id: string): FieldDef | undefined {
  return FIELDS.find(f => f.id === id);
}

/**
 * 답파 순서 생성 (6.3장)
 * 5마리 배열:
 * - 5번째: 최강 일반 고정 (5%로 히든 대체)
 * - 1~4번째: 약→강, 역행불가, 종류 최대화, 각각 5%로 히든 대체
 */
export function generateExploreOrder(field: FieldDef, bossKillCounts?: Record<string, number>): string[] {
  // 순차 필드: 몬스터를 정의된 순서대로 반환
  if (field.sequential) {
    return [...field.monsters];
  }

  const monsters = [...field.monsters]; // weak to strong
  const hidden = field.hiddenMonsters;
  const result: string[] = [];

  // 히든 출현 조건 체크
  const hiddenRate = field.hiddenRate ?? 0.05;
  const canSpawnHidden = hidden.length > 0
    && (!field.hiddenRequiresBossKill || (field.boss && (bossKillCounts?.[field.boss] ?? 0) > 0));

  // 1~4번째: 약→강, 최대 종류, 역행불가
  // 최강(마지막)은 5번째에 고정이므로 나머지에서 4개 선택
  const pool = monsters.slice(0, -1); // 곰 제외
  const selected: number[] = [];

  // 종류 최대화: 가능하면 서로 다른 몬스터
  if (pool.length <= 4) {
    // 풀이 4 이하면 전부 사용 후 부족분 채움
    for (let i = 0; i < Math.min(4, pool.length); i++) {
      selected.push(i);
    }
    while (selected.length < 4) {
      selected.push(Math.floor(Math.random() * pool.length));
    }
  } else {
    // 6개 중 4개 랜덤 선택 (순서 유지)
    const indices = Array.from({ length: pool.length }, (_, i) => i);
    const chosen: number[] = [];
    while (chosen.length < 4 && indices.length > 0) {
      const pick = Math.floor(Math.random() * indices.length);
      chosen.push(indices.splice(pick, 1)[0]);
    }
    chosen.sort((a, b) => a - b);
    selected.push(...chosen);
  }

  // 정렬 (약→강 순서 유지)
  selected.sort((a, b) => a - b);

  for (const idx of selected) {
    // 각 hiddenRate%로 히든 대체
    if (canSpawnHidden && Math.random() < hiddenRate) {
      result.push(hidden[Math.floor(Math.random() * hidden.length)]);
    } else {
      result.push(pool[idx]);
    }
  }

  // 5번째: 최강 일반 (hiddenRate%로 히든 대체)
  if (canSpawnHidden && Math.random() < hiddenRate) {
    result.push(hidden[Math.floor(Math.random() * hidden.length)]);
  } else {
    result.push(monsters[monsters.length - 1]);
  }

  return result;
}
