export interface SynapDesktopAPI {
  isDesktop: boolean;
  platform: string;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  saveNoteToFile: (options: { defaultTitle: string; content: string; extension?: string }) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;
  openExternal: (url: string) => Promise<boolean>;
  getAppInfo: () => Promise<{ version: string; platform: string; isDesktop: boolean }>;
}

declare global {
  interface Window {
    synapDesktop?: SynapDesktopAPI;
  }
}
