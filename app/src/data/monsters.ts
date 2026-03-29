/**
 * 몬스터 데이터 (v1.2)
 * 보스 패턴 시스템 추가
 */

// ── 보스 스킬/패턴 ──
export interface BossSkillDef {
  id: string;
  type: 'stun' | 'rage_attack' | 'replace_normal' | 'charged_attack';
  triggerCondition: 'stamina_full' | 'hp_threshold' | 'default';
  staminaCost?: number;
  staminaGain?: number;
  hpThreshold?: number;
  oneTime?: boolean;
  stunDuration?: number;
  damageMultiplier?: number;
  useNormalDamage?: boolean;
  undodgeable?: boolean;
  logMessages: string[];
  priority?: number;
}

export interface BossPatternDef {
  stamina: { initial: number; max: number; regenPerSec: number };
  skills: BossSkillDef[];
}

export const BOSS_PATTERNS: Record<string, BossPatternDef> = {
  tiger_boss: {
    stamina: { initial: 25, max: 25, regenPerSec: 0.8 },
    skills: [
      {
        id: 'tiger_roar', type: 'stun', triggerCondition: 'stamina_full',
        staminaCost: 25, stunDuration: 4, undodgeable: false, priority: 1,
        logMessages: ['무시무시한 포효에 온몸이 얼어붙었다...'],
      },
      {
        id: 'tiger_rage', type: 'rage_attack', triggerCondition: 'hp_threshold',
        hpThreshold: 0.3, oneTime: true, damageMultiplier: 3.5, undodgeable: true, priority: 2,
        logMessages: ['산군의 분노! 산군이 남아있는 힘을 모아 강력한 일격을 가했다!!'],
      },
    ],
  },
  dangkang: {
    stamina: { initial: 0, max: 50, regenPerSec: 0 },
    skills: [
      {
        id: 'earth_shatter', type: 'charged_attack', triggerCondition: 'stamina_full',
        staminaCost: 50, damageMultiplier: 10, undodgeable: true, priority: 1,
        logMessages: ['대지분쇄(大地粉碎)! 당강이 땅을 내리찍자 대지가 갈라졌다!', '대지분쇄(大地粉碎)! 산이 울릴 정도의 충격이 몸을 관통했다!'],
      },
      {
        id: 'harvest_qi', type: 'replace_normal', triggerCondition: 'default',
        staminaGain: 10, useNormalDamage: false, undodgeable: false, priority: 0,
        logMessages: ['당강이 풍년의 기운을 내뿜었다!', '당강의 몸에서 대지의 기운이 흘러나왔다!', '당강이 뿔을 들이밀며 기운을 모은다!'],
      },
    ],
  },
};

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  attackPower: number;       // 공격 위력 (1회)
  attackInterval: number;    // 공격 간격 (초). 0이면 공격 안 함
  regen: number;
  simdeuk: number;
  baseProficiency?: number;  // 숙련도 획득 기본값 (등급 배율 적용 전)
  drops: { artId: string; chance: number }[];
  isTraining?: boolean;
  isHidden?: boolean;
  isBoss?: boolean;
  grade: number;             // 0=등급외, 1~∞ (시뮬레이션 기반 수동 부여)
  imageKey: string;
  attackMessages?: string[];
  equipDrops?: { equipId: string; chance: number }[];
  materialDrops?: { materialId: string; chance: number }[];
  description?: string;      // 도감 설명 (10마리 처치 시 해금)
}

const GRADE_NAMES = ['등급외', '1등급', '2등급', '3등급', '4등급'];

/** 등급명 조회 (5등급 이상은 "N등급" 형식) */
export function getGradeName(grade: number): string {
  return GRADE_NAMES[grade] ?? `${grade}등급`;
}

/** 참고용 전투력 산출 (등급 판정 보조) */
export function getMonsterPower(m: MonsterDef): number {
  if (m.attackInterval === 0) return 0;
  const base = m.hp * m.attackPower / m.attackInterval;
  return m.isBoss ? base * 1.5 : base;
}

