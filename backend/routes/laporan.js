const express = require("express");

const router = express.Router();

const laporanController =
require("../controllers/laporanController");

const {
  verifyToken,
  isAdmin,
} = require("../middleware/auth");

router.get(
  "/",
  verifyToken,
  isAdmin,
  laporanController.getLaporan
);

module.exports = router;