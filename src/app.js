try {
  require('dotenv').config();
} catch (err) {
  console.warn('dotenv not found; falling back to environment variables. Install with: npm install dotenv');
}

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require("http");

const connectDB = require("./config/database");
const { initializeSocket } = require("./utils/socket");

const app = express();
const PORT = process.env.PORT;

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://13.211.128.168"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// NoSQL injection protection — recursively strip MongoDB operator keys from req.body.
// Replaces express-mongo-sanitize which is incompatible with this router's read-only req.query.
const sanitizeMongoOperators = (obj) => {
  if (Array.isArray(obj)) {
    obj.forEach(sanitizeMongoOperators);
  } else if (obj !== null && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeMongoOperators(obj[key]);
      }
    });
  }
};
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeMongoOperators(req.body);
  }
  next();
});

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === "production" ? 200 : 10000, // Limit each IP to 200 requests per window in prod, high in dev
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === "production" ? 30 : 1000, // Limit to 30 requests per window in prod, high in dev
  message: { message: "Too many auth requests, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use("/login", authLimiter);
app.use("/signup", authLimiter);
app.use(generalLimiter);

// Routers
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const projectRouter = require('./routes/project');
const groupRouter = require('./routes/group');
const chatRouter = require('./routes/chat');

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", projectRouter);
app.use("/", groupRouter);
app.use("/", chatRouter);

// HTTP and Socket.IO Server wrapper
const server = http.createServer(app);
initializeSocket(server);

const mongoose = require("mongoose");
mongoose.set("bufferCommands", false);

// Start server immediately so it's responsive to client requests
server.listen(PORT, () => {
  console.log(`Server is successfully listening on port ${PORT}`);
});

// Attempt database connection asynchronously
connectDB()
  .then(() => {
    console.log(`Database connected successfully to ${process.env.MONGO_URI}`);
  })
  .catch(async (err) => {
    console.error(`Primary database connection failed to ${process.env.MONGO_URI}:`, err.message);
    
    // Only attempt local fallback if the primary wasn't already local
    if (process.env.MONGO_URI !== "mongodb://127.0.0.1:27017/devConnect") {
      console.log("Attempting local database fallback (mongodb://127.0.0.1:27017/devConnect)...");
      try {
        await mongoose.connect("mongodb://127.0.0.1:27017/devConnect");
        console.log("Connected to local database fallback successfully!");
      } catch (localErr) {
        console.error("Local database fallback connection also failed:", localErr.message);
        console.warn("WARNING: Server is running but database is offline.");
      }
    } else {
      console.warn("WARNING: Server is running but database is offline.");
    }
  });
