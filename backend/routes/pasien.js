const express = require("express");
const router = express.Router();

const {
  getAllPasien,
  getPasienById,
  createPasien,
  updatePasien,
  createAccountForPasien,
  updateStatusPasien,
  getProfilPasien,
} = require("../controllers/pasienController");

const {
  verifyToken,
  isAdmin,
  isPasien,
} = require("../middleware/auth");

router.get("/profil/me", verifyToken, isPasien, getProfilPasien);

router.get("/", verifyToken, getAllPasien);

router.get("/:id", verifyToken, getPasienById);

router.post("/", verifyToken, isAdmin, createPasien);

router.put("/:id", verifyToken, isAdmin, updatePasien);

router.post("/:id/buat-akun", verifyToken, isAdmin, createAccountForPasien);

router.patch("/:id/status", verifyToken, isAdmin, updateStatusPasien);

module.exports = router;