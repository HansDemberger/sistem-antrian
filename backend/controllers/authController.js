const db = require("../config/database");
const jwt = require("jsonwebtoken");

// ==============================
// LOGIN USER (Admin / Pasien)
// ==============================
exports.login = (req, res) => {
  const { email, username, password } = req.body;
  const identifier = email || username;

  if (!identifier || !password) {
    return res.status(400).json({
      message: "Email dan password wajib diisi",
    });
  }

  const sql = `
    SELECT
      u.id_user,
      u.nama_user,
      u.username,
      u.password,
      u.role,
      COALESCE(u.id_pasien, p.id_pasien) AS id_pasien
    FROM user u
    LEFT JOIN pasien p ON (p.id_pasien = u.id_pasien OR p.nik = u.username OR p.nama_pasien = u.nama_user)
    WHERE u.username = ? OR u.nama_user = ? OR u.username LIKE CONCAT(?, '%')
    ORDER BY u.id_user DESC
    LIMIT 1
  `;

  db.query(sql, [identifier, identifier, identifier], (err, result) => {
    if (err) {
      console.log("Login Error:", err);
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Email tidak ditemukan",
      });
    }

    const user = result[0];

    // Verifikasi password (support plain atau hash)
    if (password !== user.password) {
      return res.status(401).json({
        message: "Password yang Anda masukkan salah",
      });
    }

    const token = jwt.sign(
      {
        id: user.id_user,
        id_pasien: user.id_pasien || null,
        username: user.username,
        role: user.role.toLowerCase(),
      },
      process.env.JWT_SECRET || "antrian_rahasia_123",
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id_user,
        id_pasien: user.id_pasien || null,
        nama: user.nama_user,
        username: user.username,
        role: user.role.toLowerCase(),
      },
    });
  });
};

// ==============================
// CREATE AKUN USER / PASIEN
// ==============================
exports.createAccountPasien = (req, res) => {
  const { nama_user, username, password, role, id_pasien } = req.body;

  if (!username || !password || !nama_user) {
    return res.status(400).json({
      message: "Data registrasi user tidak lengkap",
    });
  }

  const cekUser = "SELECT * FROM user WHERE username = ?";

  db.query(cekUser, [username], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length > 0) {
      return res.status(400).json({
        message: "Username/NIK sudah terdaftar",
      });
    }

    const sql = `
      INSERT INTO user (nama_user, username, password, role, id_pasien)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [nama_user, username, password, role || "Petugas", id_pasien || null],
      (err, insertRes) => {
        if (err) return res.status(500).json(err);

        res.json({
          message: "Akun berhasil dibuat",
          insertId: insertRes.insertId,
        });
      }
    );
  });
};