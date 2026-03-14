import { useState, useEffect, useRef } from 'react';
import { useGameStore, type OfflineResult } from './store/gameStore';
import NeigongTab from './components/NeigongTab';
import ArtsTab from './components/ArtsTab';
import BattleTab from './components/BattleTab';
import InventoryTab from './components/InventoryTab';
import AchievementTab from './components/AchievementTab';
import SaveSlotModal from './components/SaveSlotModal';
import OfflineResultModal from './components/OfflineResultModal';
import EnlightenmentModal from './components/EnlightenmentModal';

type TabId = 'neigong' | 'arts' | 'inventory' | 'battle' | 'achievement';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'neigong', icon: '☯', label: '내공/경맥' },
  { id: 'arts', icon: '⚔', label: '무공/능력' },
  { id: 'inventory', icon: '📜', label: '전낭' },
  { id: 'battle', icon: '⛰', label: '전장' },
  { id: 'achievement', icon: '★', label: '업적' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('neigong');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [offlineResult, setOfflineResult] = useState<OfflineResult | null>(null);

  const tick = useGameStore(s => s.tick);
  const saveGame = useGameStore(s => s.saveGame);
  const loadGame = useGameStore(s => s.loadGame);
  const gameSpeed = useGameStore(s => s.gameSpeed);
  const setGameSpeed = useGameStore(s => s.setGameSpeed);
  const inventoryCount = useGameStore(s => s.inventory.length);
  const saveTimerRef = useRef(0);

  // Load game on mount + offline progress
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const currentSlot = parseInt(localStorage.getItem('murim_save_current') ?? '0', 10);
      loadGame(currentSlot);

      // 오프라인 진행 계산
      const raw = localStorage.getItem(`murim_save_slot_${currentSlot}`);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          const lastTick = data.lastTickTime ?? Date.now();
          const elapsed = (Date.now() - lastTick) / 1000;
          if (elapsed >= 5) {
            const result = useGameStore.getState().processOfflineProgress(elapsed);
            setOfflineResult(result);
          }
        } catch {
          // ignore
        }
      }
    }
  }, [loadGame]);

  // Game loop: 1s ticks
  useEffect(() => {
    const interval = setInterval(() => {
      tick();
      saveTimerRef.current++;
      if (saveTimerRef.current >= 30) {
        saveGame();
        saveTimerRef.current = 0;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tick, saveGame]);

  function handleSpeedToggle() {
    const current = useGameStore.getState().gameSpeed;
    setGameSpeed(current === 1 ? 2 : 1);
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">무림 방치록</h1>
        <div className="header-buttons">
          <button
            className={`icon-btn speed-btn${gameSpeed === 2 ? ' active' : ''}`}
            onClick={handleSpeedToggle}
            title="배속 전환"
          >
            {gameSpeed === 1 ? '\u25B6 1x' : '\u25B6\u25B6 2x'}
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowSaveModal(true)}
            title="저장/불러오기"
          >
            💾
          </button>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'neigong' && <NeigongTab />}
        {activeTab === 'arts' && <ArtsTab />}
        {activeTab === 'inventory' && <InventoryTab />}
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
            {tab.id === 'inventory' && inventoryCount > 0 && (
              <span className="tab-badge">{inventoryCount}</span>
            )}
          </button>
        ))}
      </nav>

      {showSaveModal && (
        <SaveSlotModal onClose={() => setShowSaveModal(false)} />
      )}

      {offlineResult && (
        <OfflineResultModal
          result={offlineResult}
          onClose={() => setOfflineResult(null)}
        />
      )}

      <EnlightenmentModal />
    </div>
  );
}
