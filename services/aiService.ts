// okpage/services/aiService.ts
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function initializeOpenAIClient(apiKey: string, baseURL?: string) {
  if (!apiKey) {
    openaiClient = null;
    console.warn('AI Service: API key is missing, client not initialized.');
    // It might be better to throw an error here or let the UI handle the uninitialized state.
    return;
  }
  try {
    openaiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL, // e.g., for a proxy or specific Gemini endpoint
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });
    console.log('AI Service: OpenAI client initialized successfully.', baseURL ? `Using baseURL: ${baseURL}` : '');
  } catch (error) {
    openaiClient = null;
    console.error('AI Service: Failed to initialize OpenAI client:', error);
    // Optionally, re-throw or handle error more specifically to inform the UI
    throw new Error(`Failed to initialize AI client: ${(error as Error).message}`);
  }
}

// Keep this interface, it's used by the functions below and potentially by callers
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Interface for non-streaming chat completion
interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[]; // Using our simpler ChatMessage interface
  temperature?: number;
  max_tokens?: number;
  // stream parameter is implicitly false for this function
}

export async function getChatCompletion(params: ChatCompletionParams): Promise<string | null> {
  if (!openaiClient) {
    console.error('AI Service: OpenAI client not initialized. Cannot make API call.');
    throw new Error('AI client is not initialized. Please ensure the API key is set.');
  }

  try {
    // The 'openai' package expects messages to be of type OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    // Our ChatMessage[] is compatible if roles are 'user', 'assistant', 'system'.
    // If more complex roles or structures are needed, this might need adjustment or a mapping function.
    const messagesForApi: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = params.messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system', // Ensure role matches expected types
      content: m.content,
    }));

    const completion = await openaiClient.chat.completions.create({
      model: params.model,
      messages: messagesForApi,
      temperature: params.temperature === undefined ? 0.7 : params.temperature, // Default temperature if not provided
      max_tokens: params.max_tokens,
      stream: false,
    });
    return completion.choices[0]?.message?.content || null;
  } catch (error: any) {
    console.error('AI Service: Error in getChatCompletion:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown API error';
    throw new Error(`API Error: ${errorMessage}`);
  }
}

// Interface for streaming chat completion, extends the base params
interface StreamingChatCompletionParams extends ChatCompletionParams {
  // stream parameter is implicitly true for this function
}

export async function* getStreamingChatCompletion(params: StreamingChatCompletionParams) {
  if (!openaiClient) {
    console.error('AI Service: OpenAI client not initialized. Cannot make streaming API call.');
    throw new Error('AI client is not initialized. Please ensure the API key is set.');
  }

  try {
    const messagesForApi: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = params.messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const stream = await openaiClient.chat.completions.create({
      model: params.model,
      messages: messagesForApi,
      temperature: params.temperature === undefined ? 0.7 : params.temperature, // Default temperature
      max_tokens: params.max_tokens,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  } catch (error: any) {
    console.error('AI Service: Error in getStreamingChatCompletion:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown streaming API error';
    // To signal an error from an async generator, you can throw it.
    // The calling code should handle this with a try-catch around the for-await-of loop.
    throw new Error(`Streaming API Error: ${errorMessage}`);
  }
}

// Example of how the service might be configured from UI settings.
// This would be called when API key from settings is available/updated.
// import { useAppStore } from '~/store'; // Assuming store holds apiKey and endpointUrl
//
// export function configureAIServiceFromStore() {
//   const { apiKey, openAIEndpointUrl } = useAppStore.getState(); // Assuming endpointUrl is also in store
//   if (apiKey) {
//     initializeOpenAIClient(apiKey, openAIEndpointUrl || undefined);
//   } else {
//     console.warn("AI Service: No API key found in store for auto-configuration.");
//   }
// }
//
// // Optionally, subscribe to store changes to re-initialize if API key changes.
// useAppStore.subscribe(
//   (state) => state.apiKey,
//   (newApiKey, oldApiKey) => {
//     if (newApiKey !== oldApiKey) {
//       console.log("AI Service: API Key changed, re-initializing client.");
//       configureAIServiceFromStore();
//     }
//   }
// );
