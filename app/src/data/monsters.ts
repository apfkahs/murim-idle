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
  imageKey: string;
  attackMessages?: string[];
}

// 수련장 몬스터
export const TRAINING_MONSTERS: MonsterDef[] = [
  {
    id: 'training_wood',
    name: '나무인형',
    hp: 10, attackPower: 0, attackInterval: 0, regen: 0, simdeuk: 1,
    drops: [{ artId: 'samjae_sword', chance: 1.0 }],
    isTraining: true,
    imageKey: 'training_wood',
  },
  {
    id: 'training_iron',
    name: '철인형',
    hp: 30, attackPower: 0, attackInterval: 0, regen: 2, simdeuk: 3,
    drops: [{ artId: 'samjae_simbeop', chance: 1.0 }],
    isTraining: true,
    imageKey: 'training_iron',
  },
];

// 야산 일반 몬스터 (v1.1 수치)
export const YASAN_MONSTERS: MonsterDef[] = [
  {
    id: 'squirrel', name: '다람쥐',
    hp: 25, attackPower: 4, attackInterval: 3.5, regen: 0, simdeuk: 2,
    drops: [], imageKey: 'squirrel',
    attackMessages: ['다람쥐가 재빠르게 물었다!', '다람쥐가 도토리를 던졌다!'],
  },
  {
    id: 'rabbit', name: '토끼',
    hp: 40, attackPower: 5, attackInterval: 3.0, regen: 0, simdeuk: 4,
    drops: [], imageKey: 'rabbit',
    attackMessages: ['토끼가 뒷발로 찼다!', '토끼가 돌진했다!'],
  },
  {
    id: 'fox', name: '여우',
    hp: 70, attackPower: 8, attackInterval: 2.8, regen: 0, simdeuk: 7,
    drops: [{ artId: 'mudang_step', chance: 0.03 }], imageKey: 'fox',
    attackMessages: ['여우가 꼬리를 휘둘렀다!', '여우가 날카롭게 물었다!'],
  },
  {
    id: 'deer', name: '사슴',
    hp: 110, attackPower: 6, attackInterval: 3.0, regen: 0, simdeuk: 9,
    drops: [], imageKey: 'deer',
    attackMessages: ['사슴이 뿔로 받았다!', '사슴이 돌진해왔다!'],
  },
  {
    id: 'boar', name: '멧돼지',
    hp: 90, attackPower: 14, attackInterval: 2.2, regen: 0, simdeuk: 10,
    drops: [], imageKey: 'boar',
    attackMessages: ['멧돼지가 이빨로 들이받았다!', '멧돼지의 돌진!'],
  },
  {
    id: 'wolf', name: '늑대',
    hp: 160, attackPower: 16, attackInterval: 2.0, regen: 0, simdeuk: 15,
    drops: [{ artId: 'mudang_step', chance: 0.05 }], imageKey: 'wolf',
    attackMessages: ['늑대가 발톱으로 할퀴었다!', '늑대가 물어뜯었다!'],
  },
  {
    id: 'bear', name: '곰',
    hp: 280, attackPower: 22, attackInterval: 2.5, regen: 0, simdeuk: 25,
    drops: [{ artId: 'mudang_step', chance: 0.08 }], imageKey: 'bear',
    attackMessages: ['곰이 거대한 앞발로 내리쳤다!', '곰의 포효와 함께 강타!'],
  },
];

// 히든 몬스터 (v1.1 수치)
export const HIDDEN_MONSTERS: MonsterDef[] = [
  {
    id: 'feiyi', name: '비이',
    hp: 500, attackPower: 24, attackInterval: 2.0, regen: 0, simdeuk: 50,
    drops: [{ artId: 'mudang_step', chance: 0.20 }], isHidden: true, imageKey: 'feiyi',
    attackMessages: ['비이가 네 날개로 돌풍을 일으켰다!', '비이가 독기를 내뿜었다!'],
  },
  {
    id: 'dangkang', name: '당강',
    hp: 750, attackPower: 30, attackInterval: 1.8, regen: 0, simdeuk: 80,
    drops: [], isHidden: true, imageKey: 'dangkang',
    attackMessages: ['당강이 뿔로 들이받았다!', '당강의 거대한 몸이 돌진했다!'],
  },
];

// 야산 보스 (v1.1 수치)
export const YASAN_BOSS: MonsterDef = {
  id: 'tiger_boss', name: '산군',
  hp: 650, attackPower: 28, attackInterval: 1.8, regen: 0, simdeuk: 120,
  drops: [{ artId: 'heupgong', chance: 0.15 }],
  isBoss: true, imageKey: 'tiger_boss',
  attackMessages: ['산군의 발톱이 번개처럼 스쳤다!', '산군이 포효하며 덮쳤다!'],
};

export function getMonsterDef(id: string): MonsterDef | undefined {
  return [...TRAINING_MONSTERS, ...YASAN_MONSTERS, ...HIDDEN_MONSTERS, YASAN_BOSS]
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
