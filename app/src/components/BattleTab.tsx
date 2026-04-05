/**
 * 전장 탭 — v1.2
 * 독립 지역 섹션 네비게이션 (중원 / 새외)
 * 천산 대맥 3단계 구조 추가
 */
import { useGameStore } from '../store/gameStore';
import BattleResultScreen from './battle/BattleResultScreen';
import BattleScreen from './battle/BattleScreen';
import FieldNavigation from './battle/FieldNavigation';

export default function BattleTab() {
  const battleMode = useGameStore(s => s.battleMode);
  const battleResult = useGameStore(s => s.battleResult);

  if (battleResult) return <BattleResultScreen />;
  if (battleMode !== 'none') return <BattleScreen />;
  return <FieldNavigation />;
}
