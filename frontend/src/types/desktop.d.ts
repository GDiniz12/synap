export interface TesseractDesktopAPI {
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

export type SynapDesktopAPI = TesseractDesktopAPI;

declare global {
  interface Window {
    tesseractDesktop?: TesseractDesktopAPI;
    synapDesktop?: TesseractDesktopAPI;
  }
}