// 수련장 몬스터
export const TRAINING_MONSTERS: MonsterDef[] = [
  {
    id: 'training_wood',
    name: '나무인형',
    hp: 10, attackPower: 0, attackInterval: 0, regen: 0, simdeuk: 1, baseProficiency: 50,
    drops: [{ artId: 'samjae_sword', chance: 1.0 }],
    materialDrops: [{ materialId: 'wood_fragment', chance: 0.4 }],
    isTraining: true, grade: 0,
    imageKey: 'training_wood',
    description: '무림에 입문한 자들이 처음으로 마주하는 상대. 수천 번의 타격을 견뎌온 낡은 목체(木體)에서 선배 무인들의 땀 냄새가 난다. 이 인형을 이기지 못하면 진짜 무인을 마주할 자격이 없다.',
  },
  {
    id: 'training_iron',
    name: '철인형',
    hp: 30, attackPower: 0, attackInterval: 0, regen: 2, simdeuk: 3, baseProficiency: 100,
    drops: [{ artId: 'samjae_simbeop', chance: 1.0 }],
    materialDrops: [{ materialId: 'iron_fragment', chance: 0.4 }],
    isTraining: true, grade: 0,
    imageKey: 'training_iron',
    description: '단단한 무쇠로 빚어진 수련 인형. 아무리 강한 일격도 흠집조차 남기기 어렵다 하나, 올바른 내공을 담은 일격만은 통한다고 한다. 몸 전체로 내력을 느끼게 하는 최고의 스승.',
  },
];

// 야산 일반 몬스터 (v1.1 수치)
export const YASAN_MONSTERS: MonsterDef[] = [
  {
    id: 'squirrel', name: '다람쥐',
    hp: 25, attackPower: 4, attackInterval: 3.5, regen: 0, simdeuk: 2, baseProficiency: 1,
    drops: [], grade: 1, imageKey: 'squirrel',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.10 }],
    attackMessages: ['다람쥐가 재빠르게 물었다!', '다람쥐가 도토리를 던졌다!'],
    description: '야산 어귀를 쉼 없이 오가는 작은 짐승이다. 도토리 하나를 지키기 위해 사람에게도 달려드는 대담함이 있으나, 내공 앞엔 어이없이 무너진다. 수련을 막 시작한 무인이 기운을 익히기에 적당한 상대.',
  },
  {
    id: 'rabbit', name: '토끼',
    hp: 40, attackPower: 5, attackInterval: 3.0, regen: 0, simdeuk: 4, baseProficiency: 1,
    drops: [], grade: 1, imageKey: 'rabbit',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.10 }],
    attackMessages: ['토끼가 뒷발로 찼다!', '토끼가 돌진했다!'],
    description: '언뜻 보면 무해한 야생 토끼이지만, 위협받으면 뒷발 차기를 날린다. 몸이 가볍고 방향 전환이 빨라 허점을 잡기 전까진 의외로 성가신 상대다.',
  },
  {
    id: 'fox', name: '여우',
    hp: 70, attackPower: 8, attackInterval: 2.8, regen: 0, simdeuk: 7, baseProficiency: 2,
    drops: [], grade: 1, imageKey: 'fox',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.10 }],
    attackMessages: ['여우가 꼬리를 휘둘렀다!', '여우가 날카롭게 물었다!'],
    description: '영리하고 간사하여 상대의 허점을 끈질기게 기다릴 줄 안다. 날카로운 이빨과 꼬리치기가 특기이며, 섣불리 덤볐다간 제법 쪽팔린 꼴을 당하기 쉽다.',
  },
  {
    id: 'deer', name: '사슴',
    hp: 110, attackPower: 6, attackInterval: 3.0, regen: 0, simdeuk: 9, baseProficiency: 2,
    drops: [], grade: 1, imageKey: 'deer',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.10 }],
    attackMessages: ['사슴이 뿔로 받았다!', '사슴이 돌진해왔다!'],
    description: '야산에서 가장 온순한 외모를 지닌 짐승이나, 뿔로 들이받는 힘은 결코 가볍지 않다. 분노하면 무작정 돌진하는 성질이 있으니, 겉모습에 방심했다간 혼이 날 것이다.',
  },
  {
    id: 'boar', name: '멧돼지',
    hp: 90, attackPower: 14, attackInterval: 2.2, regen: 0, simdeuk: 10, baseProficiency: 3,
    drops: [], grade: 1, imageKey: 'boar',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.10 }],
    attackMessages: ['멧돼지가 이빨로 들이받았다!', '멧돼지의 돌진!'],
    description: '울퉁불퉁한 몸통과 날카로운 엄니로 야산을 누비는 짐승이다. 한번 달려들면 방향을 바꾸지 않는 단순한 습성이지만, 그 돌진의 파괴력은 초보 무인에겐 충분히 위협적이다.',
  },
  {
    id: 'wolf', name: '늑대',
    hp: 160, attackPower: 16, attackInterval: 2.0, regen: 0, simdeuk: 15, baseProficiency: 2,
    drops: [], grade: 2, imageKey: 'wolf',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.20 }],
    attackMessages: ['늑대가 발톱으로 할퀴었다!', '늑대가 물어뜯었다!'],
    description: '홀로 산을 떠도는 이리다. 무리에서 쫓겨난 것인지 스스로 선택한 고독인지는 알 수 없다. 발톱이 날카롭고 반응이 빠르며, 상대가 흔들리는 순간을 귀신같이 포착한다.',
  },
  {
    id: 'bear', name: '곰',
    hp: 280, attackPower: 22, attackInterval: 2.5, regen: 0, simdeuk: 25, baseProficiency: 2,
    drops: [], grade: 3, imageKey: 'bear',
    materialDrops: [{ materialId: 'torn_paper', chance: 0.30 }],
    attackMessages: ['곰이 거대한 앞발로 내리쳤다!', '곰의 포효와 함께 강타!'],
    description: '야산의 군주라 불리는 큰 곰이다. 맞닥뜨리는 순간 터져 나오는 포효 하나만으로 간담을 서늘하게 만든다. 거대한 앞발 한 방이면 웬만한 무인은 날아간다는 말이 있다.',
  },
];

