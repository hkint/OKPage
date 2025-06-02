import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from '~/hooks/useTheme'; // Using ~ alias
import '../../assets/global.css'; // Corrected path for global CSS
import './style.css'; // Keep existing styles for now

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
