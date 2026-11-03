const db = require("../config/database");

// ==============================
// GET ALL PASIEN
// ==============================
exports.getAllPasien = (req, res) => {
  const sql = `
    SELECT
      id_pasien,
      nik,
      nama_pasien,
      nama_pasien AS nama,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      no_hp,
      created_at
    FROM pasien
    ORDER BY id_pasien DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// ==============================
// GET PASIEN BY ID
// ==============================
exports.getPasienById = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      id_pasien,
      nik,
      nama_pasien,
      nama_pasien AS nama,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      no_hp,
      TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) AS umur
    FROM pasien
    WHERE id_pasien = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) {
      return res.status(404).json({ message: "Pasien tidak ditemukan" });
    }
    res.json(result[0]);
  });
};

// ==============================
// CREATE PASIEN BARU
// ==============================
exports.createPasien = (req, res) => {
  const {
    nik,
    nama_pasien,
    nama,
    tanggal_lahir,
    jenis_kelamin,
    alamat,
    no_hp,
  } = req.body;

  const finalNama = nama_pasien || nama;
  const safeNoHp = (no_hp || "").toString().trim().slice(0, 25);

  if (!nik || !finalNama || !tanggal_lahir || !jenis_kelamin) {
    return res.status(400).json({
      message: "NIK, Nama Pasien, Tanggal Lahir, dan Jenis Kelamin wajib diisi",
    });
  }

  const sql = `
    INSERT INTO pasien
    (nik, nama_pasien, tanggal_lahir, jenis_kelamin, alamat, no_hp)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [nik, finalNama, tanggal_lahir, jenis_kelamin, alamat || "", safeNoHp],
    (err, result) => {
      if (err) {
        console.error("Create Pasien Error:", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: `Gagal! NIK '${nik}' sudah terdaftar dalam sistem pasien. Silakan periksa kembali NIK yang diinput.`
          });
        }
        return res.status(500).json({
          message: err.message || "Terjadi kesalahan saat menambahkan data pasien."
        });
      }

      res.json({
        message: "Data pasien berhasil ditambahkan",
        insertId: result.insertId,
      });
    }
  );
};

// ==============================
// UPDATE PASIEN
// ==============================
exports.updatePasien = (req, res) => {
  const { id } = req.params;
  const {
    nik,
    nama_pasien,
    nama,
    tanggal_lahir,
    jenis_kelamin,
    alamat,
    no_hp,
  } = req.body;

  const finalNama = nama_pasien || nama;
  const safeNoHp = (no_hp || "").toString().trim().slice(0, 25);

  if (!nik || !finalNama || !tanggal_lahir || !jenis_kelamin) {
    return res.status(400).json({
      message: "NIK, Nama Pasien, Tanggal Lahir, dan Jenis Kelamin wajib diisi",
    });
  }

  const sql = `
    UPDATE pasien
    SET nik = ?, nama_pasien = ?, tanggal_lahir = ?, jenis_kelamin = ?, alamat = ?, no_hp = ?
    WHERE id_pasien = ?
  `;

  db.query(
    sql,
    [nik, finalNama, tanggal_lahir, jenis_kelamin, alamat || "", safeNoHp, id],
    (err, result) => {
      if (err) {
        console.error("Update Pasien Error:", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: `Gagal! NIK '${nik}' sudah terdaftar pada pasien lain.`
          });
        }
        return res.status(500).json({
          message: err.message || "Terjadi kesalahan saat memperbarui data pasien."
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Data pasien tidak ditemukan" });
      }

      res.json({ message: "Data pasien berhasil diperbarui" });
    }
  );
};

// ==============================
// CREATE AKUN UNTUK PASIEN (BY ADMIN)
// ==============================
exports.createAccountForPasien = (req, res) => {
  const { id } = req.params; // id_pasien
  const { username, password, email } = req.body;

  const finalUsername = username || email;

  if (!finalUsername || !password) {
    return res.status(400).json({ message: "Email / Username dan Password wajib diisi" });
  }

  // Cari data pasien
  db.query("SELECT id_pasien, nik, nama_pasien FROM pasien WHERE id_pasien = ?", [id], (errPasien, resPasien) => {
    if (errPasien || !resPasien || resPasien.length === 0) {
      return res.status(404).json({ message: "Data pasien tidak ditemukan" });
    }

    const pasien = resPasien[0];
    const namaUser = pasien.nama_pasien || "Pasien";

    // Update NIK pasien agar sama dengan username/email login
    db.query("UPDATE pasien SET nik = ? WHERE id_pasien = ?", [finalUsername, id]);

    // Cek apakah user sudah ada di tabel user berdasarkan id_pasien atau username
    db.query("SELECT id_user FROM user WHERE username = ? OR id_pasien = ?", [finalUsername, id], (errUser, resUser) => {
      if (!errUser && resUser && resUser.length > 0) {
        // Update password & id_pasien jika user sudah ada
        db.query(
          "UPDATE user SET password = ?, role = 'pasien', nama_user = ?, id_pasien = ? WHERE username = ? OR id_pasien = ?",
          [password, namaUser, id, finalUsername, id],
          (errUpd) => {
            if (errUpd) return res.status(500).json(errUpd);
            return res.json({ message: `Akun login pasien ${namaUser} (Username: ${finalUsername}) berhasil diperbarui!` });
          }
        );
      } else {
        // Insert user baru dengan role 'pasien' dan id_pasien yang terikat langsung
        const sqlInsert = `INSERT INTO user (nama_user, username, password, role, id_pasien) VALUES (?, ?, ?, 'pasien', ?)`;
        db.query(sqlInsert, [namaUser, finalUsername, password, id], (errIns, resIns) => {
          if (errIns) return res.status(500).json(errIns);

          res.json({
            message: `Akun login pasien ${namaUser} (Username: ${finalUsername}) berhasil dibuat!`,
            id_user: resIns.insertId
          });
        });
      }
    });
  });
};

// ==============================
// UPDATE STATUS PASIEN (COMPATIBILITY)
// ==============================
exports.updateStatusPasien = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  res.json({ message: `Status pasien #${id} berhasil diperbarui (${status || 'Aktif'})` });
};

// ==============================
// GET PROFIL PASIEN SAYA (USER LOGIN)
// ==============================
exports.getProfilPasien = (req, res) => {
  const id_user = req.user?.id;
  const username = req.user?.username;
  const token_id_pasien = req.user?.id_pasien;

  const sql = `
    SELECT
      p.id_pasien,
      p.nik,
      p.nama_pasien,
      p.nama_pasien AS nama,
      p.tanggal_lahir,
      p.jenis_kelamin,
      p.alamat,
      p.no_hp,
      TIMESTAMPDIFF(YEAR, p.tanggal_lahir, CURDATE()) AS umur
    FROM pasien p
    LEFT JOIN user u ON (u.id_pasien = p.id_pasien OR u.username = p.nik)
    WHERE p.id_pasien = ? OR u.id_user = ? OR u.username = ? OR p.nik = ?
    ORDER BY p.id_pasien DESC
    LIMIT 1
  `;

  db.query(sql, [token_id_pasien || 0, id_user, username, username], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length > 0) {
      return res.json(result[0]);
    }

    res.status(404).json({ message: "Data profil pasien tidak ditemukan untuk akun ini" });
  });
};