// 히든 몬스터
export const HIDDEN_MONSTERS: MonsterDef[] = [
  {
    id: 'dangkang', name: '당강',
    hp: 750, attackPower: 30, attackInterval: 3.0, regen: 0, simdeuk: 80, baseProficiency: 5,
    drops: [], isHidden: true, grade: 4, imageKey: 'dangkang',
    attackMessages: ['당강이 뿔로 들이받았다!', '당강의 거대한 몸이 돌진했다!'],
    equipDrops: [{ equipId: 'gusan_gloves', chance: 1.0 }],
    description: '전설 속에만 존재한다는 대형 짐승. 풍요의 신령이 깃든 몸에서 대지의 기운이 흘러나오며, 뿔에 한 번 받히면 산도 무너진다는 말이 있다. 마주했다는 것 자체가 이미 행운인지 불운인지 모를 일.',
  },
];

// 객잔 일반 몬스터
export const INN_MONSTERS: MonsterDef[] = [
  {
    id: 'drunk_thug', name: '취한 건달',
    hp: 80, attackPower: 6, attackInterval: 3.0, regen: 0,
    simdeuk: 18, baseProficiency: 18,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 1, imageKey: 'drunk_thug',
    attackMessages: ['건달이 비틀거리며 주먹을 휘둘렀다!', '건달이 술병을 내던졌다!'],
    description: '낮부터 술독에 빠져 객잔을 어지럽히는 자다. 취기로 인해 판단력이 무뎌졌으나, 술주정으로 단련된 막무가내 주먹질이 의외로 성가시다. 무림인이 상대하기엔 너무 아까운 상대.',
  },
  {
    id: 'peddler', name: '떠돌이 행상',
    hp: 120, attackPower: 9, attackInterval: 2.8, regen: 0,
    simdeuk: 20, baseProficiency: 20,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 1, imageKey: 'peddler',
    attackMessages: ['행상이 짐짝을 휘둘렀다!', '행상이 지팡이로 내리쳤다!'],
    description: '객잔을 드나들며 온갖 물건을 팔아치우는 상인이다. 낯선 이에게는 경계심이 강하고, 짐짝을 무기 삼아 싸우는 요령이 몸에 배어있다. 본업은 장사이지만 뒤가 구린 구석이 있어 보인다.',
  },
  {
    id: 'troublemaker', name: '객잔 말썽꾼',
    hp: 100, attackPower: 12, attackInterval: 2.5, regen: 0,
    simdeuk: 22, baseProficiency: 22,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 1, imageKey: 'troublemaker',
    attackMessages: ['말썽꾼이 의자를 집어 던졌다!', '말썽꾼의 거친 주먹이 날아온다!'],
    description: '사사건건 트집을 잡으며 객잔의 분위기를 망치는 자다. 의자와 술상을 마구 집어 던지는 거친 싸움 방식으로 무고한 이들을 괴롭힌다. 상대하다 보면 이게 무림인인지 건달인지 헷갈린다.',
  },
  {
    id: 'wanderer', name: '떠돌이 무사',
    hp: 180, attackPower: 14, attackInterval: 2.4, regen: 0,
    simdeuk: 35, baseProficiency: 35,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 2, imageKey: 'wanderer',
    attackMessages: ['무사가 빠르게 검을 뽑아 베었다!', '무사의 날카로운 일격!'],
    description: '정처 없이 강호를 떠도는 2류 무인이다. 제법 무공을 익혔으나 뜻을 이루지 못하고 객잔에서 술로 세월을 보내고 있다. 칼을 뽑는 속도만큼은 일류에 버금간다는 소문이 있다.',
  },
  {
    id: 'bounty_hunter', name: '현상금 사냥꾼',
    hp: 150, attackPower: 18, attackInterval: 2.2, regen: 0,
    simdeuk: 40, baseProficiency: 40,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 2, imageKey: 'bounty_hunter',
    attackMessages: ['사냥꾼이 단검을 던졌다!', '사냥꾼의 정확한 급소 공격!'],
    description: '돈이 되는 일이라면 가리지 않는 자다. 정확한 급소 공격과 단검 투척이 특기이며, 상대를 분석하는 눈썰미가 예사롭지 않다. 오늘 당신이 쫓기는 신세가 아니길 바랄 따름이다.',
  },
  {
    id: 'ronin', name: '흑도 낭인',
    hp: 250, attackPower: 16, attackInterval: 2.0, regen: 0,
    simdeuk: 55, baseProficiency: 55,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 3, imageKey: 'ronin',
    attackMessages: ['낭인이 묵직한 도를 내리쳤다!', '낭인이 어둠 속에서 베어냈다!'],
    description: '어두운 무공을 익힌 떠도는 검사다. 명문 정파에서 쫓겨났다는 소문도 있고, 스스로 사파(邪派)에 몸을 던졌다는 말도 있다. 무겁고 불규칙한 도법(刀法)이 맞닥뜨리는 이를 당혹스럽게 만든다.',
  },
  {
    id: 'bandit_chief', name: '삼류 도적 두목',
    hp: 320, attackPower: 24, attackInterval: 2.0, regen: 0,
    simdeuk: 80, baseProficiency: 80,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 3, imageKey: 'bandit_chief',
    attackMessages: ['두목이 쌍도를 휘둘렀다!', '두목의 기합과 함께 강타!'],
    description: '일대의 소패(小霸)를 자처하는 도적 집단의 우두머리다. 쌍도(雙刀)를 들고 호기롭게 덤벼들지만, 강호에 내로라하는 고수들에게는 삼류라는 평가를 벗어나지 못하고 있다.',
  },
];

