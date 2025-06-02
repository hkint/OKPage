import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import SettingsGeneralView from './SettingsGeneralView';
import SettingsModelView from './SettingsModelView';
import SettingsAgentView from './SettingsAgentView';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';

const SettingsView: React.FC = () => {
  return (
    <Card className="w-full"> {/* Main card for the entire settings area */}
      <CardHeader>
        {/* This CardTitle is for the overall "Settings" view, distinct from titles within each tab's card */}
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4"> {/* Added mb-4 for spacing below tabs list */}
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="model">Model & API</TabsTrigger>
            <TabsTrigger value="agent">Agents</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            {/* SettingsGeneralView already has its own Card, so no extra wrapping needed here */}
            <SettingsGeneralView />
          </TabsContent>

          <TabsContent value="model">
            {/* SettingsModelView already has its own Card */}
            <SettingsModelView />
          </TabsContent>

          <TabsContent value="agent">
            {/* SettingsAgentView already has its own Card */}
            <SettingsAgentView />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SettingsView;
