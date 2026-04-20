import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/battle.css';
import './styles/battle-log.css';
import './styles/battle-v2.css';
import './styles/field.css';
import './styles/arts.css';
import './styles/modals.css';
import './styles/misc.css';
import './styles/inventory.css';
import './styles/equipment.css';
import './styles/skilltree.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
