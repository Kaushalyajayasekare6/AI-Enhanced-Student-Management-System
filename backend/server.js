import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import classTeacherRoutes from "./routes/classTeacherRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import marksRoutes from "./routes/marksRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import schoolDayRoutes from "./routes/schoolDayRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";

import mlRoutes from "./routes/mlRoutes.js";



dotenv.config(); // Load environment variables
connectDB(); // Connect to MongoDB



const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.static("uploads")); // Serve uploaded images

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "API is running..." });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/class-teachers", classTeacherRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/workers", workerRoutes); // ✅ ADDED WORKER ROUTES
app.use("/api/school-days", schoolDayRoutes); // ✅ ADDED SCHOOL DAY ROUTES
app.use("/api/notices", noticeRoutes); // ✅ ADDED NOTICE ROUTES
app.use("/api/ml", mlRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// ✅ FIXED: 404 handler with correct path pattern
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});