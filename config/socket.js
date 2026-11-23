import { Server } from "socket.io";
import registerProgressSocket from "../controllers/progress.socket.js";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // Register progress events
    registerProgressSocket(socket, io);

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });
};

export const getIO = () => io;
