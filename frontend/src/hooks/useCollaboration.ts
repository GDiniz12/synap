import { useEffect, useRef, useState, useCallback } from 'react';

export interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  active: boolean;
  lastActive: number;
}

function getWebSocketUrl(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Explicit WebSocket URL
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/+$/, '');
  }

  // 2. Derive from NEXT_PUBLIC_API_URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && apiUrl.startsWith('http')) {
    const base = apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return base.replace(/^http/, 'ws');
  }

  // 3. In local development on HTTP
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    return `ws://${window.location.hostname}:3000`;
  }

  return null;
}

export function useCollaboration(
  roomId: string | undefined, 
  valueType: 'document_change' | 'drawing_change',
  onRemoteChange: (newValue: string) => void
) {
  const [users, setUsers] = useState<any[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  // Inactivity cleanup timer for remote cursors
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let changed = false;
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          if (updated[key].active && now - updated[key].lastActive > 3000) {
            updated[key] = { ...updated[key], active: false };
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!roomId) {
      setCursors({});
      setUsers([]);
      return;
    }

    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      const token = localStorage.getItem('token');
      const wsUrl = getWebSocketUrl();

      if (!wsUrl) {
        console.warn('[useCollaboration] No WebSocket URL found. Set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_WS_URL in production.');
        setStatus('disconnected');
        return;
      }

      try {
        const ws = new WebSocket(`${wsUrl}/${roomId}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[useCollaboration] Connected to WS:', wsUrl, 'Room:', roomId);
          setStatus('connected');
        };
        
        ws.onclose = (event) => {
          console.log(`[useCollaboration] Disconnected from WS (Code: ${event.code}, Reason: ${event.reason || 'None'})`);
          setStatus('disconnected');
          if (event.code !== 1000 && event.code !== 4001) {
            reconnectTimer = setTimeout(connect, 3000);
          }
        };
        
        ws.onerror = (err) => {
          console.error('[useCollaboration] WebSocket error:', err);
          setStatus('disconnected');
        };
      
      const myUserId = (() => {
        if (!token) return null;
        try {
          const payload = token.split('.')[1];
          if (!payload) return null;
          const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
          const parsed = JSON.parse(json);
          return parsed.userId || parsed.id || null;
        } catch {
          return null;
        }
      })();

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence') {
            setUsers(data.users);
          } else if (data.type === 'cursor_move') {
            // Never track or display own cursor
            if (myUserId && data.userId === myUserId) {
              return;
            }
            setCursors((prev) => ({
              ...prev,
              [data.userId]: {
                id: data.userId,
                name: data.userName || 'Anônimo',
                color: data.color || '#3b82f6',
                x: data.x,
                y: data.y,
                active: data.active !== false,
                lastActive: Date.now()
              }
            }));
          } else if (data.type === valueType) {
            callbackRef.current(data.value);
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };
    } catch (err) {
      console.error('[useCollaboration] Failed to connect WebSocket:', err);
      setStatus('disconnected');
    }
  };

  connect();

    return () => {
      console.log('[useCollaboration] Cleaning up WS');
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
    };
  }, [roomId, valueType]);

  const broadcastChange = useCallback((newValue: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: valueType,
        value: newValue
      }));
    }
  }, [valueType]);

  // Throttled cursor broadcast (~30ms)
  const lastCursorSendRef = useRef<number>(0);
  const pendingCursorRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const cursorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const broadcastCursor = useCallback((x: number, y: number, active: boolean = true) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    
    // Immediate send if inactive (e.g. mouseleave / unmount)
    if (!active) {
      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
        cursorTimerRef.current = null;
      }
      wsRef.current.send(JSON.stringify({
        type: 'cursor_move',
        x,
        y,
        active: false
      }));
      lastCursorSendRef.current = now;
      return;
    }

    // If within throttle window, queue trailing update
    if (now - lastCursorSendRef.current < 30) {
      pendingCursorRef.current = { x, y, active };
      if (!cursorTimerRef.current) {
        cursorTimerRef.current = setTimeout(() => {
          if (pendingCursorRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'cursor_move',
              ...pendingCursorRef.current
            }));
            lastCursorSendRef.current = Date.now();
            pendingCursorRef.current = null;
          }
          cursorTimerRef.current = null;
        }, 30);
      }
      return;
    }

    // Otherwise send immediately
    lastCursorSendRef.current = now;
    wsRef.current.send(JSON.stringify({
      type: 'cursor_move',
      x,
      y,
      active: true
    }));
  }, []);

  const callbackRef = useRef(onRemoteChange);
  useEffect(() => {
    callbackRef.current = onRemoteChange;
  }, [onRemoteChange]);

  return { users, cursors, status, broadcastChange, broadcastCursor };
}

