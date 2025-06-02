import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react'; // Assuming WXT uses Vite

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'OKPage',
    version: '0.1.0',
    manifest_version: 3,
    permissions: [
      'activeTab',
      'storage',
      'scripting',
      'contextMenus',
      'sidePanel',
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'OKPage', // This title appears on hover
    },
    // Configure the side panel to be opened from the action icon
    sidePanel: {
      defaultPath: 'sidepanel/index.html', // WXT maps entrypoints/sidepanel/index.html to sidepanel/index.html
    },
    icons: {
      '128': 'icon/128.png',
    },
    // Background script is usually defined by having an entrypoint file like background.ts
    // Content script is defined by having an entrypoint file like content.ts and its matches in WXT config
    // Side panel is defined by having an entrypoint file like sidepanel.html/tsx
  },
  // Entrypoints are automatically detected from the entrypoints/ directory
  // Content scripts also need their "matches" patterns defined,
  // WXT default for a top-level content.ts might be <all_urls> due to host_permissions.
  // Explicitly defining content_scripts if needed:
  // "content_scripts": [
  //   {
  //     "matches": ["<all_urls>"],
  //     "js": ["content.js"] // WXT handles the JS output name
  //   }
  // ],
  // However, WXT way is to define it in the entrypoints config if not auto-detected:
  // contentScripts: [{ main: () => import('./entrypoints/content') matches: ['<all_urls>'] }]
  // For now, relying on host_permissions and auto-detection for content.ts
  // Vite config if needed for React, though @wxt-dev/module-react might handle it
  // vite: () => ({
  //   plugins: [react()],
  // }),
});
// Extra comments that were outside the main config object, now tidied up or removed.
// The lines below were causing the parse error.
//  // For content scripts, ensure they are configured correctly if not auto-detected with all_urls
//  // WXT should automatically pick up entrypoints/background.ts and entrypoints/content.ts.
//  // For content.ts, we need to ensure it's configured to match <all_urls> if not default.
//  // WXT typically handles HTML generation for React entrypoints like popup and options pages.
//  // For sidePanel, if it's a React component, WXT might also handle HTML generation.
//  // We defined it as 'entrypoints/sidepanel/index.html' and WXT will map it.
// }); // This was the extraneous closing part
