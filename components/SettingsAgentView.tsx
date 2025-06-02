import React, { useState, useEffect, ChangeEvent } from 'react';
import { useAppStore, type Agent } from '~/store';
import { Button } from '~/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Slider } from '~/components/ui/slider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '~/components/ui/alert-dialog';
import { PlusCircle, Upload, Download as DownloadIcon, Users, Trash2, Edit3, Save, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

// Default values for new agents, consistent with store defaults
const DEFAULT_NEW_AGENT_SYSTEM_PROMPT = "You are a helpful AI assistant.";
const DEFAULT_NEW_AGENT_TEMPERATURE = 0.7;
const DEFAULT_NEW_AGENT_MAX_TOKENS = 4096;
const DEFAULT_NEW_AGENT_TOP_P = 1.0;

interface AgentEditState extends Partial<Agent> {
  // Used to store temporary edits before saving
}

const SettingsAgentView: React.FC = () => {
  const { agents, currentAgentId, addAgent, updateAgent, deleteAgent, setCurrentAgentId } = useAppStore();
  const [editingAgent, setEditingAgent] = useState<AgentEditState | null>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  useEffect(() => {
    // If currentAgentId changes and it's not the one being edited, update edit form
    if (currentAgentId && currentAgentId !== editingAgent?.id) {
      const agentToEdit = agents.find(a => a.id === currentAgentId);
      if (agentToEdit) {
        setEditingAgent({ ...agentToEdit });
        setExpandedAgentId(currentAgentId); // Expand the new current agent
      } else {
        setEditingAgent(null); // Current agent not found, clear form
        setExpandedAgentId(null);
      }
    } else if (!currentAgentId) {
        setEditingAgent(null); // No current agent, clear form
        setExpandedAgentId(null);
    }
  }, [currentAgentId, agents]);


  const handleAddNewAgent = () => {
    const newAgentId = `agent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newAgent: Agent = {
      id: newAgentId,
      name: `New Agent ${agents.length + 1}`,
      systemPrompt: DEFAULT_NEW_AGENT_SYSTEM_PROMPT,
      temperature: DEFAULT_NEW_AGENT_TEMPERATURE,
      maxTokens: DEFAULT_NEW_AGENT_MAX_TOKENS,
      topP: DEFAULT_NEW_AGENT_TOP_P,
    };
    addAgent(newAgent);
    setCurrentAgentId(newAgent.id); // This will also trigger the useEffect above to populate editingAgent
    setExpandedAgentId(newAgent.id); // Expand the new agent for editing
  };

  const handleEditFieldChange = (field: keyof AgentEditState, value: string | number) => {
    if (editingAgent) {
      setEditingAgent({ ...editingAgent, [field]: value });
    }
  };

  const handleSliderChange = (field: keyof AgentEditState, value: number[]) => {
     if (editingAgent) {
      setEditingAgent({ ...editingAgent, [field]: value[0] });
    }
  };

  const handleSaveChanges = () => {
    if (editingAgent && editingAgent.id) {
      // Validate required fields (name, systemPrompt, temperature)
      if (!editingAgent.name?.trim()) {
        alert("Agent name cannot be empty."); // Replace with toast later
        return;
      }
      if (!editingAgent.systemPrompt?.trim()) {
        alert("System prompt cannot be empty."); // Replace with toast later
        return;
      }
      if (editingAgent.temperature === undefined || editingAgent.temperature < 0 || editingAgent.temperature > 2) {
        alert("Temperature must be between 0 and 2."); // Replace with toast later
        return;
      }

      updateAgent(editingAgent.id, editingAgent as Partial<Agent>);
      // No need to call setCurrentAgentId here as it should re-sync active settings if currentAgentId was updated
      // If the currently edited agent IS the currentAgentId, the store's syncActiveAgentSettings will pick up changes
      // from the 'agents' array update if currentAgentId itself didn't change.
      // To be safe, explicitly call sync if the updated agent is the current one.
      if(editingAgent.id === currentAgentId) {
        useAppStore.getState().syncActiveAgentSettings();
      }
      // setEditingAgent(null); // Optionally close edit form on save
      // setExpandedAgentId(null);
      alert("Agent saved!"); // Replace with toast
    }
  };

  const handleCancelEdit = () => {
    const agentToRevert = agents.find(a => a.id === editingAgent?.id);
    if (agentToRevert) setEditingAgent({...agentToRevert}); // Revert to stored state
    else setEditingAgent(null);
    // setExpandedAgentId(null); // Keep it open or close, depends on UX preference
  };

  const handleDeleteAgent = (agentId: string) => {
    if (agents.length <= 1) {
      alert("Cannot delete the last agent."); // Replace with toast
      return;
    }
    deleteAgent(agentId);
    if (editingAgent?.id === agentId) {
      setEditingAgent(null); // Clear edit form if deleted agent was being edited
      setExpandedAgentId(null);
    }
    // currentAgentId will be updated by deleteAgent action if necessary
  };

  const toggleExpandAgent = (agentId: string) => {
    if (expandedAgentId === agentId) { // Clicking current expanded agent (to close or switch to edit)
      if (editingAgent?.id === agentId) { // Already editing this one, do nothing or close
        // setExpandedAgentId(null); // Option to close
        // setEditingAgent(null);
      } else { // Switch to edit this one
        const agentToEdit = agents.find(a => a.id === agentId);
        if (agentToEdit) {
          setEditingAgent({ ...agentToEdit });
          setCurrentAgentId(agentId); // Make it the active one for editing
        }
      }
    } else { // Clicking a new agent
      const agentToEdit = agents.find(a => a.id === agentId);
      if (agentToEdit) {
        setEditingAgent({ ...agentToEdit });
        setCurrentAgentId(agentId); // Make it the active one for editing
        setExpandedAgentId(agentId);
      }
    }
  };

  const handleImportAgents = () => console.log('Import Agents clicked - placeholder');
  const handleExportAgents = () => console.log('Export Agents clicked - placeholder');


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-5 w-5" /> Manage Agents
        </CardTitle>
        <CardDescription>Create, edit, and manage your AI agent personas and their settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="default" onClick={handleAddNewAgent}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Agent
          </Button>
          <Button variant="outline" onClick={handleImportAgents} disabled> {/* Disabled for now */}
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={handleExportAgents} disabled> {/* Disabled for now */}
            <DownloadIcon className="mr-2 h-4 w-4" /> Export All
          </Button>
        </div>

        <Separator className="mb-6"/>

        <h3 className="text-lg font-medium mb-4">Current Agents</h3>
        {agents.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No agents configured. Click "Add New Agent" to begin.</p>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <Card key={agent.id} className={`transition-all duration-200 ${expandedAgentId === agent.id ? 'shadow-lg border-primary' : ''}`}>
                <CardHeader
                  className="flex flex-row items-center justify-between py-3 px-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpandAgent(agent.id)}
                >
                  <CardTitle className="text-md">{agent.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                     {agent.id === currentAgentId && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Active</span>
                     )}
                    {expandedAgentId === agent.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
                </CardHeader>
                {expandedAgentId === agent.id && editingAgent && editingAgent.id === agent.id && (
                  <CardContent className="pt-4 px-4 pb-2 border-t">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`agentName-${agent.id}`}>Agent Name</Label>
                        <Input id={`agentName-${agent.id}`} value={editingAgent.name || ''} onChange={(e) => handleEditFieldChange('name', e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor={`systemPrompt-${agent.id}`}>System Prompt</Label>
                        <Textarea id={`systemPrompt-${agent.id}`} value={editingAgent.systemPrompt || ''} onChange={(e) => handleEditFieldChange('systemPrompt', e.target.value)} rows={6} className="min-h-[100px]" />
                      </div>
                      <div>
                        <Label htmlFor={`temperature-${agent.id}`} className="block mb-1">Temperature: <span className="text-primary font-semibold">{editingAgent.temperature?.toFixed(1)}</span></Label>
                        <Slider id={`temperature-${agent.id}`} value={[editingAgent.temperature || 0.7]} onValueChange={(val) => handleSliderChange('temperature', val)} min={0} max={2} step={0.1} />
                      </div>
                       <div>
                        <Label htmlFor={`maxTokens-${agent.id}`}>Max Tokens (optional)</Label>
                        <Input id={`maxTokens-${agent.id}`} type="number" value={editingAgent.maxTokens || ''} onChange={(e) => handleEditFieldChange('maxTokens', parseInt(e.target.value,10) || undefined)} placeholder="Default (e.g., 4096)" />
                      </div>
                       <div>
                        <Label htmlFor={`topP-${agent.id}`}>Top P (optional)</Label>
                         <Slider id={`topP-${agent.id}`} value={[editingAgent.topP || 1.0]} onValueChange={(val) => handleSliderChange('topP', val)} min={0} max={1} step={0.05} />
                         <span className="text-xs text-muted-foreground">Current: {editingAgent.topP?.toFixed(2)}</span>
                      </div>
                    </div>
                    <CardFooter className="px-0 pt-6 pb-2 flex justify-end space-x-2">
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={agents.length <= 1}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the agent "{agent.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteAgent(agent.id)}>Delete Agent</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                      <Button size="sm" onClick={handleSaveChanges}><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                    </CardFooter>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SettingsAgentView;
