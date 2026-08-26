import { useEffect, useRef, useState, useCallback } from 'react';

export function useCollaboration(
  roomId: string | undefined, 
  valueType: 'document_change' | 'drawing_change',
  onRemoteChange: (newValue: string) => void
) {
  const [users, setUsers] = useState<any[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      const token = localStorage.getItem('token');
      const wsUrl = process.env.NEXT_PUBLIC_API_URL 
        ? process.env.NEXT_PUBLIC_API_URL.replace('http', 'ws') 
        : `ws://${window.location.hostname}:3000`;
      
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
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[useCollaboration] Received WS message:', data.type);
          if (data.type === 'presence') {
            setUsers(data.users);
          } else if (data.type === valueType) {
            callbackRef.current(data.value);
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };
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
      console.log('[useCollaboration] Broadcasting', valueType);
      wsRef.current.send(JSON.stringify({
        type: valueType,
        value: newValue
      }));
    }
  }, [valueType]);

  const callbackRef = useRef(onRemoteChange);
  useEffect(() => {
    callbackRef.current = onRemoteChange;
  }, [onRemoteChange]);

  return { users, status, broadcastChange };
}
