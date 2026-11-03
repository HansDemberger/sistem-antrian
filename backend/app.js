require("dotenv").config();
require("./config/database");

// Tangkap Uncaught Exception & Unhandled Rejections agar Nodemon tidak crash
process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err.message || err);
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason);
});

const express = require("express");
const cors = require("cors");

const pasienRoutes = require("./routes/pasien");
const authRoutes = require("./routes/auth");
const antrianRoute = require("./routes/antrian");
const dashboardRoute = require("./routes/dashboard");
const laporanRoute = require("./routes/laporan");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/pasien", pasienRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/laporan", laporanRoute);
app.use("/api/antrian", antrianRoute);
app.use("/api/dashboard", dashboardRoute);

app.get("/", (req, res) => {
  res.send("API Sistem Antrian Berjalan");
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("❌ Global Server Error:", err.stack || err);
  res.status(500).json({
    message: "Terjadi kesalahan internal server",
    error: err.message || "Server Error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

