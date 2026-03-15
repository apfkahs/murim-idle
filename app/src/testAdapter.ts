import { useGameStore } from './store/gameStore';

// === 상태 읽기 ===
// gameStore의 현재 상태를 그대로 반환한다.
// 추상화하지 않는다. 유지보수 지점을 하나로 유지하기 위함.
export function getState() {
  return useGameStore.getState();
}

// === 상태 주입 ===
// 특정 빌드 상태를 직접 세팅할 때 사용한다.
// 예: 경맥합 30 상태에서 곰을 테스트하고 싶을 때,
// 0부터 성장시키는 대신 바로 원하는 상태를 주입한다.
//
// ⚠️ 주의: 게임이 정상적으로 도달 가능한 상태를 세팅할 것.
// 불가능한 조합(예: 경지 3인데 무공 0개, 경맥합 100인데 내공 소비 0)은
// 게임 내부의 불변식을 깨뜨려 테스트 결과를 왜곡한다.
// 확실하지 않으면 resetGame() 후 advanceTime으로 성장시키는 방법이 안전하다.
export function setState(partial: Record<string, any>) {
  useGameStore.setState(partial);
}

// === 액션 호출 ===
// gameStore의 어떤 액션이든 이름으로 호출할 수 있다.
// 게임에 액션이 추가/삭제되어도 이 함수를 수정할 필요가 없다.
//
// 사용 예:
//   callAction('investStat', 'gi')
//   callAction('startHunt', 'yasan', 'squirrel')
//   callAction('equipArt', 'samjae_sword')
//   callAction('abandonBattle')
export function callAction(name: string, ...args: any[]): any {
  const store = useGameStore.getState();
  const action = (store as any)[name];
  if (typeof action === 'function') {
    return action(...args);
  }
  throw new Error(`Action "${name}" not found in gameStore`);
}

// === 리셋 (편의 함수) ===
// 자주 사용되므로 별도 제공.
export function resetGame() {
  useGameStore.getState().resetGame();
}

// === 시간 진행 ===
// tick(forceDt)를 반복 호출하여 게임을 빠르게 진행한다.
// 매 반복마다 getState()를 새로 호출하여 최신 상태의 tick을 사용한다.
export function advanceTime(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    useGameStore.getState().tick(1.0);
  }
}

// 매 초마다 상태를 확인하며 시간 진행.
// onTick이 true를 반환하면 중단. 실제 진행한 초를 반환.
export function advanceTimeWithCheck(
  seconds: number,
  onTick: (state: ReturnType<typeof getState>, elapsed: number) => boolean
): number {
  for (let i = 0; i < seconds; i++) {
    useGameStore.getState().tick(1.0);
    if (onTick(useGameStore.getState(), i + 1)) {
      return i + 1;
    }
  }
  return seconds;
}
