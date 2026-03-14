/**
 * 전장 데이터 (v1.0)
 */

export interface FieldDef {
  id: string;
  name: string;
  monsters: string[]; // monster IDs in order
  hiddenMonsters: string[];
  boss?: string;
  bossTimer?: number; // seconds
  isTraining?: boolean;
  canExplore?: boolean; // 답파 가능 여부
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
    hiddenMonsters: ['feiyi', 'dangkang'],
    boss: 'tiger_boss',
    bossTimer: 60,
    canExplore: true,
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
export function generateExploreOrder(field: FieldDef): string[] {
  const monsters = [...field.monsters]; // weak to strong
  const hidden = field.hiddenMonsters;
  const result: string[] = [];

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
    // 각 5%로 히든 대체
    if (hidden.length > 0 && Math.random() < 0.05) {
      result.push(hidden[Math.floor(Math.random() * hidden.length)]);
    } else {
      result.push(pool[idx]);
    }
  }

  // 5번째: 최강 일반 (5%로 히든 대체)
  if (hidden.length > 0 && Math.random() < 0.05) {
    result.push(hidden[Math.floor(Math.random() * hidden.length)]);
  } else {
    result.push(monsters[monsters.length - 1]);
  }

  return result;
}
