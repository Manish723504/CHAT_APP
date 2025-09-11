import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/message.Routes.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// create express app + http server
const app = express();
const server = http.createServer(app);

// initialize socket.io
export const io = new Server(server, {
  cors: { origin: "*" },
});

// store online users
export const userSocketMap = {}; 

// socket connection handler
io.on("connection", async (socket) => {
  try {
    // ✅ Get token from handshake
    const token = socket.handshake.auth.token;
    if (!token) return socket.disconnect();

    // ✅ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userID = decoded.userId;
    if (!userID) return socket.disconnect();

    console.log("User Connected:", userID);

    // ✅ Store socket
    userSocketMap[userID] = socket.id;

    // ✅ Emit online users to everyone
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // ✅ Handle disconnect
    socket.on("disconnect", () => {
      console.log("User Disconnected:", userID);
      delete userSocketMap[userID];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

  } catch (err) {
    console.log("Socket auth error:", err.message);
    socket.disconnect();
  }
});

// Middlewares
app.use(express.json({ limit: "4mb" }));
app.use(cors());

app.use("/api/status", (req, res) => res.send("server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

await connectDB();
if(process.env.NODE_ENV !== "production"){

const PORT = process.env.PORT || 2000;
server.listen(PORT, () =>
  console.log("Server is listening on PORT: " + PORT

  ));
} 
export default server;
