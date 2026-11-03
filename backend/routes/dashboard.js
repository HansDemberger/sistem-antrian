const express = require("express");
const router = express.Router();

const dashboardController =
require("../controllers/dashboardController");

const {
  verifyToken,
  isAdmin,
} = require("../middleware/auth");

router.get("/", verifyToken, isAdmin, dashboardController.getDashboard);

router.get("/line-chart", verifyToken, isAdmin, dashboardController.getLineChart);

router.get("/prioritas-chart", verifyToken, isAdmin, dashboardController.getPrioritasChart);

router.get("/poli-chart", verifyToken, isAdmin, dashboardController.getPoliChart);
router.get(
  "/pasien-dipanggil",
  verifyToken,
  isAdmin,
  dashboardController.getPasienDipanggil
);
router.get(
  "/antrian-terbaru",
  verifyToken,
  isAdmin,
  dashboardController.getAntrianTerbaru
);
module.exports = router;