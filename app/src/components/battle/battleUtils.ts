import type { MonsterDef } from '../../data/monsters';

export const FIELD_DESCRIPTIONS: Record<string, string> = {
  training: '스승이 세워둔 수련 인형들이 묵묵히 서 있다.',
  yasan: '야생의 기운이 감도는 울창한 산길. 무엇이 나올지 모른다.',
  inn: '삐걱거리는 나무 바닥, 수상한 눈빛들. 방심하면 안 된다.',
  cheonsan_jangmak: '영원한 눈보라가 몰아치는 천산의 초입. 차가운 바람이 뼈를 파고든다.',
  cheonsan_godo: '구름 위에 솟은 고원. 공기가 희박하여 내공이 없으면 발을 들이기도 어렵다.',
  cheonsan_simjang: '천산의 심장부. 이곳에 이르는 자는 거의 없다.',
};

export function getMonsterHint(mon: MonsterDef, revealLevel: number): string {
  if (revealLevel < 1) return '';
  // 몬스터별 고유 hint가 정의되어 있으면 우선 사용 (컨셉 톤)
  if (mon.hintText) return mon.hintText;
  const power = mon.hp * mon.attackPower / mon.attackInterval;
  if (power > 8000) return '압도적인 위압감이 느껴진다';
  if (power > 3000) return '상당히 위험해 보인다';
  if (power > 1000) return '만만치 않은 상대다';
  if (power > 300) return '위협적이다';
  if (power > 100) return '조심해야 한다';
  return '약해 보인다';
}
