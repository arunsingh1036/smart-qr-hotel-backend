const express = require("express");
const http = require("http"); // Added http module
const { Server } = require("socket.io"); // Added socket.io
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const server = http.createServer(app); // Create HTTP server

// Initialize Socket.io and attach cors
const io = new Server(server, {
  cors: {
    origin: "*", // Frontend se connection allow karne ke liye
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use(cors());
app.use(express.json());

// Make 'io' accessible inside routes (middleware ke taur par)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Database Connected Successfully! 🟢");
  })
  .catch((error) => {
    console.log("MongoDB Connection Error: 🔴", error);
  });

// Routes Import
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const menuRoutes = require("./routes/menu");
app.use("/api/menu", menuRoutes);

const orderRoutes = require("./routes/order");
app.use("/api/orders", orderRoutes);

const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

// Socket.io Connection Event
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id} 🔌`);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id} ❌`);
  });
});

app.get("/", (req, res) => {
  res.send("Smart QR Menu API with Socket.io is running perfectly! 🚀");
});

const PORT = process.env.PORT || 5000;

// Use server.listen instead of app.listen
server.listen(PORT, () => {
  console.log(`Server is successfully running on port ${PORT}`);
});