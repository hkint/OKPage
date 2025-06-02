// okpage/components/FloatingPanel.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button'; // Assuming shadcn/UI Button is desired
// If you want to update Zustand store from here:
// import { useAppStore } from '~/store';
// import { type PageContextState } from '~/store'; // If typing for setPageContext

const FloatingPanel: React.FC = () => {
  const [receivedPageTitle, setReceivedPageTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // If using Zustand directly from here:
  // const { setPageContext } = useAppStore();

  const handleRequestPageContent = () => {
    setError(null);
    setReceivedPageTitle(null);
    console.log("OKPage FloatingPanel: Sending 'requestPageContentFromUI' to parent (content script).");
    // Ensure parent/content script is listening for this specific action string
    window.parent.postMessage({ action: 'requestPageContentFromUI' }, '*');
    // Using '*' for targetOrigin is common for extension iframes to content scripts.
    // For enhanced security, you could try to determine the parent's origin if possible,
    // but chrome-extension://<id> can be tricky to get dynamically for the parent.
  };

  useEffect(() => {
    const handleMessageFromContentScript = (event: MessageEvent) => {
      // It's good practice to check the origin of the message if possible,
      // but in extensions, messages from content scripts to extension page iframes
      // might have an origin of the page the content script is on, or 'chrome-extension://'.
      // For now, focusing on the action.
      // console.log("OKPage FloatingPanel: Message received from parent:", event.data, "Origin:", event.origin);

      if (event.data?.action === 'pageContentExtractedForUI') {
        console.log("OKPage FloatingPanel: Received 'pageContentExtractedForUI'", event.data.data);
        if (event.data.data?.error) {
          setError(`Error from content script: ${event.data.data.error}`);
          setReceivedPageTitle(null);
        } else if (event.data.data && typeof event.data.data.title !== 'undefined') { // Check if data and title exist
          setReceivedPageTitle(event.data.data.title || "No title found");
          setError(null);
          // Optionally, update Zustand store with the full context
          // if (setPageContext) {
          //   setPageContext(event.data.data as PageContextState);
          // }
        } else {
          setError("Received malformed or incomplete page content data from content script.");
          setReceivedPageTitle(null);
        }
      }
    };

    window.addEventListener('message', handleMessageFromContentScript);
    return () => {
      window.removeEventListener('message', handleMessageFromContentScript);
    };
  }, [/* setPageContext if used */]); // Add dependencies if they are used inside useEffect

  return (
    <div
      className="p-4 bg-card text-card-foreground shadow-xl rounded-lg h-full flex flex-col"
      // style={{ border: '1px solid green', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <h1 className="text-lg font-semibold mb-3">Floating Panel</h1>
      <Button onClick={handleRequestPageContent} className="my-2 w-full">
        Get Page Title
      </Button>
      {error && (
        <div className="mt-2 p-2 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900/30 dark:text-red-400">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
      {receivedPageTitle && (
        <div className="mt-2 p-2 text-sm text-green-700 bg-green-100 rounded-md dark:bg-green-900/30 dark:text-green-400">
          <p>Page Title: <strong>{receivedPageTitle}</strong></p>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-auto pt-2">
        This panel communicates with the content script of the host page.
      </p>
    </div>
  );
};

export default FloatingPanel;