// 객잔 히든 몬스터
export const INN_HIDDEN_MONSTERS: MonsterDef[] = [
  {
    id: 'masked_swordsman', name: '가면 쓴 검객',
    hp: 600, attackPower: 28, attackInterval: 1.8, regen: 0,
    simdeuk: 120, baseProficiency: 120,
    drops: [], // TODO: 기획자 설계 후 반영
    isHidden: true, grade: 4, imageKey: 'masked_swordsman',
    attackMessages: ['검객의 검이 섬광처럼 스쳤다!', '가면 뒤에서 살기가 뿜어져 나왔다!'],
    description: '객잔 한켠에 조용히 앉아 있다가 어느 순간 홀연히 나타난 자다. 가면 뒤의 얼굴은 물론 이름도 출신도 알 수 없다. 그러나 뽑아 드는 검에서 느껴지는 살기만은 거짓이 없다.',
  },
  {
    id: 'innkeeper_true', name: '객잔 주인 (본모습)',
    hp: 900, attackPower: 20, attackInterval: 1.5, regen: 0,
    simdeuk: 160, baseProficiency: 160,
    drops: [], // TODO: 기획자 설계 후 반영
    isHidden: true, grade: 4, imageKey: 'innkeeper_true',
    attackMessages: ['주인의 손가락이 번개처럼 혈도를 찔렀다!', '주인이 가볍게 손을 뻗었는데 엄청난 장력이!'],
    description: '오랫동안 객잔을 운영하며 평범한 노인처럼 보였으나, 그 뒤에 감춰진 경지가 드러나는 순간 모든 것이 달라진다. 손가락 하나로 혈도를 짚는 지법(指法)의 정수를 몸에 담고 있다.',
  },
];

