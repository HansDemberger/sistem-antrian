const express = require("express");
const router = express.Router();
const antrianController = require("../controllers/antrianController");

const {
  verifyToken,
  isAdmin,
  isPasien
} = require("../middleware/auth");

// Ambil semua antrian (Admin & Display)
router.get(
  "/",
  verifyToken,
  antrianController.getAllAntrian
);

// Status antrian pasien aktif
router.get(
  "/saya",
  verifyToken,
  antrianController.getStatusAntrian
);

// Pasien pendaftaran antrian baru
router.post(
  "/",
  verifyToken,
  antrianController.tambahAntrian
);

// Admin update prioritas antrian (Aktifkan Prioritas 1 / Utamakan ke #1)
router.patch(
  "/:id/prioritas",
  verifyToken,
  antrianController.updatePrioritasAntrian
);

// Admin verifikasi & queue assignment (Generate Nomor UM-027)
router.patch(
  "/:id/verifikasi",
  verifyToken,
  isAdmin,
  antrianController.verifikasiAntrian
);

// Pasien check-in (Status -> ACTIVE QUEUE)
router.post(
  "/:id/checkin",
  verifyToken,
  antrianController.checkinAntrian
);

router.post(
  "/checkin",
  verifyToken,
  antrianController.checkinAntrian
);

// Admin update tujuan poli
router.patch(
  "/:id/tujuan",
  verifyToken,
  isAdmin,
  antrianController.updateTujuanPelayanan
);

// Admin update status (Panggil / Selesai / Reject)
router.patch(
  "/:id/status",
  verifyToken,
  isAdmin,
  antrianController.updateStatusAntrian
);

// Public display antrian dipanggil
router.get(
  "/dipanggil",
  antrianController.getAntrianDipanggil
);

// Admin hapus antrian & re-compact nomor antrian per poli
router.delete(
  "/:id",
  verifyToken,
  antrianController.deleteAntrian
);

module.exports = router;
