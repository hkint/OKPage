import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '../../assets/global.css'; // Corrected path for global CSS
import './style.css'; // Keep existing styles for now

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
