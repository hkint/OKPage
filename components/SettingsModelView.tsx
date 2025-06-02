import React, { useState, useEffect } from 'react';
import { useAppStore } from '~/store';
import { initializeOpenAIClient, getChatCompletion } from '~/services/aiService'; // Assuming getChatCompletion can be used for a light test
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '~/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

// Define a list of models available for selection
// TODO: Move this to a shared constants file or fetch from a config/API if dynamic
const AVAILABLE_MODELS = [
  { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Latest)' },
  { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (Latest)' },
  { id: 'gpt-4o', name: 'GPT-4o (OpenAI)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo (OpenAI)' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (OpenAI)' },
  // Add other models as needed
];

const SettingsModelView: React.FC = () => {
  const {
    apiKey: storedApiKey,
    selectedModel: storedModel,
    setApiKey,
    setSelectedModel
  } = useAppStore();

  const [currentApiKey, setCurrentApiKey] = useState(storedApiKey || '');
  const [currentModel, setCurrentModel] = useState(storedModel || AVAILABLE_MODELS[0].id);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);


  // Update local state if store changes (e.g., after initial hydration)
  useEffect(() => {
    setCurrentApiKey(storedApiKey || '');
  }, [storedApiKey]);

  useEffect(() => {
    setCurrentModel(storedModel || AVAILABLE_MODELS[0].id);
  }, [storedModel]);

  const handleSaveSettings = async () => {
    setIsTesting(true);
    setTestStatus('idle');
    setTestMessage(null);

    if (!currentApiKey.trim()) {
      setTestStatus('error');
      setTestMessage('API Key cannot be empty.');
      setIsTesting(false);
      return;
    }

    // Temporarily initialize client with the new key for testing
    let testClientInitialized = false;
    try {
      initializeOpenAIClient(currentApiKey.trim()); // Assuming baseURL is not needed for this test or handled elsewhere
      testClientInitialized = true; // If no error, assume basic init is okay
    } catch (initError: any) {
      setTestStatus('error');
      setTestMessage(`Failed to initialize AI client: ${initError.message}`);
      setIsTesting(false);
      return;
    }

    if (testClientInitialized) {
      try {
        // Perform a lightweight test API call (e.g., a very short completion)
        // This uses the openaiClient that was just initialized with currentApiKey
        await getChatCompletion({
          model: currentModel,
          messages: [{ role: 'user', content: 'Hello!' }],
          max_tokens: 5,
        });

        // If API call is successful, save to store and re-initialize client with stored key
        setApiKey(currentApiKey.trim());
        setSelectedModel(currentModel);
        initializeOpenAIClient(currentApiKey.trim()); // Ensure the main client is updated

        setTestStatus('success');
        setTestMessage('Settings saved and API key validated successfully.');

      } catch (apiError: any) {
        console.error("API Key Test Error:", apiError);
        setTestStatus('error');
        setTestMessage(`API Key Test Failed: ${apiError.message}. Please check the key and model.`);
      }
    }
    setIsTesting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="apiKey"
              type={showApiKey ? "text" : "password"}
              value={currentApiKey}
              onChange={(e) => setCurrentApiKey(e.target.value)}
              placeholder="Enter your API Key"
              className="flex-grow"
            />
            <Button variant="outline" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
              {showApiKey ? 'Hide' : 'Show'}
            </Button>
          </div>
           <p className="text-xs text-muted-foreground">
            Your API key is stored locally and only used to communicate with the AI model provider.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="modelSelect">AI Model</Label>
          <Select value={currentModel} onValueChange={setCurrentModel}>
            <SelectTrigger id="modelSelect">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start space-y-3">
        <Button onClick={handleSaveSettings} disabled={isTesting}>
          {isTesting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Save and Test API Key
        </Button>
        {testMessage && (
          <div className={`flex items-center text-sm p-2 rounded-md ${
            testStatus === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : testStatus === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'hidden' // Should not be hidden if message exists, but good fallback
          }`}>
            {testStatus === 'success' && <CheckCircle className="mr-2 h-4 w-4" />}
            {testStatus === 'error' && <AlertTriangle className="mr-2 h-4 w-4" />}
            {testMessage}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default SettingsModelView;