// 객잔 보스
export const INN_BOSS: MonsterDef = {
  id: 'bandit_leader', name: '흑풍채 채주',
  hp: 800, attackPower: 32, attackInterval: 1.6, regen: 0,
  simdeuk: 200, baseProficiency: 400,
  drops: [], // TODO: 기획자 설계 후 반영
  isBoss: true, grade: 4, imageKey: 'bandit_leader',
  attackMessages: ['채주의 대도가 바람을 가르며 내려왔다!', '채주가 포효하며 흑풍을 일으켰다!'],
  description: '흑풍채를 이끄는 수장이다. 한때 강호에서 이름을 날리던 무인이 타락의 길을 걸어 이 자리에 이르렀다. 검은 바람을 일으키는 대도법(大刀法)으로 수하들에게 절대적인 공포를 심어놓고 있다.',
};

// 야산 보스 (v1.1 수치)
export const YASAN_BOSS: MonsterDef = {
  id: 'tiger_boss', name: '산군',
  hp: 650, attackPower: 28, attackInterval: 1.8, regen: 0, simdeuk: 120, baseProficiency: 5,
  drops: [],
  isBoss: true, grade: 4, imageKey: 'tiger_boss',
  attackMessages: ['산군의 발톱이 번개처럼 스쳤다!', '산군이 포효하며 덮쳤다!'],
  description: '야산 전체를 세력권으로 삼는 호랑이의 왕이다. 산군(山君)이라 불리며 야산의 모든 생명이 그 앞에 머리를 조아린다. 포효 하나로 하늘을 진동시키고, 노하면 3리 밖에서도 그 살기가 느껴진다.',
};

export function getMonsterDef(id: string): MonsterDef | undefined {
  return [...TRAINING_MONSTERS, ...YASAN_MONSTERS, ...HIDDEN_MONSTERS, YASAN_BOSS,
          ...INN_MONSTERS, ...INN_HIDDEN_MONSTERS, INN_BOSS]
    .find(m => m.id === id);
}

/** 몬스터 공격 메시지 랜덤 선택 */
export function getMonsterAttackMsg(monDef: MonsterDef, damage: number): string {
  const msgs = monDef.attackMessages;
  if (!msgs || msgs.length === 0) {
    return `${monDef.name}의 공격! ${damage} 피해.`;
  }
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  return `${msg} ${damage} 피해.`;
}
