// okpage/store/index.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Default constants for agent settings
const DEFAULT_AGENT_ID = 'default-general-v1';
const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Provide concise and accurate responses.";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TOP_P = 1.0;

// Define types for store state and actions
interface AppState {
  apiKey: string | null;
  setApiKey: (apiKey: string | null) => void;

  selectedModel: string;
  setSelectedModel: (model: string) => void;

  language: string;
  setLanguage: (language: string) => void;

  pageContext: PageContextState | null;
  setPageContext: (context: PageContextState | null) => void;
  clearPageContext: () => void;

  chatHistory: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateAssistantMessageChunk: (id: string, chunk: string) => void;
  // finalizeAssistantMessage: (id: string, finalContent: string) => void; // Optional
  clearChatHistory: () => void;

  // Agent related state
  agents: Agent[];
  currentAgentId: string | null;
  activeSystemPrompt: string;
  activeTemperature: number;
  activeMaxTokens?: number;
  activeTopP?: number;

  // Agent related actions
  loadAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  deleteAgent: (agentId: string) => void;
  setCurrentAgentId: (agentId: string | null) => void;
  syncActiveAgentSettings: () => void;

  // Image related state
  currentImages: ImageData[];
  addImage: (image: ImageData) => void;
  removeImage: (imageId: string) => void;
  clearImages: () => void;

  // UI Mode
  uiMode: 'sidepanel' | 'floating';
  setUiMode: (mode: 'sidepanel' | 'floating') => void;

  // Export Format
  exportFormat: 'markdown' | 'text';
  setExportFormat: (format: 'markdown' | 'text') => void;
}

export interface ImageData {
  id: string;
  dataUrl: string; // Base64 encoded
  mimeType: string;
  file?: File; // Optional: store the original file object
}

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
}

export interface ChatMessage { // Exporting for use in ChatView
  id: string;
  role: 'user' | 'assistant' | 'system'; // 'system' role is for priming the conversation with context/instructions
  content: string;
  timestamp?: number;
  images?: ImageData[];
}

interface PageContextState {
  title: string;
  textContent: string; // Store plain text
  excerpt?: string;
  url?: string;
  timestamp?: number;
  siteName?: string | null; // Adjusted to match Readability return type
  lang?: string | null;     // Adjusted to match Readability return type
  error?: string; // To store any extraction error
}

