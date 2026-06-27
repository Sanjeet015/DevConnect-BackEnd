try {
  require("dotenv").config();
} catch (err) {
  console.warn(
    "dotenv not found; falling back to environment variables. Install with: npm install dotenv"
  );
}

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const http = require('http');

const connectDB = require("./config/database");
const { initializeSocket } = require("./utils/socket");

const app = express();
const PORT = process.env.PORT || 8000;


app.set("trust proxy", 1);


app.use(helmet());





const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://13.211.128.168",
  "http://13.211.128.168:5173",
];

const normalize = (origin) => origin?.replace(/\/$/, "");

app.use(
  cors({
    origin: (origin, callback) => {
      
      if (!origin) return callback(null, true);

      const requestOrigin = normalize(origin);

      const isAllowed = allowedOrigins.some(
        (o) => normalize(o) === requestOrigin
      );

      if (isAllowed) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked origin:", origin);
      return callback(null, false); 
    },
    credentials: true,
  })
);




app.use(express.json());
app.use(cookieParser());




const sanitizeMongoOperators = (obj) => {
  if (Array.isArray(obj)) {
    obj.forEach(sanitizeMongoOperators);
  } else if (obj && typeof obj === "object") {
    Object.keys(obj).forEach((key) => {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else {
        sanitizeMongoOperators(obj[key]);
      }
    });
  }
};

app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    sanitizeMongoOperators(req.body);
  }
  next();
});




const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 200 : 10000,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 30 : 1000,
  message: {
    message: "Too many auth requests, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/login", authLimiter);
app.use("/signup", authLimiter);
app.use(generalLimiter);




const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const projectRouter = require("./routes/project");
const groupRouter = require("./routes/group");
const chatRouter = require("./routes/chat");

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", projectRouter);
app.use("/", groupRouter);
app.use("/", chatRouter);




const server = http.createServer(app);
initializeSocket(server);

mongoose.set("bufferCommands", false);

server.listen(PORT, () => {
  console.log(`Server is successfully listening on port ${PORT}`);
});




connectDB()
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch(async (err) => {
    console.error("Primary DB connection failed:", err.message);

    if (
      process.env.MONGO_URI !== "mongodb://127.0.0.1:27017/devConnect"
    ) {
      console.log("Trying local MongoDB fallback...");

      try {
        await mongoose.connect(
          "mongodb://127.0.0.1:27017/devConnect"
        );
        console.log("Connected to local MongoDB fallback!");
      } catch (localErr) {
        console.error(
          "Local MongoDB fallback also failed:",
          localErr.message
        );
        console.warn("Server running without database.");
      }
    } else {
      console.warn("Server running without database.");
    }
  });