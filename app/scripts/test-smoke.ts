import { resetGame, advanceTime, getState, callAction } from '../src/testAdapter';

resetGame();
console.log('초기:', getState().neigong, getState().hp);
advanceTime(60);
console.log('60초 후:', getState().neigong, getState().hp);
callAction('startHunt', 'training', 'training_wood');
advanceTime(30);
console.log('전투 30초 후:', getState().battleMode, getState().hp);
