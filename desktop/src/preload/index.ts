import { contextBridge, ipcRenderer } from 'electron';

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

const desktopAPI: SynapDesktopAPI = {
  isDesktop: true,
  platform: process.platform,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  saveNoteToFile: (options) => ipcRenderer.invoke('file:saveNote', options),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
};

contextBridge.exposeInMainWorld('synapDesktop', desktopAPI);
