import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;
  const token = sessionStorage.getItem('catalyst_token');
  socket = io(SOCKET_URL, {
    auth: { token },
    withCredentials: true,
  });
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
