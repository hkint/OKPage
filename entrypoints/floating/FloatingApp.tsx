import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import ChatView from '~/components/ChatView';
import SettingsView from '~/components/SettingsView';
import { useTheme } from '~/hooks/useTheme';
import { Moon, Sun, RefreshCw } from 'lucide-react';
// Assuming sendMessage is globally available in WXT context
import { useAppStore } from '~/store';

type View = 'chat' | 'settings';

const FloatingApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('chat');
  const { theme, setTheme, effectiveTheme } = useTheme();
  const { pageContext, setPageContext, clearPageContext } = useAppStore();
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  useEffect(() => {
    // Send a message to the background script that the UI is ready
    sendMessage('ui_ready', { source: 'floatingApp' }) // Changed source
      .then(response => console.log('OKPage FloatingApp: Response from background for ui_ready:', response))
      .catch(error => console.error('OKPage FloatingApp: Error sending ui_ready to background:', error));
  }, []);

  const handleLoadPageContext = async () => {
    console.log('OKPage FloatingApp: "Load Page Context" button clicked.'); // Changed log
    setIsLoadingContext(true);
    clearPageContext(); // Clear previous context

    try {
      const response = await sendMessage('fetchAndStorePageContent', {}, undefined); // Send to background
      console.log('OKPage FloatingApp: Response from fetchAndStorePageContent:', response); // Changed log

      if (response?.error) {
        console.error('OKPage FloatingApp: Error fetching page content:', response.error); // Changed log
        setPageContext({
          title: 'Error',
          textContent: `Failed to load content: ${response.error}`,
          error: response.error
        });
      } else if (response?.data) {
        setPageContext(response.data);
        console.log('OKPage FloatingApp: Page context loaded and set in store.'); // Changed log
      } else {
        setPageContext({
          title: 'Error',
          textContent: 'Received no data or malformed response for page content.',
          error: 'Unknown error fetching content.'
        });
      }
    } catch (error: any) {
      console.error('OKPage FloatingApp: Exception while fetching page content:', error); // Changed log
      setPageContext({
        title: 'Exception',
        textContent: `Exception: ${error.message || 'Unknown error'}`,
        error: error.message || 'Unknown error'
      });
    } finally {
      setIsLoadingContext(false);
    }
  };

  const toggleCurrentTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  // The h-screen class might need adjustment depending on how the floating panel is sized.
  // For now, keeping it to ensure content fills the available space defined by WXT for the floating panel.
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="p-4 border-b flex justify-between items-center gap-2">
        <div className="flex-grow">
          {/* Changed title slightly for clarity if needed, but can be identical too */}
          <h1 className="text-xl font-semibold truncate" title={pageContext?.title || "OKPage Floating Panel"}>
            {pageContext?.title || "OKPage Floating Panel"}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoadPageContext}
          disabled={isLoadingContext}
          aria-label="Load page context"
          title="Extract content from the current page"
        >
          {isLoadingContext ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            "Load Context"
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleCurrentTheme} aria-label="Toggle theme" title="Toggle theme">
          {effectiveTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-4 overflow-auto">
        {pageContext?.error && (
          <div className="mb-4 p-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded">
            <p><strong>Error loading page context:</strong></p>
            <p>{pageContext.error}</p>
          </div>
        )}
        {currentView === 'chat' ? <ChatView /> : <SettingsView />}
      </main>

      {/* Footer Navigation */}
      <footer className="p-4 border-t flex justify-around">
        <Button variant={currentView === 'chat' ? 'default' : 'outline'} onClick={() => setCurrentView('chat')}>
          Chat
        </Button>
        <Button variant={currentView === 'settings' ? 'default' : 'outline'} onClick={() => setCurrentView('settings')}>
          Settings
        </Button>
      </footer>
    </div>
  );
};

export default FloatingApp;
