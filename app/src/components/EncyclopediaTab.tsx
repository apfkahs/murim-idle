/**
 * 도감 탭 — 몬스터 도감 + 업적
 */
import { useState } from 'react';
import HomeScreen from './encyclopedia/HomeScreen';
import ItemsScreen from './encyclopedia/ItemsScreen';
import EquipmentCodexScreen from './encyclopedia/EquipmentCodexScreen';
import { FieldListScreen, MonsterListScreen, MonsterDetailScreen } from './encyclopedia/MonsterCodex';
import AchievementTab from './AchievementTab';

type EncScreen =
  | { view: 'home' }
  | { view: 'monster_fields' }
  | { view: 'monster_list'; fieldId: string }
  | { view: 'monster_detail'; monsterId: string; fieldId: string }
  | { view: 'achievements' }
  | { view: 'items' }
  | { view: 'equipment_codex' };

export default function EncyclopediaTab() {
  const [screen, setScreen] = useState<EncScreen>({ view: 'home' });

  if (screen.view === 'home') {
    return (
      <HomeScreen
        onMonsters={() => setScreen({ view: 'monster_fields' })}
        onAchievements={() => setScreen({ view: 'achievements' })}
        onItems={() => setScreen({ view: 'items' })}
        onEquipment={() => setScreen({ view: 'equipment_codex' })}
      />
    );
  }
  if (screen.view === 'items') {
    return <ItemsScreen onBack={() => setScreen({ view: 'home' })} />;
  }
  if (screen.view === 'equipment_codex') {
    return <EquipmentCodexScreen onBack={() => setScreen({ view: 'home' })} />;
  }
  if (screen.view === 'monster_fields') {
    return (
      <FieldListScreen
        onBack={() => setScreen({ view: 'home' })}
        onSelect={(fieldId) => setScreen({ view: 'monster_list', fieldId })}
      />
    );
  }
  if (screen.view === 'monster_list') {
    return (
      <MonsterListScreen
        fieldId={screen.fieldId}
        onBack={() => setScreen({ view: 'monster_fields' })}
        onSelect={(id) => setScreen({ view: 'monster_detail', monsterId: id, fieldId: screen.fieldId })}
      />
    );
  }
  if (screen.view === 'monster_detail') {
    return (
      <MonsterDetailScreen
        monsterId={screen.monsterId}
        onBack={() => setScreen({ view: 'monster_list', fieldId: screen.fieldId })}
      />
    );
  }
  if (screen.view === 'achievements') {
    return (
      <div>
        <button className="field-back-btn" style={{ marginBottom: 12 }} onClick={() => setScreen({ view: 'home' })}>← 도감으로</button>
        <AchievementTab />
      </div>
    );
  }
  return null;
}
