import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import ChatView from '~/components/ChatView';
import SettingsView from '~/components/SettingsView';
import { useTheme } from '~/hooks/useTheme';
import { Moon, Sun, RefreshCw } from 'lucide-react'; // Added RefreshCw for loading icon
// Assuming sendMessage is globally available in WXT context
import { useAppStore } from '~/store'; // Import the Zustand store

type View = 'chat' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('chat');
  const { theme, setTheme, effectiveTheme } = useTheme();
  const { pageContext, setPageContext, clearPageContext } = useAppStore();
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  useEffect(() => {
    // Send a message to the background script that the UI is ready
    sendMessage('ui_ready', { source: 'sidepanelApp' })
      .then(response => console.log('OKPage Sidepanel: Response from background for ui_ready:', response))
      .catch(error => console.error('OKPage Sidepanel: Error sending ui_ready to background:', error));
  }, []);

  const handleLoadPageContext = async () => {
    console.log('OKPage Sidepanel: "Load Page Context" button clicked.');
    setIsLoadingContext(true);
    clearPageContext(); // Clear previous context

    try {
      const response = await sendMessage('fetchAndStorePageContent', {}, undefined); // Send to background
      console.log('OKPage Sidepanel: Response from fetchAndStorePageContent:', response);

      if (response?.error) {
        console.error('OKPage Sidepanel: Error fetching page content:', response.error);
        setPageContext({
          title: 'Error',
          textContent: `Failed to load content: ${response.error}`,
          error: response.error
        });
        // alert(`Error fetching page content: ${response.error}`); // Simple feedback
      } else if (response?.data) {
        // response.data should be the article object from content script
        setPageContext(response.data);
        // alert('Page content loaded successfully!'); // Simple feedback
        console.log('OKPage Sidepanel: Page context loaded and set in store.');
      } else {
        setPageContext({
          title: 'Error',
          textContent: 'Received no data or malformed response for page content.',
          error: 'Unknown error fetching content.'
        });
        // alert('Failed to load page content: Unknown error.'); // Simple feedback
      }
    } catch (error: any) {
      console.error('OKPage Sidepanel: Exception while fetching page content:', error);
      setPageContext({
        title: 'Exception',
        textContent: `Exception: ${error.message || 'Unknown error'}`,
        error: error.message || 'Unknown error'
      });
      // alert(`Exception fetching page content: ${error.message}`); // Simple feedback
    } finally {
      setIsLoadingContext(false);
    }
  };

  const toggleCurrentTheme = () => {
    // Simple toggle: light -> dark -> system -> light
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="p-4 border-b flex justify-between items-center gap-2">
        <div className="flex-grow">
          <h1 className="text-xl font-semibold truncate" title={pageContext?.title || "OKPage Side Panel"}>
            {pageContext?.title || "OKPage Side Panel"}
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
        {/* Display page context error if any, or current view */}
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

export default App;
