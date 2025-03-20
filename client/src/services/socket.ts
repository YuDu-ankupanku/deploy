// services/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Hard-coded socket URL
const SOCKET_URL = "https://photogram-backend-pnc8.onrender.com";

const initialize = (userId: string): Socket => {
  console.log(`Initializing socket for user ${userId} at ${SOCKET_URL}`);
  socket = io(SOCKET_URL, {
    query: { userId },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("Socket connected with id:", socket?.id);
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });

  return socket;
};

const getSocket = (): Socket | null => socket;

const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const sendMessage = (data: any) => {
  if (!socket) {
    console.error("Socket is not initialized in sendMessage");
    return;
  }
  socket.emit("sendMessage", data);
};

const sendTyping = (conversationId: string) => {
  if (!socket) {
    console.error("Socket is not initialized in sendTyping");
    return;
  }
  socket.emit("typing", conversationId);
};

const sendStopTyping = (conversationId: string) => {
  if (!socket) {
    console.error("Socket is not initialized in sendStopTyping");
    return;
  }
  socket.emit("stopTyping", conversationId);
};

const markMessageRead = (data: { messageId: string }) => {
  if (!socket) {
    console.error("Socket is not initialized in markMessageRead");
    return;
  }
  socket.emit("markMessageRead", data);
};

export default {
  initialize,
  getSocket,
  disconnect,
  sendMessage,
  sendTyping,
  sendStopTyping,
  markMessageRead,
};
