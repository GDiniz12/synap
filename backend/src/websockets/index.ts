import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import url from 'url';
import { prisma } from '../config/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

// Map of roomId (notaId) to Set of connected clients
const rooms = new Map<string, Set<WebSocket>>();

// Map to store user info per socket
const socketUsers = new WeakMap<WebSocket, { id: string; name: string; color: string }>();

function generateColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

function broadcastToRoom(roomId: string, message: any, excludeSocket?: WebSocket) {
  const clients = rooms.get(roomId);
  if (!clients) return;
  
  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastUsersList(roomId: string) {
  const clients = rooms.get(roomId);
  if (!clients) return;
  
  // Get all users in the room and deduplicate by userId
  const uniqueUsersMap = new Map<string, any>();
  
  Array.from(clients).forEach(client => {
    const user = socketUsers.get(client);
    if (user && !uniqueUsersMap.has(user.id)) {
      uniqueUsersMap.set(user.id, user);
    }
  });
  
  const users = Array.from(uniqueUsersMap.values());
  broadcastToRoom(roomId, { type: 'presence', users });
}

export function initializeWebSockets(wss: WebSocketServer) {
  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const parsedUrl = url.parse(req.url || '', true);
    const token = parsedUrl.query.token as string;
    const roomId = parsedUrl.pathname?.slice(1) || ''; // e.g. "nota_123"

    if (!token || !roomId) {
      ws.close(4001, 'Unauthorized or missing room');
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      ws.close(4001, 'Unauthorized: Invalid token');
      return;
    }

    const userId = decoded.userId;
    
    // Fetch user name from DB
    let userName = 'Usuário';
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        userName = user.name || user.email.split('@')[0];
      }
    } catch (e) {
      console.error('Failed to fetch user', e);
    }
    
    // Store user data
    socketUsers.set(ws, { 
      id: userId, 
      name: userName,
      color: generateColor(userId)
    });

    // Add to room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId)!.add(ws);

    // Send immediate presence update
    broadcastUsersList(roomId);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        const user = socketUsers.get(ws);
        
        // Broadcast standard changes to everyone else in the room
        if (data.type === 'document_change' || data.type === 'drawing_change') {
          broadcastToRoom(roomId, data, ws);
        } else if (data.type === 'cursor_move' && user) {
          broadcastToRoom(roomId, {
            type: 'cursor_move',
            userId: user.id,
            userName: user.name,
            color: user.color,
            x: data.x,
            y: data.y,
            active: data.active !== false
          }, ws);
        }
      } catch (e) {
        console.error('Invalid message received', e);
      }
    });

    ws.on('close', () => {
      const user = socketUsers.get(ws);
      if (user) {
        broadcastToRoom(roomId, {
          type: 'cursor_move',
          userId: user.id,
          userName: user.name,
          color: user.color,
          active: false
        }, ws);
      }

      const clients = rooms.get(roomId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          rooms.delete(roomId);
        } else {
          broadcastUsersList(roomId);
        }
      }
    });
  });
}
