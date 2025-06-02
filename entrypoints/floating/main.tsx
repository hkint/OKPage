import React from 'react';
import ReactDOM from 'react-dom/client';
import FloatingPanel from '../../components/FloatingPanel'; // Adjusted path
import '../../assets/global.css'; // Corrected path for global CSS
import './style.css'; // Keep existing styles for now

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FloatingPanel />
  </React.StrictMode>
);
