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
  "https://dev-connect-front-end-5m1x.vercel.app",
];

if (process.env.FRONTEND_URL) {
  const customOrigins = process.env.FRONTEND_URL.split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean);
  
  customOrigins.forEach((url) => {
    if (!allowedOrigins.includes(url)) {
      allowedOrigins.push(url);
    }
  });
}

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const cleanOrigin = origin.trim().replace(/\/$/, "");
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
      const cookies = cookieHeader ? parseCookies(cookieHeader) : {};
      const token = cookies.token || socket.handshake.auth?.token || socket.handshake.query?.token;
      const refreshToken = cookies.refreshToken || socket.handshake.auth?.refreshToken || socket.handshake.query?.refreshToken;

      if (!token && !refreshToken) {
        return next(new Error("Authentication error: No authentication tokens found"));
      }

      const secretKey = process.env.JWT_SECRET || process.env.SECRET_KEY;
      const refreshSecret = process.env.REFRESH_TOKEN_SECRET || secretKey;

      let decodedObj = null;
      let authError = null;

      // 1. Try to verify the access token
      if (token) {
        try {
          decodedObj = jwt.verify(token, secretKey);
        } catch (err) {
          authError = err;
        }
      }

      // 2. If access token verification failed or was missing, try the refresh token
      if (!decodedObj && refreshToken) {
        try {
          decodedObj = jwt.verify(refreshToken, refreshSecret);
          authError = null; // Clear the previous error since refresh token is valid
        } catch (err) {
          authError = err;
        }
      }

      // 3. If neither token was successfully verified, throw an error
      if (!decodedObj) {
        return next(new Error("Authentication error: " + (authError ? authError.message : "Tokens not found")));
      }

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

    // Send the list of currently online users to this specific client
    socket.emit("online_users", Array.from(onlineUsers.keys()));

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
    if (Array.isArray(roomId)) {
      io.to(roomId).emit(event, data);
    } else {
      io.to(roomId).emit(event, data);
    }
  }
};

module.exports = {
  initializeSocket,
  getIo,
  isUserOnline,
  broadcastToRoom,
};
