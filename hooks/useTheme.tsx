import React, { createContext, useContext, useEffect, useState } from 'react';
// Reverting to chrome.storage.sync as WXT storage import is problematic

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme; // User's preference: light, dark, or system
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark'; // Actual theme being applied
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system'); // User's selected preference
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light'); // Actual applied theme

  // Load initial theme from storage
  useEffect(() => {
    const loadThemePreference = () => {
      // Check if chrome.storage is available (it might not be in some testing/SSR environments)
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['theme'], (result) => {
          if (chrome.runtime.lastError) {
            console.error("Failed to load theme from chrome.storage.sync:", chrome.runtime.lastError);
            setThemeState('system'); // Fallback
            return;
          }
          const storedTheme = result.theme as Theme;
          if (storedTheme) {
            setThemeState(storedTheme);
          } else {
            setThemeState('system'); // Default if nothing is stored
          }
        });
      } else {
        console.warn("chrome.storage.sync not available. Defaulting theme to 'system'.");
        setThemeState('system'); // Fallback if storage API is not there
      }
    };
    loadThemePreference();
  }, []);

  // Apply theme and save preference whenever 'theme' state changes
  useEffect(() => {
    const root = window.document.documentElement;
    let currentAppliedTheme: 'light' | 'dark';

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentAppliedTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
      currentAppliedTheme = theme;
    }

    root.classList.remove(currentAppliedTheme === 'dark' ? 'light' : 'dark');
    root.classList.add(currentAppliedTheme);
    setEffectiveTheme(currentAppliedTheme); // Update the effective theme state

    // Save the user's preference (light, dark, or system)
    if (theme && chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ theme: theme }, () => {
        if (chrome.runtime.lastError) {
          console.error("Failed to save theme to chrome.storage.sync:", chrome.runtime.lastError);
        }
      });
    }
  }, [theme]);

  // Listener for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') { // Only re-apply if current preference is 'system'
        const newSystemTheme = e.matches ? 'dark' : 'light';
        const root = window.document.documentElement;
        root.classList.remove(newSystemTheme === 'dark' ? 'light' : 'dark');
        root.classList.add(newSystemTheme);
        setEffectiveTheme(newSystemTheme); // Update effective theme
      }
    };

    if (theme === 'system') {
      mediaQuery.addEventListener('change', handleChange);
      // Initial check for system theme when 'system' is first selected or loaded
      const systemPrefersDark = mediaQuery.matches;
      const root = window.document.documentElement;
      root.classList.remove(systemPrefersDark ? 'light' : 'dark');
      root.classList.add(systemPrefersDark ? 'dark' : 'light');
      setEffectiveTheme(systemPrefersDark ? 'dark' : 'light');
    }

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]); // Rerun when theme preference changes to/from 'system'

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
