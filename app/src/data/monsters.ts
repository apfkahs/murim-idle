/**
 * 몬스터 데이터 (v1.1)
 * atk → attackPower, attackInterval 추가
 */

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  attackPower: number;       // 공격 위력 (1회)
  attackInterval: number;    // 공격 간격 (초). 0이면 공격 안 함
  regen: number;
  simdeuk: number;
  drops: { artId: string; chance: number }[];
  isTraining?: boolean;
  isHidden?: boolean;
  isBoss?: boolean;
  grade: number;             // 0=등급외, 1~∞ (시뮬레이션 기반 수동 부여)
  imageKey: string;
  attackMessages?: string[];
  equipDrops?: { equipId: string; chance: number }[];
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
    hp: 10, attackPower: 0, attackInterval: 0, regen: 0, simdeuk: 1,
    drops: [{ artId: 'samjae_sword', chance: 1.0 }],
    isTraining: true, grade: 0,
    imageKey: 'training_wood',
  },
  {
    id: 'training_iron',
    name: '철인형',
    hp: 30, attackPower: 0, attackInterval: 0, regen: 2, simdeuk: 3,
    drops: [{ artId: 'samjae_simbeop', chance: 1.0 }],
    isTraining: true, grade: 0,
    imageKey: 'training_iron',
  },
];

// 야산 일반 몬스터 (v1.1 수치)
export const YASAN_MONSTERS: MonsterDef[] = [
  {
    id: 'squirrel', name: '다람쥐',
    hp: 25, attackPower: 4, attackInterval: 3.5, regen: 0, simdeuk: 2,
    drops: [], grade: 1, imageKey: 'squirrel',
    attackMessages: ['다람쥐가 재빠르게 물었다!', '다람쥐가 도토리를 던졌다!'],
  },
  {
    id: 'rabbit', name: '토끼',
    hp: 40, attackPower: 5, attackInterval: 3.0, regen: 0, simdeuk: 4,
    drops: [], grade: 1, imageKey: 'rabbit',
    attackMessages: ['토끼가 뒷발로 찼다!', '토끼가 돌진했다!'],
  },
  {
    id: 'fox', name: '여우',
    hp: 70, attackPower: 8, attackInterval: 2.8, regen: 0, simdeuk: 7,
    drops: [], grade: 1, imageKey: 'fox',
    attackMessages: ['여우가 꼬리를 휘둘렀다!', '여우가 날카롭게 물었다!'],
  },
  {
    id: 'deer', name: '사슴',
    hp: 110, attackPower: 6, attackInterval: 3.0, regen: 0, simdeuk: 9,
    drops: [], grade: 1, imageKey: 'deer',
    attackMessages: ['사슴이 뿔로 받았다!', '사슴이 돌진해왔다!'],
  },
  {
    id: 'boar', name: '멧돼지',
    hp: 90, attackPower: 14, attackInterval: 2.2, regen: 0, simdeuk: 10,
    drops: [], grade: 1, imageKey: 'boar',
    attackMessages: ['멧돼지가 이빨로 들이받았다!', '멧돼지의 돌진!'],
  },
  {
    id: 'wolf', name: '늑대',
    hp: 160, attackPower: 16, attackInterval: 2.0, regen: 0, simdeuk: 15,
    drops: [], grade: 2, imageKey: 'wolf',
    attackMessages: ['늑대가 발톱으로 할퀴었다!', '늑대가 물어뜯었다!'],
  },
  {
    id: 'bear', name: '곰',
    hp: 280, attackPower: 22, attackInterval: 2.5, regen: 0, simdeuk: 25,
    drops: [], grade: 3, imageKey: 'bear',
    attackMessages: ['곰이 거대한 앞발로 내리쳤다!', '곰의 포효와 함께 강타!'],
  },
];

// 히든 몬스터 (v1.1 수치)
export const HIDDEN_MONSTERS: MonsterDef[] = [
  {
    id: 'feiyi', name: '비이',
    hp: 500, attackPower: 24, attackInterval: 2.0, regen: 0, simdeuk: 50,
    drops: [], isHidden: true, grade: 3, imageKey: 'feiyi',
    attackMessages: ['비이가 네 날개로 돌풍을 일으켰다!', '비이가 독기를 내뿜었다!'],
  },
  {
    id: 'dangkang', name: '당강',
    hp: 750, attackPower: 30, attackInterval: 1.8, regen: 0, simdeuk: 80,
    drops: [], isHidden: true, grade: 4, imageKey: 'dangkang',
    attackMessages: ['당강이 뿔로 들이받았다!', '당강의 거대한 몸이 돌진했다!'],
  },
];

