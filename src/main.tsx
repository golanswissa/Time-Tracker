import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initCloudSync } from './cloudSync';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Durable cloud persistence (no-op until Supabase env vars are set).
initCloudSync();
