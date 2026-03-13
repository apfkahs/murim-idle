import { useState, useEffect, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import NeigongTab from './components/NeigongTab';
import ArtsTab from './components/ArtsTab';
import BattleTab from './components/BattleTab';
import AchievementTab from './components/AchievementTab';

type TabId = 'neigong' | 'arts' | 'battle' | 'achievement';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'neigong', icon: '☯', label: '내공/경맥' },
  { id: 'arts', icon: '⚔', label: '무공/능력' },
  { id: 'battle', icon: '⛰', label: '전장' },
  { id: 'achievement', icon: '★', label: '업적' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('neigong');
  const tick = useGameStore(s => s.tick);
  const saveGame = useGameStore(s => s.saveGame);
  const loadGame = useGameStore(s => s.loadGame);
  const resetGame = useGameStore(s => s.resetGame);
  const saveTimerRef = useRef(0);

  // Load game on mount
  useEffect(() => {
    loadGame();
  }, [loadGame]);

  // Game loop: ~200ms ticks
  useEffect(() => {
    const interval = setInterval(() => {
      tick();
      saveTimerRef.current++;
      if (saveTimerRef.current >= 30) { // ~30 seconds (30 x 1s)
        saveGame();
        saveTimerRef.current = 0;
      }
    }, 1000); // v1.1: 1초 틱
    return () => clearInterval(interval);
  }, [tick, saveGame]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">무림 방치록</h1>
        <div className="header-buttons">
          <button className="icon-btn" onClick={saveGame} title="저장">💾</button>
          <button className="icon-btn" onClick={() => {
            if (confirm('정말 초기화하시겠습니까? 모든 진행이 삭제됩니다.')) {
              resetGame();
            }
          }} title="초기화">🗑️</button>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'neigong' && <NeigongTab />}
        {activeTab === 'arts' && <ArtsTab />}
        {activeTab === 'battle' && <BattleTab />}
        {activeTab === 'achievement' && <AchievementTab />}
      </main>

      <nav className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
