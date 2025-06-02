import React from 'react';
import ReactDOM from 'react-dom/client';
import FloatingApp from './FloatingApp'; // New root component
import { ThemeProvider } from '~/hooks/useTheme'; // ThemeProvider import
import '../../assets/global.css'; // Corrected path for global CSS
import './style.css'; // Keep existing styles for now

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <FloatingApp />
    </ThemeProvider>
  </React.StrictMode>
);
