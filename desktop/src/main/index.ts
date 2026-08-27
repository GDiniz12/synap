import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { registerIpcHandlers } from './ipc';

dotenv.config();

const isDev = process.env.ELECTRON_IS_DEV === '1' || !app.isPackaged;

// URLs de desenvolvimento e produção (ex: Vercel)
const DEV_URL = process.env.FRONTEND_DEV_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
const PROD_URL = process.env.FRONTEND_PROD_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://synap.app';

const TARGET_URL = isDev ? DEV_URL : PROD_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Open external links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Graceful show
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Fallback offline / erro de conexão com tema escuro Geist
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return; // Aborted (ex: redirect)

    mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background: #000000;
              color: #ffffff;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              text-align: center;
              user-select: none;
            }
            .container {
              max-width: 400px;
              padding: 24px;
              border: 1px solid #222222;
              border-radius: 8px;
              background: #0a0a0a;
            }
            h1 { font-size: 18px; margin-bottom: 8px; font-weight: 600; }
            p { font-size: 13px; color: #888888; margin-bottom: 20px; line-height: 1.5; }
            button {
              background: #ffffff;
              color: #000000;
              border: none;
              padding: 8px 16px;
              font-size: 13px;
              font-weight: 500;
              border-radius: 6px;
              cursor: pointer;
              transition: opacity 0.15s ease;
            }
            button:hover { opacity: 0.85; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Não foi possível conectar</h1>
            <p>Verifique sua conexão com a internet ou se o servidor está ativo (${errorDescription}).</p>
            <button onclick="window.location.href='${TARGET_URL}'">Tentar Novamente</button>
          </div>
        </body>
      </html>
    `)}`);
  });

  mainWindow.loadURL(TARGET_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
