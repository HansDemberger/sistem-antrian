const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_antrian_puskesmas",
});

// Tangkap event error agar Node.js / Nodemon tidak crash jika MySQL terputus atau offline
db.on("error", (err) => {
  console.error("⚠️ MySQL Error Event:", err.message || err);
});

db.connect((err) => {
  if (err) {
    console.error("❌ Gagal terhubung ke database MySQL:", err.message);
    console.error("👉 SOLUSI: Pastikan MySQL Service (XAMPP / Laragon) sudah dijalankan & database 'db_antrian_puskesmas' sudah dibuat.");
  } else {
    console.log("✅ MySQL Connected (Database: db_antrian_puskesmas)");
    // Pastikan kolom id_pasien ada di tabel user untuk link akun presisi
    db.query("ALTER TABLE user ADD COLUMN id_pasien INT DEFAULT NULL", (errAlter) => {
      // Abaikan jika kolom sudah ada
    });
    // Perluas kapasitas kolom no_hp agar tidak memicu error 'Data too long for column no_hp'
    db.query("ALTER TABLE pasien MODIFY COLUMN no_hp VARCHAR(30) DEFAULT NULL", (errAlterHp) => {
      // Abaikan jika kolom sudah berukuran 30
    });
  }
});

module.exports = db;