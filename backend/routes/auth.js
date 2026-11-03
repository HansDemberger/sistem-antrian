const express = require("express");
const router = express.Router();

const {
  login,
  createAccountPasien,
} = require("../controllers/authController");

const {
  verifyToken,
  isAdmin,
} = require("../middleware/auth");

router.post("/login", login);

router.post(
  "/create-account",
  verifyToken,
  isAdmin,
  createAccountPasien
);

module.exports = router;