// Custom storage object for Zustand's persist middleware using chrome.storage.sync
const zustandChromeSyncStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // console.log(`Zustand persist (chrome.storage.sync): Getting item '${name}'`);
    return new Promise((resolve) => {
      if (!(chrome && chrome.storage && chrome.storage.sync)) {
        console.warn("chrome.storage.sync not available in zustandChromeSyncStorage.getItem");
        resolve(null);
        return;
      }
      chrome.storage.sync.get([name], (result) => {
        if (chrome.runtime.lastError) {
          console.error(`Error getting item '${name}' from chrome.storage.sync:`, chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        // result[name] will be the actual stored object (e.g., { state: {...}, version: ... })
        // It needs to be stringified for createJSONStorage.
        resolve(result[name] ? JSON.stringify(result[name]) : null);
      });
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    // console.log(`Zustand persist (chrome.storage.sync): Setting item '${name}' with value:`, value);
    return new Promise((resolve, reject) => {
      if (!(chrome && chrome.storage && chrome.storage.sync)) {
        console.warn("chrome.storage.sync not available in zustandChromeSyncStorage.setItem");
        resolve(); // Resolve to not break middleware, but value isn't saved.
        return;
      }
      // `value` from persist middleware is already a stringified JSON (e.g., "{\"state\":{...},\"version\":0}")
      // chrome.storage.sync can store objects directly, so we parse it.
      try {
        const objectToStore = JSON.parse(value);
        chrome.storage.sync.set({ [name]: objectToStore }, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error setting item '${name}' in chrome.storage.sync:`, chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } catch (e) {
        console.error("Error parsing value for zustandChromeSyncStorage.setItem, attempting to store raw string:", e);
        // Fallback: if JSON.parse fails, it might be a raw string. This case should be rare with createJSONStorage.
        chrome.storage.sync.set({ [name]: value }, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error setting raw item '${name}' in chrome.storage.sync:`, chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      }
    });
  },
  removeItem: async (name: string): Promise<void> => {
    // console.log(`Zustand persist (chrome.storage.sync): Removing item '${name}'`);
    return new Promise((resolve, reject) => {
      if (!(chrome && chrome.storage && chrome.storage.sync)) {
        console.warn("chrome.storage.sync not available in zustandChromeSyncStorage.removeItem");
        resolve();
        return;
      }
      chrome.storage.sync.remove([name], () => {
        if (chrome.runtime.lastError) {
          console.error(`Error removing item '${name}' from chrome.storage.sync:`, chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: null,
      setApiKey: (apiKey) => set({ apiKey }),

      selectedModel: 'gemini-1.5-flash-latest', // Default model, updated
      setSelectedModel: (model) => set({ selectedModel: model }),

      language: 'en', // Default language
      setLanguage: (language) => set({ language }),

      pageContext: null,
      setPageContext: (context) => set({ pageContext: context }),
      clearPageContext: () => set({ pageContext: null }),

      chatHistory: [],
      addMessage: (message) => {
        // Ensure message has a timestamp if not provided
        const messageWithTimestamp = { ...message, timestamp: message.timestamp || Date.now() };
        set((state) => ({ chatHistory: [...state.chatHistory, messageWithTimestamp] }));
      },
      updateAssistantMessageChunk: (id, chunk) => set((state) => ({
        chatHistory: state.chatHistory.map(msg =>
          msg.id === id && msg.role === 'assistant'
            ? { ...msg, content: msg.content + chunk }
            : msg
        ),
      })),
      // finalizeAssistantMessage: (id, finalContent) => set((state) => ({
      //   chatHistory: state.chatHistory.map(msg =>
      //     msg.id === id && msg.role === 'assistant' ? { ...msg, content: finalContent } : msg
      //   ),
      // })),
      clearChatHistory: () => set({ chatHistory: [] }),

      // Agent state and actions
      agents: [], // Initialized in onRehydrateStorage or post-hydration logic
      currentAgentId: null,
      activeSystemPrompt: DEFAULT_SYSTEM_PROMPT,
      activeTemperature: DEFAULT_TEMPERATURE,
      activeMaxTokens: DEFAULT_MAX_TOKENS,
      activeTopP: DEFAULT_TOP_P,

      loadAgents: (agents) => set({ agents }),
      addAgent: (agent) => {
        const newAgent = { ...agent, id: agent.id || `agent-${Date.now()}-${Math.random().toString(36).substring(2,7)}`};
        set((state) => ({ agents: [...state.agents, newAgent] }));
      },
      updateAgent: (agentId, updates) =>
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId ? { ...agent, ...updates } : agent
          ),
        })),
      deleteAgent: (agentId) =>
        set((state) => {
          const remainingAgents = state.agents.filter((agent) => agent.id !== agentId);
          let newCurrentAgentId = state.currentAgentId;
          if (state.currentAgentId === agentId) {
            newCurrentAgentId = remainingAgents.length > 0 ? remainingAgents[0].id : null;
          }
          // If newCurrentAgentId changed, it will trigger syncActiveAgentSettings via the subscription/effect in setCurrentAgentId
          return { agents: remainingAgents, currentAgentId: newCurrentAgentId };
        }),
      setCurrentAgentId: (agentId) => {
        set({ currentAgentId: agentId });
        get().syncActiveAgentSettings(); // Use get() to call another action
      },
      syncActiveAgentSettings: () =>
        set((state) => {
          const currentAgent = state.agents.find(agent => agent.id === state.currentAgentId);
          if (currentAgent) {
            return {
              activeSystemPrompt: currentAgent.systemPrompt || DEFAULT_SYSTEM_PROMPT,
              activeTemperature: currentAgent.temperature ?? DEFAULT_TEMPERATURE, // Use ?? for 0 being a valid temp
              activeMaxTokens: currentAgent.maxTokens || DEFAULT_MAX_TOKENS,
              activeTopP: currentAgent.topP ?? DEFAULT_TOP_P, // Use ?? for 0 being a valid topP
            };
          }
          return { // Default active settings if no agent or currentAgentId is null
            activeSystemPrompt: DEFAULT_SYSTEM_PROMPT,
            activeTemperature: DEFAULT_TEMPERATURE,
            activeMaxTokens: DEFAULT_MAX_TOKENS,
            activeTopP: DEFAULT_TOP_P,
          };
        }),

      // Image actions
      currentImages: [],
      addImage: (image) => set((state) => ({ currentImages: [...state.currentImages, image] })),
      removeImage: (imageId) => set((state) => ({
        currentImages: state.currentImages.filter(img => img.id !== imageId),
      })),
      clearImages: () => set({ currentImages: [] }),

      // UI Mode
      uiMode: 'sidepanel', // Default to native side panel
      setUiMode: (mode) => set({ uiMode: mode }),

      // Export Format
      exportFormat: 'markdown', // Default to markdown
      setExportFormat: (format) => set({ exportFormat: format }),
    }),
    {
      name: 'okpage-app-storage',
      storage: createJSONStorage(() => zustandChromeSyncStorage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        selectedModel: state.selectedModel,
        language: state.language,
        agents: state.agents,
        currentAgentId: state.currentAgentId,
        uiMode: state.uiMode, // Persist uiMode
        exportFormat: state.exportFormat, // Persist exportFormat
        // DO NOT persist pageContext, chatHistory, currentImages, or active... settings here.
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Zustand: An error occurred during rehydration:", error);
        }
        // Post-rehydration logic is now handled by the initializeStore function below
      },
    }
  )
);

// Initial store setup logic (e.g., default agent, sync active settings)
function initializeStore() {
  const { agents, currentAgentId, addAgent, setCurrentAgentId, syncActiveAgentSettings } = useAppStore.getState();
  let needsStateUpdate = false;
  let newAgents = [...agents]; // Create a mutable copy
  let newCurrentAgentId = currentAgentId;

  if (newAgents.length === 0) {
    console.log("Zustand: No agents found, creating default agent.");
    const defaultAgent: Agent = {
      id: DEFAULT_AGENT_ID,
      name: 'General Assistant',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: DEFAULT_MAX_TOKENS,
      topP: DEFAULT_TOP_P,
    };
    newAgents.push(defaultAgent);
    newCurrentAgentId = defaultAgent.id; // Set current to the new default
    needsStateUpdate = true;
  } else if (!newCurrentAgentId || !newAgents.find(a => a.id === newCurrentAgentId)) {
    console.log("Zustand: currentAgentId invalid or null, setting to first agent.");
    newCurrentAgentId = newAgents[0].id;
    needsStateUpdate = true;
  }

  if (needsStateUpdate) {
    // Perform a single setState call with all necessary updates
    useAppStore.setState({ agents: newAgents, currentAgentId: newCurrentAgentId });
  }

  // Always sync active settings after potential updates or just on load
  // This will use the potentially updated currentAgentId from above.
  syncActiveAgentSettings();
  console.log("Zustand: Store initialized/rehydrated. Current agent ID:", useAppStore.getState().currentAgentId);
}

// Zustand's persist middleware rehydration is asynchronous.
// We use a small timeout to ensure rehydration likely completes before our init logic.
if (typeof window !== 'undefined') {
  initializeStore();
}

// Optional: Log initial state or when state changes for debugging
// useAppStore.subscribe(state => console.log('Zustand state changed:', state));
