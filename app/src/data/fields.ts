/**
 * 전장 데이터 (v1.0)
 */

// ── 해금 조건 ──
export interface FieldUnlockCondition {
  bossKill?: string;      // 특정 보스 처치 시 해금 (보스 ID)
  monsterKill?: string;   // 특정 일반 몬스터 처치 시 해금 (몬스터 ID)
  minTier?: number;       // 최소 경지 (tier)
  materialOwned?: string; // 이 재료 소지 시 해금
}

export interface FieldFirstEntryEvent {
  logs: string[];           // battleLog에 순서대로 push (몰입 서술체)
  materialDrop: string;     // 확정 드랍 재료 id
  resultMessage: string;    // BattleResultScreen 상단 message
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
  firstEntryEvent?: FieldFirstEntryEvent; // 첫 진입 시 발동하는 서사 이벤트
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
      'bandit_chief',
    ],
    hiddenMonsters: ['masked_swordsman'],
    boss: 'innkeeper_true',
    bossTimer: 60,
    canExplore: true,
    unlockCondition: { monsterKill: 'bear' },
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
  // ── 중원 신규 전장 스텁 ──
  {
    id: 'heugpungchae',
    name: '흑풍채',
    monsters: ['heugpung_mokryeong', 'sanbaram_gungsu', 'bounty_hunter', 'ronin'],
    boss: 'bandit_leader',
    bossTimer: 90,
    hiddenMonsters: ['nokrim_patrol_chief'],
    canExplore: true,
    unlockCondition: { materialOwned: 'heugpungchae_map' },
  },
  {
    id: 'gongdong',
    name: '공동파',
    monsters: [],
    hiddenMonsters: [],
    canExplore: false,
    unlockCondition: { materialOwned: 'gongdong_map' },
  },
  // ── 배화교(拜火敎) — 4단계 다층 구조 ──
  {
    id: 'baehwagyo_oemun',
    name: '배화교 외문',
    monsters: ['baehwa_haengja', 'baehwa_howi', 'baehwa_geombosa', 'baehwa_hwabosa', 'baehwa_gyeongbosa'],
    hiddenMonsters: [],
    canExplore: true,
    sequential: true,
    totalMonsterSlots: 7,
    unlockCondition: { materialOwned: 'secret_order' },
    firstEntryEvent: {
      logs: [
        '꿈 같은 공간을 헤쳐나가다 문득 눈을 뜨니, 백지로만 가득한 비급이 손에 있었다.',
      ],
      materialDrop: 'baekji_mugongseo',
      resultMessage: '꿈속에서 백지무공서를 얻었다.',
    },
  },
  {
    id: 'baehwagyo_naemun',
    name: '배화교 내문',
    monsters: [],
    hiddenMonsters: [],
    canExplore: true,
    sequential: true,
    totalMonsterSlots: 5,
    unlockCondition: { bossKill: 'baehwagyo_oemun_boss' },
  },
  {
    id: 'baehwagyo_sawon',
    name: '배화교 사원',
    monsters: [],
    hiddenMonsters: [],
    canExplore: true,
    sequential: true,
    totalMonsterSlots: 5,
    unlockCondition: { bossKill: 'baehwagyo_naemun_boss' },
  },
  {
    id: 'baehwagyo_simcheo',
    name: '배화교 심처',
    monsters: [],
    hiddenMonsters: [],
    canExplore: true,
    sequential: true,
    totalMonsterSlots: 5,
    unlockCondition: { bossKill: 'baehwagyo_sawon_boss' },
  },
];

export function getFieldDef(id: string): FieldDef | undefined {
  return FIELDS.find(f => f.id === id);
}

/**
 * 답파 순서 생성
 * - 순차 필드: 정의된 순서대로 반환
 * - 비순차 필드: field.monsters 전체에서 5마리 완전 랜덤 선택 (중복 허용, 난이도 무관)
 * - 히든 등장은 보스 슬롯에서만 처리 (gameLoop.ts)
 */
export function generateExploreOrder(field: FieldDef): string[] {
  if (field.sequential) {
    return [...field.monsters];
  }

  const monsters = [...field.monsters];
  const result: string[] = [];
  for (let i = 0; i < 5; i++) {
    result.push(monsters[Math.floor(Math.random() * monsters.length)]);
  }
  return result;
}
