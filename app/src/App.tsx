import { useState, useEffect, useRef } from 'react';
import { useGameStore, type OfflineResult } from './store/gameStore';
import pkg from '../package.json';
import NeigongTab from './components/NeigongTab';
import ArtsTab from './components/ArtsTab';
import BattleTab from './components/BattleTab';
import InventoryTab from './components/InventoryTab';
import EquipmentTab from './components/EquipmentTab';
import EncyclopediaTab from './components/EncyclopediaTab';
import SaveSlotModal from './components/SaveSlotModal';
import OfflineResultModal from './components/OfflineResultModal';
import EnlightenmentModal from './components/EnlightenmentModal';

type TabId = 'neigong' | 'arts' | 'equipment' | 'inventory' | 'battle' | 'encyclopedia';

const SPEED_CYCLE = [0.5, 1, 2] as const;

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'neigong', icon: '☯', label: '내공/경맥' },
  { id: 'arts', icon: '⚔', label: '무공/능력' },
  { id: 'equipment', icon: '🛡', label: '장비' },
  { id: 'inventory', icon: '📜', label: '전낭' },
  { id: 'battle', icon: '⛰', label: '전장' },
  { id: 'encyclopedia', icon: '📖', label: '도감' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('neigong');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [offlineResult, setOfflineResult] = useState<OfflineResult | null>(null);
  const contentRef = useRef<HTMLElement>(null);

  const tick = useGameStore(s => s.tick);
  const saveGame = useGameStore(s => s.saveGame);
  const loadGame = useGameStore(s => s.loadGame);
  const gameSpeed = useGameStore(s => s.gameSpeed);
  const setGameSpeed = useGameStore(s => s.setGameSpeed);
  const paused = useGameStore(s => s.paused);
  const setPaused = useGameStore(s => s.setPaused);
  const inventoryCount = useGameStore(s => s.inventory.length);
  const battleResult = useGameStore(s => s.battleResult);
  const currentField = useGameStore(s => s.currentField);
  const autoExploreFields = useGameStore(s => s.autoExploreFields);
  const dismissBattleResult = useGameStore(s => s.dismissBattleResult);
  const saveTimerRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);

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
        } catch (e) {
          console.error('[오프라인 진행 오류]', e);
        }
      }
    }
  }, [loadGame]);

  // Tab visibility: catch background time via processOfflineProgress
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      } else {
        if (hiddenAtRef.current !== null) {
          const elapsed = (Date.now() - hiddenAtRef.current) / 1000;
          hiddenAtRef.current = null;
          if (elapsed >= 5) {
            const result = useGameStore.getState().processOfflineProgress(elapsed);
            if (result.elapsedTime > 0) {
              setOfflineResult(result);
            }
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 브라우저/탭 닫을 때 마지막 저장
  useEffect(() => {
    const handleBeforeUnload = () => saveGame();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveGame]);

  // 자동 답파 결과 자동 처리 (탭 전환 무관)
  useEffect(() => {
    const isAutoOn = currentField && autoExploreFields[currentField];
    if ((battleResult?.type === 'explore_win' || battleResult?.type === 'death') && isAutoOn) {
      const delay = battleResult.type === 'explore_win' ? 3000 : 2000;
      const timer = setTimeout(() => dismissBattleResult(), delay);
      return () => clearTimeout(timer);
    }
  }, [battleResult, currentField, autoExploreFields, dismissBattleResult]);

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
    const idx = SPEED_CYCLE.indexOf(current as 0.5 | 1 | 2);
    const next = idx === -1 ? 1 : SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
    setGameSpeed(next);
  }

  function handleTabChange(tabId: TabId) {
    setActiveTab(tabId);
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">무림 방치록</h1>
        <div className="header-buttons">
          <button
            className={`icon-btn speed-btn${gameSpeed !== 1 ? ' active' : ''}`}
            onClick={handleSpeedToggle}
            title="배속 전환"
          >
            {gameSpeed === 0.5 ? '◀ 0.5x' : gameSpeed === 2 ? '▶▶ 2x' : '▶ 1x'}
          </button>
          <button
            className={`icon-btn pause-btn${paused ? ' active' : ''}`}
            onClick={() => setPaused(!paused)}
            title={paused ? '재개' : '일시정지'}
          >
            {paused ? '▶' : '‖'}
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

      <main ref={contentRef} className="app-content">
        {activeTab === 'neigong' && <NeigongTab />}
        {activeTab === 'arts' && <ArtsTab />}
        {activeTab === 'equipment' && <EquipmentTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'battle' && <BattleTab />}
        {activeTab === 'encyclopedia' && <EncyclopediaTab />}
      </main>

      <span className="app-version">v{pkg.version}</span>

      <nav className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
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
