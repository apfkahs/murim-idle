import { resetGame, advanceTime, getState, callAction } from '../src/testAdapter';

resetGame();
const s0 = getState();
console.log('초기:', s0.neigong, s0.hp, JSON.stringify(s0.fieldUnlocks));

advanceTime(60);
const s1 = getState();
console.log('60초 후 내공:', s1.neigong.toFixed(1), 'HP:', s1.hp.toFixed(1));

callAction('startHunt', 'training', 'training_wood');
advanceTime(30);
const s2 = getState();
console.log('전투 30초 후:', s2.battleMode, s2.hp.toFixed(1));
console.log('activeMasteries:', JSON.stringify(s2.activeMasteries));
console.log('gameSpeed:', s2.gameSpeed);
console.log('currentSaveSlot:', s2.currentSaveSlot);
console.log('fieldUnlocks:', JSON.stringify(s2.fieldUnlocks));

// 심화학습 테스트 - 무공이 없으면 활성화 안 됨
try {
  callAction('activateMastery', 'samjae_sword', 'samjae_sword_residual');
  console.log('심화학습 활성화 시도됨 (장착 중이면 성공)');
} catch (e: any) {
  console.log('심화학습 에러 (예상됨):', e.message);
}

console.log('SMOKE TEST PASSED');
