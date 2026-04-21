/**
 * useSocket - Real-time lyrics & playback sync via Socket.io
 */
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = (roomId, onPlaybackSync, onLyricSync) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
    const socket = socketRef.current;

    socket.emit('join_room', { roomId, userId: 'local' });

    socket.on('playback_sync', onPlaybackSync);
    socket.on('lyric_sync', onLyricSync);

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const emitPlayback = useCallback((data) => {
    socketRef.current?.emit('playback_update', { roomId, ...data });
  }, [roomId]);

  const emitLyric = useCallback((data) => {
    socketRef.current?.emit('lyric_update', { roomId, ...data });
  }, [roomId]);

  return { emitPlayback, emitLyric };
};