// 객잔 일반 몬스터
export const INN_MONSTERS: MonsterDef[] = [
  {
    id: 'drunk_thug', name: '취한 건달',
    hp: 80, attackPower: 6, attackInterval: 3.0, regen: 0,
    simdeuk: 18,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 1, imageKey: 'drunk_thug',
    attackMessages: ['건달이 비틀거리며 주먹을 휘둘렀다!', '건달이 술병을 내던졌다!'],
  },
  {
    id: 'peddler', name: '떠돌이 행상',
    hp: 120, attackPower: 9, attackInterval: 2.8, regen: 0,
    simdeuk: 20,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 1, imageKey: 'peddler',
    attackMessages: ['행상이 짐짝을 휘둘렀다!', '행상이 지팡이로 내리쳤다!'],
  },
  {
    id: 'troublemaker', name: '객잔 말썽꾼',
    hp: 100, attackPower: 12, attackInterval: 2.5, regen: 0,
    simdeuk: 22,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 1, imageKey: 'troublemaker',
    attackMessages: ['말썽꾼이 의자를 집어 던졌다!', '말썽꾼의 거친 주먹이 날아온다!'],
  },
  {
    id: 'wanderer', name: '떠돌이 무사',
    hp: 180, attackPower: 14, attackInterval: 2.4, regen: 0,
    simdeuk: 35,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 2, imageKey: 'wanderer',
    attackMessages: ['무사가 빠르게 검을 뽑아 베었다!', '무사의 날카로운 일격!'],
  },
  {
    id: 'bounty_hunter', name: '현상금 사냥꾼',
    hp: 150, attackPower: 18, attackInterval: 2.2, regen: 0,
    simdeuk: 40,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 2, imageKey: 'bounty_hunter',
    attackMessages: ['사냥꾼이 단검을 던졌다!', '사냥꾼의 정확한 급소 공격!'],
  },
  {
    id: 'ronin', name: '흑도 낭인',
    hp: 250, attackPower: 16, attackInterval: 2.0, regen: 0,
    simdeuk: 55,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 3, imageKey: 'ronin',
    attackMessages: ['낭인이 묵직한 도를 내리쳤다!', '낭인이 어둠 속에서 베어냈다!'],
  },
  {
    id: 'bandit_chief', name: '삼류 도적 두목',
    hp: 320, attackPower: 24, attackInterval: 2.0, regen: 0,
    simdeuk: 80,
    drops: [], // TODO: 기획자 설계 후 반영
    grade: 3, imageKey: 'bandit_chief',
    attackMessages: ['두목이 쌍도를 휘둘렀다!', '두목의 기합과 함께 강타!'],
  },
];

// 객잔 히든 몬스터
export const INN_HIDDEN_MONSTERS: MonsterDef[] = [
  {
    id: 'masked_swordsman', name: '가면 쓴 검객',
    hp: 600, attackPower: 28, attackInterval: 1.8, regen: 0,
    simdeuk: 120,
    drops: [], // TODO: 기획자 설계 후 반영
    isHidden: true, grade: 4, imageKey: 'masked_swordsman',
    attackMessages: ['검객의 검이 섬광처럼 스쳤다!', '가면 뒤에서 살기가 뿜어져 나왔다!'],
  },
  {
    id: 'innkeeper_true', name: '객잔 주인 (본모습)',
    hp: 900, attackPower: 20, attackInterval: 1.5, regen: 0,
    simdeuk: 160,
    drops: [], // TODO: 기획자 설계 후 반영
    isHidden: true, grade: 4, imageKey: 'innkeeper_true',
    attackMessages: ['주인의 손가락이 번개처럼 혈도를 찔렀다!', '주인이 가볍게 손을 뻗었는데 엄청난 장력이!'],
  },
];

// 객잔 보스
export const INN_BOSS: MonsterDef = {
  id: 'bandit_leader', name: '흑풍채 채주',
  hp: 800, attackPower: 32, attackInterval: 1.6, regen: 0,
  simdeuk: 200,
  drops: [], // TODO: 기획자 설계 후 반영
  isBoss: true, grade: 4, imageKey: 'bandit_leader',
  attackMessages: ['채주의 대도가 바람을 가르며 내려왔다!', '채주가 포효하며 흑풍을 일으켰다!'],
};

// 야산 보스 (v1.1 수치)
export const YASAN_BOSS: MonsterDef = {
  id: 'tiger_boss', name: '산군',
  hp: 650, attackPower: 28, attackInterval: 1.8, regen: 0, simdeuk: 120,
  drops: [],
  isBoss: true, grade: 4, imageKey: 'tiger_boss',
  attackMessages: ['산군의 발톱이 번개처럼 스쳤다!', '산군이 포효하며 덮쳤다!'],
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
