// Assuming sendMessage, onMessage, and defineBackground are globally available in WXT context

import { saveSetting, loadSetting } from '~/services/settingsService'; // Added loadSetting

export default defineBackground(async () => {
  console.log('OKPage Background script loaded/initializing...');

  async function setInitialSidePanelState() {
    // Load the entire persisted state for 'okpage-app-storage'
    // Zustand persist saves an object like { state: { yourStateProperties... }, version: ... }
    const persistedZustandState = await loadSetting<{ state?: { uiMode?: 'sidepanel' | 'floating' } }>('okpage-app-storage', {});
    const uiMode = persistedZustandState?.state?.uiMode || 'sidepanel'; // Default to 'sidepanel'

    console.log(`OKPage Background: Setting initial side panel state based on uiMode: ${uiMode}`);

    try {
      if (uiMode === 'floating') {
        // If floating mode, ensure native side panel is disabled globally for the extension.
        // The path is already set by the manifest, so we only need to manage 'enabled'.
        await chrome.sidePanel.setOptions({ enabled: false });
        console.log('OKPage Background: Native side panel globally disabled as uiMode is "floating".');
      } else { // 'sidepanel' or default
        // If sidepanel mode, ensure native side panel is enabled globally.
        await chrome.sidePanel.setOptions({ enabled: true });
        console.log('OKPage Background: Native side panel globally enabled as uiMode is "sidepanel".');
      }
    } catch (error) {
        console.error('OKPage Background: Error setting global side panel enabled state:', error);
        // This can happen if the sidePanel API is not available (e.g., older browser version)
        // or if the manifest doesn't correctly define a side_panel.
    }
  }

  // Call on startup/install
  // WXT's defineBackground callback effectively runs on startup.
  await setInitialSidePanelState();


  // OnInstalled: Setup context menu & potentially re-check initial side panel state
  chrome.runtime.onInstalled.addListener(async (details) => { // Made async
    chrome.contextMenus.create({
      id: "okpage-open",
      title: "Open OKPage Panel",
      contexts: ["page", "selection"],
    });
    console.log('OKPage context menu created/updated on', details.reason);
  });

  // Helper function to open the native side panel
  const openNativeSidePanel = async (tab?: chrome.tabs.Tab) => {
    if (!tab?.windowId) {
      console.warn("OKPage Background: Cannot open side panel without a windowId from the tab.");
      // Attempt to get current window if tab is undefined, though action/context menu usually provide a tab.
      const currentWindow = await chrome.windows.getCurrent();
      if (currentWindow.id) {
        console.log("OKPage Background: Using current window ID for side panel:", currentWindow.id);
        await chrome.sidePanel.open({ windowId: currentWindow.id });
      } else {
        console.error("OKPage Background: No valid windowId found to open side panel.");
        return;
      }
    } else {
       await chrome.sidePanel.open({ windowId: tab.windowId });
    }
    console.log(`OKPage Background: Attempted to open native side panel for window ${tab?.windowId || 'current'}.`);
  };

  // This function handles clicks from browser action or context menu.
  // It now checks the uiMode setting to decide which panel to open/toggle.
  const handleActionOrContextMenuClick = async (tabInput?: chrome.tabs.Tab) => {
    let currentTab = tabInput;
    if (!currentTab || !currentTab.id) {
      const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTabs.length === 0) {
        console.error("OKPage Background: No active tab found for action.");
        return;
      }
      currentTab = activeTabs[0];
    }
    if (!currentTab.id) {
        console.error("OKPage Background: Could not determine active tab ID for action.");
        return;
    }
    const tabId = currentTab.id; // Guaranteed to be a number here

    // Prevent action on restricted URLs
    if (currentTab.url?.startsWith("chrome://") || currentTab.url?.startsWith("about:") || currentTab.url?.includes("chromewebstore.google.com")) {
      console.log(`OKPage Background: Action/Context Menu on restricted URL (${currentTab.url}). No panel action taken.`);
      return;
    }

    // Load uiMode from storage
    // Zustand persist saves the whole state object under the specified name.
    // The state object includes { state: { uiMode: '...' }, version: ... }
    const persistedZustandState = await loadSetting<{ state?: { uiMode?: 'sidepanel' | 'floating' } }>('okpage-app-storage', {});
    const uiMode = persistedZustandState?.state?.uiMode || 'sidepanel'; // Default to 'sidepanel'

    console.log(`OKPage Background: Current UI Mode from storage: ${uiMode}`);

    if (uiMode === 'sidepanel') {
      try {
        await openNativeSidePanel(currentTab); // Ensure currentTab (which has windowId) is passed
        // Ensure floating panel is removed if native side panel is chosen
        await sendMessage('removeFloatingPanelCmd', {}, tabId)
          .catch(err => console.warn(`OKPage Background: Failed to ensure floating panel removed for tab ${tabId}. Content script might not be active.`, err));
      } catch (error: any) {
        console.error(`OKPage Background: Error opening native side panel:`, error.message);
      }
    } else { // 'floating' mode
      try {
        // Toggle floating panel
        await sendMessage('toggle_ui_visibility', { from: 'background (floating mode)' }, tabId);

        // Attempt to disable/hide native side panel for the current tab
        // Note: chrome.sidePanel.setOptions({ enabled: false }) only works if the global side panel is set to this extension.
        // If another extension's side panel is active, this won't hide it.
        // Also, if the side panel was opened for the window, this tab-specific call might not close it.
        // A more robust way to "close" a window-scoped side panel is not directly available, users usually close it manually.
        await chrome.sidePanel.setOptions({ tabId: tabId, enabled: false });
        console.log(`OKPage Background: Attempted to disable native side panel for tab ${tabId} in floating mode.`);

      } catch (error) {
        console.warn(`OKPage Background: Failed to send 'toggle_ui_visibility' or disable native side panel for tab ${tabId}. Error:`, error);
        if (error instanceof Error && (error.message.includes('No matching message listener') || error.message.includes('Receiving end does not exist'))) {
          console.log(`OKPage Background: Content script not ready in tab ${tabId} for floating panel. Attempting to inject.`);
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content-scripts/content.js']
            });
            console.log(`OKPage Background: Injected content script into tab ${tabId}. Retrying message...`);
            await sendMessage('toggle_ui_visibility', { from: 'background (floating mode)', afterInjection: true }, tabId);
          } catch (injectError) {
            console.error(`OKPage Background: Failed to inject content script or resend message in tab ${tabId}. Error:`, injectError);
          }
        } else {
          console.warn(`OKPage Background: Error was not due to missing listener/receiver or sidePanel.setOptions failure:`, error);
        }
      }
    }
  };

  // Browser action click listener
  chrome.action.onClicked.addListener((tab) => {
    console.log("OKPage Background: Browser action clicked.");
    handleActionOrContextMenuClick(tab);
  });

  // Context menu click listener
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "okpage-open") { // tab can be undefined here
      console.log("OKPage Background: Context menu item clicked.");
      // If tab is undefined from context menu, handleActionOrContextMenuClick will try to get active tab.
      handleActionOrContextMenuClick(tab);
    }
  });

  // WXT message listener for 'ui_ready' from side panel UI
  onMessage('ui_ready', async (message) => {
    console.log(`OKPage Background: Received 'ui_ready' from UI (tab: ${message.sender.tab?.id}, frameId: ${message.sender.frameId}). Data:`, message.data);
    // return { status: "Background acknowledged ui_ready" }; // Optional response
  });

  // WXT message listener for 'storeExtractedContent' from content script
  onMessage('storeExtractedContent', async (message) => {
    console.log('OKPage Background: Received storeExtractedContent. Sender Tab URL:', message.sender.tab?.url, 'Data:', message.data);
    if (message.data?.article) {
      const article = message.data.article;
      const tabUrl = message.sender.tab?.url; // URL from the sender tab (content script's tab)

      // Ensure all expected fields are present, even if null from Readability
      const pageInfoToStore = {
        textContent: article.textContent || '',
        title: article.title || 'Untitled',
        excerpt: article.excerpt || '',
        url: tabUrl || '',
        timestamp: Date.now(),
        siteName: article.siteName || null,
        byline: article.byline || null,
        lang: article.lang || null,
        dir: article.dir || null,
        // Do not store article.content (full HTML) to keep storage size manageable
      };

      try {
        await saveSetting('recentPageInfo', pageInfoToStore);
        console.log('OKPage Background: recentPageInfo saved to storage.', pageInfoToStore);
        return { success: true, message: 'Content stored.' };
      } catch (error) {
        console.error('OKPage Background: Error saving recentPageInfo to storage:', error);
        return { success: false, message: 'Failed to store content.' };
      }
    }
    console.warn('OKPage Background: storeExtractedContent message received without article data.');
    return { success: false, message: 'No article data received.' };
  });

  // Listener for 'fetchAndStorePageContent' from UI (e.g., side panel)
  onMessage('fetchAndStorePageContent', async (message) => {
    console.log("OKPage Background: Received 'fetchAndStorePageContent' from UI. Sender details:", message.sender);

    // Determine the active tab where the UI is presumably operating or referring to.
    // If the message is from a side panel, message.sender.tab might not be the active content page.
    // We typically want content from the user's active page.
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!currentTab || !currentTab.id) {
      console.error("OKPage Background: No active tab found for 'fetchAndStorePageContent'.");
      return { error: "No active tab found." };
    }

    if (currentTab.url && (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('https://chrome.google.com/webstore'))) {
      console.log(`OKPage Background: 'fetchAndStorePageContent' called on a restricted page (${currentTab.url}).`);
      return { error: `Cannot extract content from restricted page: ${currentTab.url}` };
    }

    try {
      console.log(`OKPage Background: Sending 'extractAndForwardPageContent' to content script in tab ${currentTab.id}`);
      const responseFromContentScript = await sendMessage(
        'extractAndForwardPageContent',
        {}, // No payload needed for this command to content script
        currentTab.id
      );
      console.log("OKPage Background: Received response from content script for 'extractAndForwardPageContent':", responseFromContentScript);

      // The content script now directly sends 'storeExtractedContent' to background.
      // So, the responseFromContentScript is the article data (or error).
      // We just need to forward this (or a success/error status) to the UI.
      // The actual storing is handled by 'storeExtractedContent' listener.

      if (responseFromContentScript && !(responseFromContentScript as any).error) {
        // The UI expects the article data to set its pageContext.
        // The content script also sends this data to 'storeExtractedContent' listener.
        return { data: responseFromContentScript };
      } else {
        return { error: (responseFromContentScript as any)?.error || "Failed to extract content." };
      }

    } catch (error: any) {
      console.error("OKPage Background: Error messaging content script for 'extractAndForwardPageContent'. Potentially needs injection.", error);
      // Attempt to inject content script if communication fails
      if (error.message.includes('No matching message listener') || error.message.includes('Receiving end does not exist')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['content-scripts/content.js'],
          });
          console.log(`OKPage Background: Content script injected into tab ${currentTab.id}. Retrying 'extractAndForwardPageContent'.`);
          const retryResponse = await sendMessage('extractAndForwardPageContent', {}, currentTab.id);
          if (retryResponse && !(retryResponse as any).error) {
            return { data: retryResponse };
          } else {
            return { error: (retryResponse as any)?.error || "Failed to extract content after injection." };
          }
        } catch (injectError: any) {
          console.error(`OKPage Background: Failed to inject content script in tab ${currentTab.id}.`, injectError);
          return { error: injectError.message || "Failed to inject content script." };
        }
      }
      return { error: error.message || "Failed to communicate with content script." };
    }
  });

  console.log('OKPage Background script event listeners (including WXT) registered.');
});
