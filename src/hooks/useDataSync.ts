import { useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io();

export function useDataSync(callback: () => void) {
  useEffect(() => {
    socket.on('data_changed', callback);
    return () => {
      socket.off('data_changed', callback);
    };
  }, [callback]);
}
