'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export function useSocket() {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      socketRef.current?.emit('sendMessage', { conversationId, content });
    },
    [],
  );

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('joinConversation', { conversationId });
  }, []);

  const emitTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('typing', { conversationId });
  }, []);

  const onNewMessage = useCallback(
    (callback: (message: any) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};
      socket.on('newMessage', callback);
      return () => {
        socket.off('newMessage', callback);
      };
    },
    [],
  );

  const onUserTyping = useCallback(
    (callback: (data: { userId: string; conversationId: string }) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};
      socket.on('userTyping', callback);
      return () => {
        socket.off('userTyping', callback);
      };
    },
    [],
  );

  return {
    socket: socketRef.current,
    connected,
    sendMessage,
    joinConversation,
    emitTyping,
    onNewMessage,
    onUserTyping,
  };
}
