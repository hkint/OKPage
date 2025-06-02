import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAppStore, type ChatMessage, type ImageData } from '~/store'; // Added ImageData
import { initializeOpenAIClient, getStreamingChatCompletion } from '~/services/aiService';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { ScrollArea } from '~/components/ui/scroll-area';
import MarkdownDisplay from '~/components/MarkdownRenderer';
import { SendHorizonal, Loader2, CornerDownLeft, Paperclip, X } from 'lucide-react'; // Added Paperclip, X
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { generateUniqueId, formatTimestamp } from '~/utils'; // Import generateUniqueId and formatTimestamp

const ChatView: React.FC = () => {
  const {
    apiKey,
    selectedModel,
    pageContext,
    chatHistory,
    addMessage,
    updateAssistantMessageChunk,
    agents,
    currentAgentId,
    setCurrentAgentId,
    activeSystemPrompt,
    activeTemperature,
    activeMaxTokens,
    activeTopP,
    currentImages, // Image state from store
    addImage,      // Image actions from store
    removeImage,
    clearImages,
  } = useAppStore();

  const [userInput, setUserInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input

  useEffect(() => {
    if (apiKey) {
      initializeOpenAIClient(apiKey);
      console.log("ChatView: OpenAI client initialized/updated with API key.");
    } else {
      console.warn("ChatView: API key is not set. AI Service not initialized.");
    }
  }, [apiKey]);

  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
    }
  }, [chatHistory, currentImages]); // Scroll also when images change

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        console.warn(`File ${file.name} is not an image. Skipping.`);
        // TODO: Show toast/notification to user
        continue;
      }
      // TODO: Add size validation if needed

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          const newImage: ImageData = {
            id: generateUniqueId(),
            dataUrl,
            mimeType: file.type,
            file: file, // Store original file if needed for size or other checks later
          };
          addImage(newImage);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((userInput.trim() === '' && currentImages.length === 0) || isStreaming) return;
    if (!apiKey) {
      setError("API Key is not set. Please configure it in Settings.");
      // Add system message to chat indicating API key is not set
      addMessage({
        id: generateUniqueId(), // Use uuidv4 or similar for unique ID
        role: 'system',
        content: "API Key is not set. Please configure it in settings.",
        timestamp: Date.now(),
      });
      return;
    }
    if (!currentAgentId) {
      setError("No agent selected. Please select an agent to begin.");
      // Add system message to chat indicating no agent is selected
      addMessage({
        id: generateUniqueId(),
        role: 'system',
        content: "No agent selected. Please select an agent from settings.",
        timestamp: Date.now(),
      });
      return;
    }
    setError(null);

    const userMessageContent = userInput.trim();
    const userMessageId = `user-${Date.now()}`;

    // Add user message to history, including current images
    const userMessageForHistory: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
      images: [...currentImages], // Add a copy of current images
    };
    addMessage(userMessageForHistory);

    setUserInput('');
    clearImages(); // Clear images from the input area after sending
    setIsStreaming(true);

    const assistantMessageId = `asst-${Date.now()}`;
    addMessage({ id: assistantMessageId, role: 'assistant', content: '', timestamp: Date.now() });

    let systemPromptForAPI = activeSystemPrompt;
    if (pageContext && !pageContext.error && pageContext.textContent) {
      systemPromptForAPI += `\n\n## Current Page Context:\nTitle: ${pageContext.title}\nURL: ${pageContext.url || 'N/A'}\n\nExcerpt:\n${pageContext.excerpt || pageContext.textContent.substring(0, 1500)}\n\n## User's Question:`;
    } else if (pageContext?.error) {
       systemPromptForAPI += `\n\nNote: There was an error loading page context: ${pageContext.error}`;
    }

    // TODO: Prepare messages for API, including images if the model supports multimodal input.
    // This part will require changes to aiService and how messages are structured for the API.
    // For now, we'll send text content only. Images are in chatHistory for display.
    const messagesForApi: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    if (systemPromptForAPI && systemPromptForAPI.trim() !== "") {
        messagesForApi.push({ role: 'system', content: systemPromptForAPI });
    }
    const historyToConsider = chatHistory.filter(msg => msg.id !== assistantMessageId && msg.id !== userMessageId); // Exclude placeholders and current user message
    messagesForApi.push(...historyToConsider.slice(-10).map(msg => ({ role: msg.role, content: msg.content }))); // Simplified history

    // Construct user message for API, potentially with image references if model supports it
    let userApiContent: any = userMessageContent;
    // Example if API supports OpenAI's content array format for multimodal:
    // if (currentImages.length > 0) {
    //   userApiContent = [{ type: 'text', text: userMessageContent }];
    //   currentImages.forEach(img => {
    //     userApiContent.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    //   });
    // }
    messagesForApi.push({ role: 'user', content: userApiContent });


    try {
      const stream = getStreamingChatCompletion({
        model: selectedModel,
        messages: messagesForApi, // This needs to be OpenAI.Chat.Completions.ChatCompletionMessageParam[]
        temperature: activeTemperature,
        max_tokens: activeMaxTokens,
        // topP: activeTopP,
      });

      for await (const chunk of stream) {
        updateAssistantMessageChunk(assistantMessageId, chunk);
      }
    } catch (apiError: any) {
      console.error("ChatView: Error streaming chat completion:", apiError);
      const errorMessage = apiError.message || "An unexpected error occurred while streaming.";
      updateAssistantMessageChunk(assistantMessageId, `\n\n**Error:** ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Agent Selector Header */}
      <div className="p-2 border-b flex items-center justify-between bg-muted/30 gap-2">
        <Label htmlFor="agent-selector" className="text-sm font-medium whitespace-nowrap">Agent:</Label>
        <Select
          value={currentAgentId || ''}
          onValueChange={(agentId) => { if (agentId) setCurrentAgentId(agentId); }}
          disabled={agents.length === 0}
        >
          <SelectTrigger id="agent-selector" className="flex-grow h-8 text-sm truncate">
            <SelectValue placeholder="Select an agent..." />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id} className="text-sm">
                {agent.name}
              </SelectItem>
            ))}
            {agents.length === 0 && <SelectItem value="no-agent-configured" disabled>No agents configured</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Chat Messages Area */}
      <ScrollArea className="flex-grow p-0" viewportRef={scrollAreaViewportRef}>
        <div className="p-4 space-y-4">
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] p-3 rounded-lg shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground self-end'
                    : msg.role === 'assistant'
                      ? 'bg-muted dark:bg-muted/80 self-start'
                      : 'bg-gray-200 dark:bg-gray-700 text-xs self-center w-full' // System messages
                }`}
              >
                {/* Display images if any */}
                {msg.images && msg.images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {msg.images.map(img => (
                      <img key={img.id} src={img.dataUrl} alt="Uploaded content" className="max-h-32 max-w-xs rounded-md border" />
                    ))}
                  </div>
                )}
                <MarkdownDisplay markdown={msg.content} className={msg.role === 'assistant' ? 'assistant-markdown' : 'user-markdown'} />
                <div className="text-xs opacity-60 mt-1 text-right">
                  {msg.timestamp ? formatTimestamp(msg.timestamp, 'p') : ''} {/* Using 'p' for short time format */}
                </div>
              </div>
            </div>
          ))}
          {isStreaming && chatHistory.length > 0 && chatHistory[chatHistory.length -1]?.role === 'assistant' && chatHistory[chatHistory.length-1]?.content === '' && (
             <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-lg shadow-sm bg-muted dark:bg-muted/80">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Error Display Area */}
      {error && (
        <div className="p-2 text-sm text-red-700 bg-red-100 border-t border-red-200 dark:bg-red-900/30 dark:text-red-400">
          Error: {error}
        </div>
      )}

      {/* Image Preview Area */}
      {currentImages.length > 0 && (
        <div className="p-2 border-t bg-muted/20">
          <div className="flex flex-wrap gap-2">
            {currentImages.map(img => (
              <div key={img.id} className="relative group w-20 h-20">
                <img src={img.dataUrl} alt="Preview" className="w-full h-full object-cover rounded-md border" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-0.5 right-0.5 h-5 w-5 opacity-70 group-hover:opacity-100"
                  onClick={() => removeImage(img.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || !apiKey || !currentAgentId || currentImages.length >= 5} // Limit number of images for now
            title={currentImages.length >= 5 ? "Maximum 5 images allowed" : "Attach images"}
            aria-label="Attach images"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder={apiKey ? (currentAgentId ? `Message ${agents.find(a=>a.id===currentAgentId)?.name || 'current agent'}...` : "Select an agent to begin...") : "Set API Key in Settings..."}
            className="flex-grow pr-12 resize-none" // Adjusted padding for send button
            rows={Math.max(1, Math.min(5, userInput.split('\n').length))}
            disabled={isStreaming || !apiKey || !currentAgentId}
          />
          <Button
            type="submit"
            size="icon"
            onClick={handleSendMessage}
            disabled={isStreaming || (userInput.trim() === '' && currentImages.length === 0) || !apiKey || !currentAgentId}
            aria-label="Send message"
            title="Send message"
            className="self-end h-10 w-10" // Align with textarea bottom
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-5 w-5" />
            )}
          </Button>
        </div>
        {!apiKey && (
          <p className="text-xs text-destructive mt-1">
            API Key not set. Please add your API key in the Settings tab.
          </p>
        )}
         <div className="text-xs text-muted-foreground mt-2 flex items-center">
            <CornerDownLeft className="h-3 w-3 mr-1" /> Shift+Enter for newline. Enter to send.
        </div>
      </div>
    </div>
  );
};

export default ChatView;
