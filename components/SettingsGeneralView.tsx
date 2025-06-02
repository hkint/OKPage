import React, { useState } from 'react';
import { useAppStore, type ChatMessage } from '~/store';
import { Button } from '~/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Label } from '~/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card'; // Removed CardFooter as it's not used
import { Separator } from '~/components/ui/separator';
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Languages, Download, FileText, FileCode, LayoutPanelLeft, PanelRightOpen } from 'lucide-react'; // Added LayoutPanelLeft, PanelRightOpen

const SettingsGeneralView: React.FC = () => {
  const { language, setLanguage, chatHistory, uiMode, setUiMode } = useAppStore();
  const [exportFormat, setExportFormat] = useState<'markdown' | 'text'>('markdown');

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    // TODO: Implement actual i18n logic if needed beyond just storing the preference.
    console.log(`Language changed to: ${newLang}`);
  };

  const formatChatHistory = (): string => {
    if (!chatHistory || chatHistory.length === 0) {
      return '';
    }

    return chatHistory
      .map((msg: ChatMessage) => {
        const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'N/A';
        if (exportFormat === 'markdown') {
          return `**${msg.role.toUpperCase()}** (_${timestamp}_):\n\n${msg.content}\n\n---\n`;
        } else { // text
          return `${msg.role.toUpperCase()} (${timestamp}):\n${msg.content}\n\n------------------------------------\n`;
        }
      })
      .join('');
  };

  const handleExportChat = () => {
    if (!chatHistory || chatHistory.length === 0) {
      console.warn('Chat history is empty. Nothing to export.');
      // TODO: Show a user-facing notification/toast
      alert('Chat history is empty.');
      return;
    }

    const formattedContent = formatChatHistory();
    const blob = new Blob([formattedContent], {
      type: exportFormat === 'markdown' ? 'text/markdown;charset=utf-8;' : 'text/plain;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `okpage-chat-history-${new Date().toISOString().split('T')[0]}.${exportFormat === 'markdown' ? 'md' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`Chat history exported as ${exportFormat}.`);
    // TODO: Show a success notification/toast
    alert(`Chat history exported as ${exportFormat}.`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selection */}
        <div className="space-y-2">
          <Label htmlFor="languageSelect" className="flex items-center">
            <Languages className="mr-2 h-4 w-4" /> Language
          </Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="languageSelect" className="w-[200px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh-CN">简体中文 (Chinese, Simplified)</SelectItem>
              {/* Add more languages as needed */}
            </SelectContent>
          </Select>
           <p className="text-xs text-muted-foreground">
            Select your preferred language for the UI (localization WIP).
          </p>
        </div>

        <Separator />

        {/* Chat Export */}
        <div className="space-y-2">
          <Label className="flex items-center">
            <Download className="mr-2 h-4 w-4" /> Export Chat History
          </Label>
          <div className="flex items-center space-x-3">
            <Select value={exportFormat} onValueChange={(value: 'markdown' | 'text') => setExportFormat(value)}>
              <SelectTrigger id="exportFormatSelect" className="w-[180px]">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">
                  <div className="flex items-center">
                    <FileCode className="mr-2 h-4 w-4 text-muted-foreground" /> Markdown (.md)
                  </div>
                </SelectItem>
                <SelectItem value="text">
                   <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Plain Text (.txt)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportChat} variant="outline" disabled={!chatHistory || chatHistory.length === 0}>
              Export
            </Button>
          </div>
           <p className="text-xs text-muted-foreground">
            Download your current chat conversation.
          </p>
        </div>

        <Separator className="my-6" /> {/* Increased margin for visual separation */}

        {/* UI Mode Selection */}
        <div className="space-y-3"> {/* Increased spacing for Label and RadioGroup */}
          <Label className="text-base font-medium flex items-center"> {/* Changed to font-medium, text-base for consistency */}
            <LayoutPanelLeft className="mr-2 h-5 w-5 text-primary" /> Panel Display Mode
          </Label>
          <RadioGroup
            value={uiMode}
            onValueChange={(value: string) => setUiMode(value as 'sidepanel' | 'floating')}
            className="space-y-2 pt-1" // Added pt-1 for better alignment with label
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sidepanel" id="mode-sidepanel" />
              <Label htmlFor="mode-sidepanel" className="font-normal cursor-pointer flex items-center">
                <PanelRightOpen className="mr-2 h-4 w-4 text-muted-foreground" /> Native Side Panel (Chrome 114+)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="floating" id="mode-floating" />
              <Label htmlFor="mode-floating" className="font-normal cursor-pointer flex items-center">
                <LayoutPanelLeft className="mr-2 h-4 w-4 text-muted-foreground" /> Floating Panel (Overlay)
              </Label>
            </div>
          </RadioGroup>
          <p className="text-sm text-muted-foreground pt-1">
            Choose how OKPage is displayed. Changes apply on the next panel open/toggle.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsGeneralView;
