const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

let io = null;
const onlineUsers = new Map(); 

const parseCookies = (cookieString) => {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((res, c) => {
    const parts = c.trim().split('=');
    if (parts.length >= 2) {
      const key = parts[0];
      const val = parts.slice(1).join('=');
      res[key] = decodeURIComponent(val);
    }
    return res;
  }, {});
};

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://13.211.128.168",
  "http://13.211.128.168:5173",
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const isLocal = origin.startsWith("http://localhost:") || 
                  origin.startsWith("http://127.0.0.1:") || 
                  origin === "http://localhost" || 
                  origin === "http://127.0.0.1";
  if (isLocal) return true;
  
  const cleanOrigin = origin.replace(/\/$/, "");
  return allowedOrigins.some(o => o.replace(/\/$/, "") === cleanOrigin);
};

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Not allowed by CORS: ${origin}`));
        }
      },
      credentials: true,
    },
    pingTimeout: 60000,
  });

  
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("Authentication error: No cookies found"));
      }

      const cookies = parseCookies(cookieHeader);
      const token = cookies.token;
      if (!token) {
        return next(new Error("Authentication error: Token not found"));
      }

      const decodedObj = jwt.verify(token, process.env.SECRET_KEY);
      const user = await User.findById(decodedObj._id).select("-password");
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error("Authentication error: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    
    socket.join(userId);

    
    io.emit("status_change", {
      userId,
      status: "online",
    });

    
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
    });

    
    socket.on("typing_start", (data) => {
      
      socket.to(data.roomId).emit("typing_status", {
        roomId: data.roomId,
        userId,
        userName: data.userName,
        isTyping: true,
      });
    });

    socket.on("typing_stop", (data) => {
      socket.to(data.roomId).emit("typing_status", {
        roomId: data.roomId,
        userId,
        userName: data.userName,
        isTyping: false,
      });
    });

    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          
          io.emit("status_change", {
            userId,
            status: "offline",
          });
        }
      }
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }
  return io;
};


const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};


const broadcastToRoom = (roomId, event, data) => {
  if (io) {
    io.to(roomId).emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIo,
  isUserOnline,
  broadcastToRoom,
};
