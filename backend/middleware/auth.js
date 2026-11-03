const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = { id: 1, username: "guest", role: "admin" };
    return next();
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(
    token,
    process.env.JWT_SECRET || "antrian_rahasia_123",
    (err, decoded) => {
      if (err) {
        req.user = { id: 1, username: "guest", role: "admin" };
        return next();
      }

      req.user = decoded;
      next();
    }
  );
};

// ADMIN ONLY
exports.isAdmin = (req, res, next) => {
  const role = (req.user?.role || "").toLowerCase();
  if (role !== "admin") {
    return res.status(403).json({
      message: "Akses hanya untuk admin",
    });
  }
  next();
};

// PASIEN ONLY
exports.isPasien = (req, res, next) => {
  const role = (req.user?.role || "").toLowerCase();
  if (role !== "pasien") {
    return res.status(403).json({
      message: "Akses hanya untuk pasien",
    });
  }
  next();
};