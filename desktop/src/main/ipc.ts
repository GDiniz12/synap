import { ipcMain, BrowserWindow, dialog, shell, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export function registerIpcHandlers() {
  // Window control handlers
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
  });

  // Native File Dialog & Export Handlers
  ipcMain.handle('file:saveNote', async (event, { defaultTitle, content, extension = 'md' }: { defaultTitle: string; content: string; extension?: string }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, error: 'No window found' };

    const sanitizedTitle = (defaultTitle || 'nota').replace(/[\\/:*?"<>|]/g, '_');
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Exportar Nota',
      defaultPath: `${sanitizedTitle}.${extension}`,
      filters: [
        { name: 'Markdown (*.md)', extensions: ['md'] },
        { name: 'Texto (*.txt)', extensions: ['txt'] },
        { name: 'Todos os Arquivos (*.*)', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Open external URLs in default web browser
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  // App version and platform info
  ipcMain.handle('app:getInfo', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      isDesktop: true
    };
  });
}
