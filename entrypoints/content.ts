// Assuming onMessage and defineContentScript are globally available in WXT context

import { Readability } from '@mozilla/readability';

const FLOATING_PANEL_ID = 'okpage-floating-panel';

function injectFloatingPanel() {
  if (document.getElementById(FLOATING_PANEL_ID)) {
    console.log('OKPage Content Script: Floating panel already injected.');
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.id = FLOATING_PANEL_ID;

  try {
    iframe.src = chrome.runtime.getURL('floating/index.html');
  } catch (e) {
    console.error("OKPage Content Script: Failed to get URL for floating/index.html.", e);
    return;
  }

  iframe.style.position = 'fixed';
  iframe.style.top = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '384px';
  iframe.style.height = 'calc(100vh - 40px)';
  iframe.style.border = 'none';
  iframe.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  iframe.style.borderRadius = '8px';
  iframe.style.zIndex = '2147483647';
  iframe.style.backgroundColor = 'transparent';

  document.body.appendChild(iframe);
  console.log('OKPage Content Script: Floating panel injected.');
}

function removeFloatingPanel() {
  const panel = document.getElementById(FLOATING_PANEL_ID);
  if (panel) {
    panel.remove();
    console.log('OKPage Content Script: Floating panel removed.');
  } else {
    console.log('OKPage Content Script: removeFloatingPanel called but panel not found.');
  }
}

function toggleFloatingPanelVisibilityInContentScript() {
  const panelExists = !!document.getElementById(FLOATING_PANEL_ID);
  if (panelExists) {
    removeFloatingPanel();
  } else {
    injectFloatingPanel();
  }
  return !!document.getElementById(FLOATING_PANEL_ID);
}

function extractPageContent(): { title: string, content: string, textContent: string, length: number, excerpt: string, byline: string | null, dir: string | null, lang: string | null, siteName: string | null } | { error: string } {
  // Clone the document to avoid modifying the original page
  const documentClone = document.cloneNode(true) as Document;
  try {
    const reader = new Readability(documentClone, {
      // charThreshold: 500, // Example: Minimum content length
      // debug: true, // Enable for console logs from Readability
    });
    const article = reader.parse();

    if (article && article.content) {
      return {
        title: article.title,
        content: article.content, // HTML content
        textContent: article.textContent, // Plain text
        length: article.length,
        excerpt: article.excerpt,
        byline: article.byline,
        dir: article.dir,
        lang: article.lang,
        siteName: article.siteName
      };
    } else {
      console.warn('OKPage Content Script: Readability could not parse the page content effectively. Falling back to body.textContent.');
      const fallbackText = document.body.textContent?.replace(/\s\s+/g, ' ').trim() || ''; // Compact whitespace
      const title = document.title || window.location.hostname;
      return {
        title: title,
        content: `<p>${fallbackText.split('\n').join('</p><p>')}</p>`, // Basic HTML structure for fallback
        textContent: fallbackText,
        length: fallbackText.length,
        excerpt: fallbackText.substring(0, 250) + (fallbackText.length > 250 ? '...' : ''),
        byline: null,
        dir: document.documentElement.dir || 'ltr',
        lang: document.documentElement.lang || null,
        siteName: window.location.hostname
      };
    }
  } catch (error: any) {
    console.error('OKPage Content Script: Error during Readability parsing:', error);
    return { error: error.message || 'Failed to parse content with Readability.' };
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],

  main(ctx) {
    console.log('OKPage Content Script: main function executed.');

    // Listener for messages from background script via WXT messaging
    onMessage('toggle_ui_visibility', async (message) => {
      console.log('OKPage Content Script: Received "toggle_ui_visibility" from background. Data:', message.data);
      toggleFloatingPanelVisibilityInContentScript();
      // Optionally return a response:
      // return { status: "Floating panel toggled by content script", visible: !!document.getElementById(FLOATING_PANEL_ID) };
    });

    // Listener for 'removeFloatingPanelCmd' from background script
    onMessage('removeFloatingPanelCmd', async (message) => {
      console.log('OKPage Content Script: Received removeFloatingPanelCmd from background. Data:', message.data);
      removeFloatingPanel();
      return { success: true, message: "Floating panel removed if it existed." };
    });

    // Listener for 'extractAndForwardPageContent' from background script
    onMessage('extractAndForwardPageContent', async (message) => {
      console.log('OKPage Content Script: Received extractAndForwardPageContent from background. Data:', message.data);
      const extractedData = extractPageContent(); // This is synchronous

      // Content script also sends this to background for storage, as per previous subtask.
      // This might be redundant if background is now initiating this flow.
      // Consider if 'storeExtractedContent' should only be sent if this message *isn't* the trigger.
      // For now, it will send to store, and also return to background.
      if (!(extractedData as any).error) {
        sendMessage('storeExtractedContent', { article: extractedData })
          .then(response => console.log('OKPage Content Script: Background responded to storeExtractedContent (from extractAndForward):', response))
          .catch(err => console.error('OKPage Content Script: Error sending storeExtractedContent to background (from extractAndForward):', err));
      }
      return extractedData; // Send data back to background, which will forward to UI
    });

    // Listener for messages from the iframe UI (e.g., floating panel)
    globalThis.addEventListener('message', (event) => {
      // Basic security: check origin if possible, though for extensions, sender ID might be more robust if iframe is an extension page.
      // For now, checking data.action.
      if (event.data?.action === 'requestPageContentFromUI') {
        console.log('OKPage Content Script: Received requestPageContentFromUI from iframe UI.');
        const extracted = extractPageContent();

        // Send response back to the specific iframe window that sent the message
        if (event.source && event.source === document.getElementById(FLOATING_PANEL_ID)?.contentWindow) {
          (event.source as Window).postMessage({
            action: 'pageContentExtractedForUI',
            data: extracted
          }, event.origin); // Target the specific origin of the iframe

          // Also send to background script for storage, if not an error
          if (!(extracted as any).error) {
            sendMessage('storeExtractedContent', { article: extracted }) // Assumes sendMessage is globally available via WXT
              .then(response => console.log('OKPage Content Script: Background responded to storeExtractedContent:', response))
              .catch(err => console.error('OKPage Content Script: Error sending storeExtractedContent to background:', err));
          }

        } else {
          console.warn("OKPage Content Script: Message source mismatch or panel not found for requestPageContentFromUI.");
        }
      }
    });

    // The existing chrome.runtime.onMessage for other extension messages (e.g. from background directly)
    // This can be kept if needed, or refactored if all comms go via WXT or window.postMessage
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('OKPage Content Script (chrome.runtime): Received message:', message);
      if (message.action === 'legacy_toggleFloatingPanel') {
        const isVisible = toggleFloatingPanelVisibilityInContentScript();
        sendResponse({ success: true, panelVisible: isVisible });
        return true;
      }
      // Example: Handle a direct request for page content via chrome.runtime.sendMessage
      // This might be useful if background script needs content directly.
      if (message.action === 'requestPageContentFromBackground') {
        const extracted = extractPageContent();
        sendResponse(extracted);
        return true; // Indicate async response if extractPageContent were async (it's not currently)
      }
      return false;
    });
  },
});
