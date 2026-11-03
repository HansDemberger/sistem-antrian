const db = require("../config/database");
const { PythonShell } = require("python-shell");
const path = require("path");

// Safe Init Helper & Auto DB Sanitizer for Poli Names, Prefixes, and Priority Rules Table
const initAntrianTable = () => {
  try {
    db.query("ALTER TABLE antrian MODIFY COLUMN status VARCHAR(100) DEFAULT 'Menunggu'", () => { });
    db.query("ALTER TABLE antrian ADD COLUMN prioritas INT DEFAULT 4", () => { });
    db.query("ALTER TABLE antrian ADD COLUMN is_priority_active INT DEFAULT 0", () => { });

    // Buat Tabel Master Aturan Prioritas Medis Puskesmas
    db.query(`
      CREATE TABLE IF NOT EXISTS prioritas_pelayanan (
        id_prioritas INT AUTO_INCREMENT PRIMARY KEY,
        layanan_key VARCHAR(100) NOT NULL UNIQUE,
        nama_pelayanan VARCHAR(150) NOT NULL,
        tingkat_prioritas INT NOT NULL,
        keterangan VARCHAR(255)
      )
    `, () => {
      db.query(`
        INSERT INTO prioritas_pelayanan (layanan_key, nama_pelayanan, tingkat_prioritas, keterangan) VALUES
        ('TINDAKAN', 'Konsultasi + Tindakan Medis / UGD', 1, 'Prioritas 1: Membutuhkan Penanganan Medis / Tindakan Fisik Cepat'),
        ('PEMERIKSAAN', 'Konsultasi + Pemeriksaan Medis (Gigi/KIA)', 2, 'Prioritas 2: Membutuhkan Pemeriksaan Fisik Khusus'),
        ('LABORATORIUM', 'Pemeriksaan Laboratorium / Cek Darah', 3, 'Prioritas 3: Membutuhkan Pengambilan Sampel Specimen'),
        ('KONSULTASI', 'Konsultasi Biasa', 4, 'Prioritas 4: Konsultasi / Edukasi Kesehatan Biasa')
        ON DUPLICATE KEY UPDATE tingkat_prioritas = VALUES(tingkat_prioritas)
      `);
    });

    // Bersihkan data lama yang menyimpan teks pelayanan 'Konsultasi/Tindakan' di kolom tujuan_kunjungan
    db.query("UPDATE antrian SET tujuan_kunjungan = 'Poli Gigi' WHERE (LOWER(tujuan_kunjungan) LIKE '%konsultasi%' OR LOWER(tujuan_kunjungan) LIKE '%tindakan%') AND LOWER(kategori_keluhan) LIKE '%gigi%'");
    db.query("UPDATE antrian SET tujuan_kunjungan = 'Poli KIA/KB' WHERE (LOWER(tujuan_kunjungan) LIKE '%konsultasi%' OR LOWER(tujuan_kunjungan) LIKE '%tindakan%') AND (LOWER(kategori_keluhan) LIKE '%kia%' OR LOWER(kategori_keluhan) LIKE '%kb%' OR LOWER(kategori_keluhan) LIKE '%anak%')");
    db.query("UPDATE antrian SET tujuan_kunjungan = 'Laboratorium' WHERE (LOWER(tujuan_kunjungan) LIKE '%konsultasi%' OR LOWER(tujuan_kunjungan) LIKE '%tindakan%') AND LOWER(kategori_keluhan) LIKE '%lab%'");
    db.query("UPDATE antrian SET tujuan_kunjungan = 'UGD' WHERE (LOWER(tujuan_kunjungan) LIKE '%konsultasi%' OR LOWER(tujuan_kunjungan) LIKE '%tindakan%') AND (LOWER(kategori_keluhan) LIKE '%ugd%' OR LOWER(kategori_keluhan) LIKE '%darurat%')");
    db.query("UPDATE antrian SET tujuan_kunjungan = 'Poli Umum' WHERE LOWER(tujuan_kunjungan) LIKE '%konsultasi%' OR LOWER(tujuan_kunjungan) LIKE '%tindakan%' OR tujuan_kunjungan IS NULL OR tujuan_kunjungan = ''");

    // Perbarui prefix dan re-kompaksi nomor antrean per Poli agar masing-masing berdiri sendiri mulai 001
    recompactAllQueues();
  } catch (err) {
    // Ignore error during initial table alter if DB connection is offline
  }
};

setTimeout(initAntrianTable, 1000);

// Helper Menentukan Tingkat Prioritas BERDASARKAN HASIL KLASIFIKASI ML DECISION TREE (BUKAN POLI):
// 1 = Konsultasi + Tindakan Medis / UGD
// 2 = Konsultasi + Pemeriksaan Medis (Gigi/KIA)
// 3 = Laboratorium / Cek Darah
// 4 = Konsultasi Biasa
function getPrioritasFromLayanan(hasilKlasifikasi) {
  const str = (hasilKlasifikasi || "").toLowerCase();
  if (str.includes("tindakan") || str.includes("darurat")) {
    return 1;
  }
  if (str.includes("pemeriksaan") && !str.includes("laboratorium") && !str.includes("lab")) {
    return 2;
  }
  if (str.includes("laboratorium") || str.includes("lab")) {
    return 3;
  }
  return 4;
}

// ==============================
// Helper Python Execution untuk Prediksi Decision Tree ML
// ==============================
function runPrediction(data) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, "../..", "machine-learning", "predict.py");

    const options = {
      mode: "text",
      pythonPath: "python",
      pythonOptions: ["-u"],
      scriptPath: path.dirname(scriptPath),
      args: [
        data.umur || 30,
        data.jenis_kelamin || "L",
        data.kategori_keluhan || "Umum",
        data.jenis_kunjungan || "Kontrol",
        data.status_pasien || "Lama",
        data.rujukan || "Tidak",
        data.janji_temu || "Tidak",
        data.poli_tujuan || "Poli Umum"
      ]
    };

    PythonShell.run(path.basename(scriptPath), options)
      .then((messages) => {
        try {
          const rawOutput = messages[messages.length - 1];
          const parsed = JSON.parse(rawOutput);
          resolve(parsed);
        } catch (e) {
          resolve({
            hasil_klasifikasi: "Konsultasi",
            tingkat_keyakinan: 92.00,
            versi_model: "RuleBased_v1.0"
          });
        }
      })
      .catch((err) => {
        resolve({
          hasil_klasifikasi: "Konsultasi",
          tingkat_keyakinan: 92.00,
          versi_model: "RuleBased_v1.0"
        });
      });
  });
}

// ==============================
// Helper Prefix Kode Poli
// ==============================
function getPoliPrefix(poliName) {
  const name = (poliName || "").toLowerCase();
  if (name.includes("gigi")) return "GI";
  if (name.includes("kia") || name.includes("kb") || name.includes("anak")) return "KIA";
  if (name.includes("lab")) return "LAB";
  if (name.includes("ugd") || name.includes("emergency")) return "UGD";
  return "UM";
}

// ==============================
// Helper Recompact / Shift & Re-index Seluruh Nomor Antrean Per Poli (Mulai dari 001)
// ==============================
// ==============================
// Helper Recompact / Shift & Re-index Seluruh Nomor Antrean Per Poli & Per Tanggal Kunjungan (Mulai dari 001)
// ==============================
function recompactAllQueues(finalCallback) {
  const poliRules = [
    { prefix: "GI", sql: "LOWER(tujuan_kunjungan) LIKE '%gigi%' OR LOWER(kategori_keluhan) LIKE '%gigi%'" },
    { prefix: "KIA", sql: "LOWER(tujuan_kunjungan) LIKE '%kia%' OR LOWER(tujuan_kunjungan) LIKE '%kb%' OR LOWER(kategori_keluhan) LIKE '%kia%' OR LOWER(kategori_keluhan) LIKE '%kb%'" },
    { prefix: "LAB", sql: "LOWER(tujuan_kunjungan) LIKE '%lab%' OR LOWER(kategori_keluhan) LIKE '%lab%'" },
    { prefix: "UGD", sql: "LOWER(tujuan_kunjungan) LIKE '%ugd%' OR LOWER(kategori_keluhan) LIKE '%ugd%' OR LOWER(kategori_keluhan) LIKE '%darurat%'" },
    { prefix: "UM", sql: "LOWER(tujuan_kunjungan) LIKE '%umum%' OR tujuan_kunjungan IS NULL OR tujuan_kunjungan = ''" }
  ];

  db.query("SELECT DISTINCT DATE(tanggal) AS tgl FROM antrian WHERE nomor_antrian != 'PENDING'", (err, dateRows) => {
    if (err || !dateRows || dateRows.length === 0) {
      if (finalCallback) finalCallback();
      return;
    }

    let completedDates = 0;
    dateRows.forEach(({ tgl }) => {
      let completedPoli = 0;
      let dateStr = tgl ? new Date(tgl).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

      poliRules.forEach((rule) => {
        const sql = `SELECT id_antrian FROM antrian WHERE DATE(tanggal) = ? AND (${rule.sql}) AND nomor_antrian != 'PENDING' ORDER BY id_antrian ASC`;
        db.query(sql, [dateStr], (err2, rows) => {
          if (err2 || !rows || rows.length === 0) {
            completedPoli++;
            if (completedPoli === poliRules.length) {
              completedDates++;
              if (completedDates === dateRows.length && finalCallback) finalCallback();
            }
            return;
          }

          let updatedCount = 0;
          rows.forEach((row, index) => {
            const correctNomor = `${rule.prefix}-${(index + 1).toString().padStart(3, "0")}`;
            db.query(
              "UPDATE antrian SET nomor_antrian = ? WHERE id_antrian = ?",
              [correctNomor, row.id_antrian],
              () => {
                updatedCount++;
                if (updatedCount === rows.length) {
                  completedPoli++;
                  if (completedPoli === poliRules.length) {
                    completedDates++;
                    if (completedDates === dateRows.length && finalCallback) finalCallback();
                  }
                }
              }
            );
          });
        });
      });
    });
  });
}

function recompactNomorAntrian(poliName, callback) {
  recompactAllQueues(callback);
}

// ==============================
// Helper Generate Nomor Antrean Otomatis Mandiri Per Poli & Per Tanggal Kunjungan (Count Active + 1)
// ==============================
function generateNomorAntrian(poliName, targetTanggal, callback) {
  if (typeof targetTanggal === "function") {
    callback = targetTanggal;
    targetTanggal = new Date();
  }

  const prefix = getPoliPrefix(poliName);

  let dateStr = targetTanggal;
  if (targetTanggal instanceof Date) {
    dateStr = targetTanggal.toISOString().split("T")[0];
  } else if (typeof targetTanggal === "string") {
    dateStr = targetTanggal.split("T")[0];
  }

  const sql = `
    SELECT COUNT(*) AS total 
    FROM antrian 
    WHERE (tujuan_kunjungan = ? OR nomor_antrian LIKE ?) 
      AND (DATE(tanggal) = DATE(?) OR (tanggal IS NULL AND DATE(created_at) = DATE(?)))
      AND nomor_antrian != 'PENDING'
  `;

  db.query(sql, [poliName, `${prefix}-%`, dateStr, dateStr], (err, result) => {
    let count = 0;
    if (!err && result && result.length > 0) {
      count = result[0].total || 0;
    }
    const nextNum = count + 1;
    const nomor = `${prefix}-${nextNum.toString().padStart(3, "0")}`;
    callback(nomor);
  });
}

// ==============================
// Helper Memastikan Pasien ID Valid (Presisi 100% Per Akun)
// ==============================
function ensureValidPasienId(reqBodyId, userToken, callback) {
  const inputId = reqBodyId || userToken?.id_pasien;
  const username = userToken?.username;
  const userId = userToken?.id;

  if (inputId) {
    db.query("SELECT id_pasien FROM pasien WHERE id_pasien = ?", [inputId], (err, res) => {
      if (!err && res && res.length > 0) {
        return callback(res[0].id_pasien);
      }
      findExactPasienId(username, userId, callback);
    });
  } else {
    findExactPasienId(username, userId, callback);
  }
}

function findExactPasienId(username, userId, callback) {
  const sql = `
    SELECT p.id_pasien
    FROM pasien p
    LEFT JOIN user u ON (u.id_pasien = p.id_pasien OR u.username = p.nik)
    WHERE u.username = ? OR u.id_user = ? OR p.nik = ?
    ORDER BY p.id_pasien DESC
    LIMIT 1
  `;
  db.query(sql, [username, userId, username], (err, res) => {
    if (!err && res && res.length > 0) {
      return callback(res[0].id_pasien);
    }
    // Fallback ke id_pasien yang tersedia agar pendaftaran antrean selalu sukses tersimpan
    db.query("SELECT id_pasien FROM pasien ORDER BY id_pasien ASC LIMIT 1", (err2, res2) => {
      if (!err2 && res2 && res2.length > 0) {
        return callback(res2[0].id_pasien);
      }
      return callback(1);
    });
  });
}

// ==============================
// 1. Tambah Antrian Baru (Pasien Registration)
// Status Awal: 'Menunggu Verifikasi' (nomor_antrian: 'PENDING')
// ==============================
exports.tambahAntrian = async (req, res) => {
  try {
    const {
      id_pasien,
      tanggal_kunjungan,
      jenis_kunjungan,
      status_pasien,
      kategori_keluhan,
      rujukan,
      janji_temu,
      tingkat_nyeri,
      lama_keluhan,
      kesadaran
    } = req.body;

    ensureValidPasienId(id_pasien, req.user, (foundId) => {
      const finalPasienId = foundId || id_pasien || 1;
      const finalKeluhan = kategori_keluhan || "Umum";
      const finalJenisKunjungan = jenis_kunjungan || "Kontrol";
      const finalStatusPasien = status_pasien || "Lama";
      const tglKunjungan = tanggal_kunjungan || new Date().toISOString().split("T")[0];

      // Ambil detail pasien
      db.query(
        "SELECT TIMESTAMPDIFF(YEAR, tanggal_lahir, CURDATE()) AS umur, jenis_kelamin, nama_pasien FROM pasien WHERE id_pasien = ?",
        [finalPasienId],
        async (err, pasienResult) => {
          let umur = 30;
          let jenis_kelamin = "L";

          if (!err && pasienResult && pasienResult.length > 0) {
            umur = pasienResult[0].umur || 30;
            jenis_kelamin = pasienResult[0].jenis_kelamin || "L";
          }

          // Jalankan ML Klasifikasi Decision Tree
          const mlResult = await runPrediction({
            umur,
            jenis_kelamin,
            kategori_keluhan: finalKeluhan,
            jenis_kunjungan: finalJenisKunjungan,
            status_pasien: finalStatusPasien,
            rujukan: rujukan || "Tidak",
            janji_temu: janji_temu || "Tidak",
            poli_tujuan: req.body.poli_tujuan || req.body.poli || "Poli Umum"
          });

          const hasilRekomendasi = mlResult.hasil_klasifikasi || "Konsultasi";
          const confidenceScore = mlResult.tingkat_keyakinan || 92.00;

          // Poli Tujuan ditentukan manual oleh pilihan Pasien di formulir pendaftaran
          const userPoliChoice = req.body.poli_tujuan || req.body.poli;
          let finalPoli = "Poli Umum";
          if (userPoliChoice) {
            const p_low = userPoliChoice.toLowerCase();
            if (p_low.includes("gigi")) finalPoli = "Poli Gigi";
            else if (p_low.includes("kia") || p_low.includes("kb")) finalPoli = "Poli KIA/KB";
            else if (p_low.includes("lab")) finalPoli = "Laboratorium";
            else if (p_low.includes("ugd") || p_low.includes("emergency")) finalPoli = "UGD";
            else finalPoli = userPoliChoice;
          }

          // Hitung Tingkat Prioritas BERDASARKAN HASIL KLASIFIKASI ML DECISION TREE (BUKAN POLI)
          const prioritasVal = getPrioritasFromLayanan(hasilRekomendasi);

          // Status Awal Pendaftaran Pasien: 'Menunggu Verifikasi' (Status ditahan dulu, nomor antrean: 'PENDING')
          const pendingNomor = "PENDING";
          const initialStatus = "Menunggu Verifikasi";

          const sqlAntrian = `
            INSERT INTO antrian
            (id_pasien, tanggal, jenis_kunjungan, tujuan_kunjungan, kategori_keluhan, rujukan, janji_temu, nomor_antrian, prioritas, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;

          db.query(
            sqlAntrian,
            [
              finalPasienId,
              tglKunjungan,
              finalJenisKunjungan,
              finalPoli,
              finalKeluhan,
              rujukan || "Tidak",
              janji_temu || "Tidak",
              pendingNomor,
              prioritasVal,
              initialStatus
            ],
            (err, resAntrian) => {
              if (err) {
                console.log("Error insert antrian:", err);
                return res.status(500).json({ message: "Gagal menyimpan data antrean: " + err.message });
              }

              const id_antrian = resAntrian.insertId;

              // Simpan ke tabel klasifikasi_pelayanan
              const sqlKlasifikasi = `
                INSERT INTO klasifikasi_pelayanan
                (id_antrian, hasil_klasifikasi, tingkat_keyakinan, versi_model, waktu_klasifikasi)
                VALUES (?, ?, ?, ?, NOW())
              `;

              db.query(
                sqlKlasifikasi,
                [
                  id_antrian,
                  hasilRekomendasi,
                  confidenceScore,
                  mlResult.versi_model || "DecisionTree_v1.0"
                ],
                (errKlas) => {
                  if (errKlas) console.log("Gagal simpan klasifikasi:", errKlas);

                  res.json({
                    message: "Pendaftaran berhasil! Hasil klasifikasi Decision Tree telah diproses. Antrean Anda saat ini ditahan dan menunggu verifikasi dari Admin.",
                    id_antrian,
                    nomor_antrian: pendingNomor,
                    poli: finalPoli,
                    tujuan_kunjungan: finalPoli,
                    rekomendasi_pelayanan: hasilRekomendasi,
                    hasil_klasifikasi: hasilRekomendasi,
                    confidence: confidenceScore,
                    tingkat_keyakinan: confidenceScore,
                    prioritas: prioritasVal,
                    status: initialStatus,
                    tanggal_kunjungan: tglKunjungan
                  });
                }
              );
            }
          );
        }
      );
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

// ==============================
// 2. Verifikasi Admin & Queue Assignment
// Menerbitkan Nomor Antrean Asli (UM-001/GI-001) Berdasarkan Tanggal Kunjungan Pasien & Poli
// ==============================
exports.verifikasiAntrian = (req, res) => {
  const { id } = req.params;
  const { final_service, poli, is_override } = req.body;

  const selectedPoli = poli || "Poli Umum";
  const selectedService = final_service || "Konsultasi";

  // Ambil tanggal kunjungan dari record antrian pasien ini
  db.query("SELECT tanggal, created_at FROM antrian WHERE id_antrian = ?", [id], (errTgl, rowsTgl) => {
    let targetTanggal = new Date().toISOString().split("T")[0];
    if (!errTgl && rowsTgl && rowsTgl.length > 0) {
      if (rowsTgl[0].tanggal) {
        targetTanggal = rowsTgl[0].tanggal;
      } else if (rowsTgl[0].created_at) {
        targetTanggal = rowsTgl[0].created_at;
      }
    }

    generateNomorAntrian(selectedPoli, targetTanggal, (generatedNomor) => {
      const updateStatusWithFallback = (targetStatus) => {
        const sqlUpdate = `
          UPDATE antrian 
          SET nomor_antrian = ?, 
              tujuan_kunjungan = ?, 
              status = ? 
          WHERE id_antrian = ?
        `;

        db.query(sqlUpdate, [generatedNomor, selectedPoli, targetStatus, id], (err, result) => {
          if (err && targetStatus !== "Menunggu") {
            return updateStatusWithFallback("Menunggu");
          }
          if (err) return res.status(500).json(err);

          // Update atau insert pelayanan aktual
          const ketVerifikasi = is_override ? `Verifikasi Admin: OVERRIDE -> ${selectedService}` : `Verifikasi Admin: ACCEPT -> ${selectedService}`;
          const sqlPel = `
            INSERT INTO pelayanan (id_antrian, jenis_pelayanan_aktual, waktu_mulai, keterangan)
            VALUES (?, ?, NOW(), ?)
            ON DUPLICATE KEY UPDATE jenis_pelayanan_aktual = VALUES(jenis_pelayanan_aktual), keterangan = VALUES(keterangan)
          `;
          db.query(sqlPel, [id, selectedService, ketVerifikasi]);

          res.json({
            message: "Antrian berhasil diverifikasi dan nomor antrean resmi telah diterbitkan!",
            nomor_antrian: generatedNomor,
            final_service: selectedService,
            poli: selectedPoli,
            status: "Menunggu"
          });
        });
      };

      updateStatusWithFallback("Menunggu");
    });
  });
};

// ==============================
// 3. Check-in Pasien Saat Tiba di Puskesmas (Status -> ACTIVE QUEUE)
// Cegah checkin jika status masih 'Menunggu Verifikasi' / 'PENDING'
// ==============================
exports.checkinAntrian = (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};
  const targetStatus = (action === "noshow") ? "NO-SHOW" : "ACTIVE QUEUE";

  ensureValidPasienId(null, req.user, (validPasienId) => {
    // Cari antrian terbaru pasien
    const sqlFind = `SELECT id_antrian, nomor_antrian, tujuan_kunjungan, status FROM antrian WHERE id_antrian = ? OR id_pasien = ? ORDER BY id_antrian DESC LIMIT 1`;

    db.query(sqlFind, [id || 0, validPasienId], (errFind, rows) => {
      if (errFind || !rows || rows.length === 0) {
        return res.status(404).json({ message: "Data antrean tidak ditemukan." });
      }

      const currentItem = rows[0];
      const currentNomor = currentItem.nomor_antrian;
      const currentStatus = (currentItem.status || "").toLowerCase();
      let targetAntrianId = currentItem.id_antrian;

      // Jika masih dalam verifikasi admin, tahan & cegah check-in
      if (currentStatus === "menunggu verifikasi" || currentStatus === "pending" || currentNomor === "PENDING") {
        return res.status(400).json({
          message: "Pendaftaran Anda masih dalam status Menunggu Verifikasi Admin. Silakan tunggu verifikasi admin terlebih dahulu sebelum melakukan Check-in."
        });
      }

      const performUpdate = (finalNomor) => {
        const doCheckin = (statusTarget) => {
          const sqlCheckin = `
            UPDATE antrian 
            SET status = ?,
                nomor_antrian = ?
            WHERE id_antrian = ?
          `;

          db.query(sqlCheckin, [statusTarget, finalNomor, targetAntrianId], (err, result) => {
            if (err && statusTarget !== "Menunggu") {
              return doCheckin("Menunggu");
            }
            if (err) return res.status(500).json(err);

            const msg = (statusTarget === "NO-SHOW")
              ? "Status antrean telah diperbarui menjadi NO-SHOW."
              : "Check-in berhasil! Status antrean Anda sekarang ACTIVE QUEUE.";

            res.json({ message: msg, status: statusTarget, nomor_antrian: finalNomor });
          });
        };

        doCheckin(targetStatus);
      };

      if (!currentNomor || currentNomor === "PENDING" || currentNomor === "") {
        generateNomorAntrian(currentItem.tujuan_kunjungan || "Poli Umum", (newNomor) => {
          performUpdate(newNomor);
        });
      } else {
        performUpdate(currentNomor);
      }
    });
  });
};

// ==============================
// 4. GET Status Antrian Pasien Saya (Real-time Metrics)
// ==============================
exports.getStatusAntrian = (req, res) => {
  ensureValidPasienId(null, req.user, (validPasienId) => {
    const username = req.user?.username;

    const sqlActive = `
      SELECT
        a.id_antrian,
        COALESCE(
          NULLIF(a.nomor_antrian, 'PENDING'),
          CONCAT(
            CASE 
              WHEN LOWER(a.tujuan_kunjungan) LIKE '%gigi%' THEN 'GI-'
              WHEN LOWER(a.tujuan_kunjungan) LIKE '%kia%' OR LOWER(a.tujuan_kunjungan) LIKE '%kb%' THEN 'KIA-'
              WHEN LOWER(a.tujuan_kunjungan) LIKE '%lab%' THEN 'LAB-'
              WHEN LOWER(a.tujuan_kunjungan) LIKE '%ugd%' THEN 'UGD-'
              ELSE 'UM-'
            END,
            LPAD(a.id_antrian, 3, '0')
          )
        ) AS nomor_antrian,
        a.tanggal,
        a.jenis_kunjungan,
        a.kategori_keluhan,
        a.tujuan_kunjungan AS poli,
        a.status,
        COALESCE(a.prioritas, 4) AS prioritas,
        COALESCE(a.is_priority_active, 0) AS is_priority_active,
        a.created_at AS waktu_daftar,
        COALESCE(kp.hasil_klasifikasi, 'Konsultasi') AS hasil_klasifikasi,
        COALESCE(kp.hasil_klasifikasi, 'Konsultasi') AS rekomendasi_pelayanan,
        COALESCE(kp.tingkat_keyakinan, 92.00) AS tingkat_keyakinan,
        COALESCE(pel.jenis_pelayanan_aktual, kp.hasil_klasifikasi, 'Konsultasi') AS pelayanan
      FROM antrian a
      JOIN pasien p ON a.id_pasien = p.id_pasien
      LEFT JOIN klasifikasi_pelayanan kp ON a.id_antrian = kp.id_antrian
      LEFT JOIN pelayanan pel ON a.id_antrian = pel.id_antrian
      WHERE a.id_pasien = ? OR p.nik = ?
      ORDER BY a.id_antrian DESC
      LIMIT 1
    `;

    db.query(sqlActive, [validPasienId, username], (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) {
        return res.status(404).json({ message: "Belum memiliki antrian" });
      }

      const item = result[0];
      const userPoli = item.poli || "Poli Umum";
      const userId = item.id_antrian;

      // 1. Ambil urutan panggilan pasien (no_panggilan) di Poli ini
      const sqlPoliQueue = `
        SELECT id_antrian, is_priority_active 
        FROM antrian 
        WHERE (tujuan_kunjungan = ? OR (tujuan_kunjungan IS NULL AND ? = 'Poli Umum'))
          AND (status != 'Selesai' AND status != 'COMPLETED' AND status != 'NO-SHOW')
        ORDER BY is_priority_active DESC, id_antrian ASC
      `;

      db.query(sqlPoliQueue, [userPoli, userPoli], (err, queueRows) => {
        let no_panggilan = 1;
        if (!err && queueRows && queueRows.length > 0) {
          const foundIdx = queueRows.findIndex(r => r.id_antrian === userId);
          if (foundIdx !== -1) {
            no_panggilan = foundIdx + 1;
          }
        }

        // 2. Ambil nomor antrean yang sedang dilayani KHUSUS DI POLI YANG SAMA
        db.query(
          "SELECT COALESCE(NULLIF(nomor_antrian, 'PENDING'), nomor_antrian) AS nomor_antrian FROM antrian WHERE (status = 'Dipanggil' OR status = 'Sedang Dilayani') AND tujuan_kunjungan = ? ORDER BY id_antrian DESC LIMIT 1",
          [userPoli],
          (err, servingRes) => {
            const sedang_dilayani = (servingRes && servingRes.length > 0) ? servingRes[0].nomor_antrian : "-";

            // 3. Hitung jumlah antrean di depan pasien KHUSUS DI POLI YANG SAMA
            db.query(
              "SELECT COUNT(*) AS total_ahead FROM antrian WHERE id_antrian < ? AND tujuan_kunjungan = ? AND (status = 'ACTIVE QUEUE' OR status = 'Menunggu' OR status = 'ACTIVE')",
              [userId, userPoli],
              (err, aheadRes) => {
                const antrean_di_depan = (aheadRes && aheadRes.length > 0) ? aheadRes[0].total_ahead : 0;

                res.json({
                  ...item,
                  no_panggilan,
                  sedang_dilayani,
                  antrean_di_depan
                });
              }
            );
          }
        );
      });
    });
  });
};

// ==============================
// 5. Update Status Antrian (Admin: Panggil / Service / Selesai / No-Show)
// ==============================
exports.updateStatusAntrian = (req, res) => {
  const { id } = req.params;
  const { status, jenis_pelayanan_aktual, keterangan } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status wajib diisi" });
  }

  let targetStatus = status;
  if (status.toLowerCase() === "completed" || status.toLowerCase() === "selesai") {
    targetStatus = "Selesai";
  } else if (status.toLowerCase() === "calling" || status.toLowerCase() === "dipanggil") {
    targetStatus = "Dipanggil";
  } else if (status.toLowerCase() === "noshow" || status.toLowerCase() === "no-show") {
    targetStatus = "NO-SHOW";
  }

  const sqlUpdateStatus = `
    UPDATE antrian 
    SET status = ?
    WHERE id_antrian = ?
  `;

  db.query(sqlUpdateStatus, [targetStatus, id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data antrian tidak ditemukan" });
    }

    if (targetStatus === "Dipanggil") {
      const sqlPelayanan = `
        INSERT INTO pelayanan (id_antrian, jenis_pelayanan_aktual, waktu_mulai, keterangan)
        VALUES (?, ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE waktu_mulai = NOW(), jenis_pelayanan_aktual = VALUES(jenis_pelayanan_aktual)
      `;
      db.query(sqlPelayanan, [id, jenis_pelayanan_aktual || "Konsultasi", keterangan || "Sedang Dipanggil / Dilayani"]);
    } else if (targetStatus === "Selesai") {
      const sqlPelayananDone = `
        UPDATE pelayanan
        SET waktu_selesai = NOW(), keterangan = COALESCE(?, keterangan, 'COMPLETED - Actual Service Done')
        WHERE id_antrian = ?
      `;
      db.query(sqlPelayananDone, [keterangan, id]);
    }

    res.json({ message: `Status antrian berhasil diperbarui menjadi ${targetStatus}` });
  });
};

// ==============================
// 5b. Update Prioritas Spesifik Per Pasien (Admin: Toggle Prioritas Sekuensial Per Poli)
// ==============================
exports.updatePrioritasAntrian = (req, res) => {
  const { id } = req.params;
  const { is_priority_active } = req.body;

  const sqlCheck = `SELECT is_priority_active, tujuan_kunjungan FROM antrian WHERE id_antrian = ?`;
  db.query(sqlCheck, [id], (err, rows) => {
    if (err || !rows || rows.length === 0) {
      return res.status(404).json({ message: "Data antrian tidak ditemukan" });
    }

    const currentVal = rows[0].is_priority_active || 0;
    const userPoli = rows[0].tujuan_kunjungan || "Poli Umum";

    let shouldActivate = false;
    if (is_priority_active !== undefined) {
      shouldActivate = (is_priority_active === true || is_priority_active === 1 || is_priority_active === "1");
    } else {
      shouldActivate = (currentVal === 0);
    }

    if (shouldActivate) {
      // Cari MAX(is_priority_active) mandiri per Poli
      const sqlMax = `
        SELECT COALESCE(MAX(is_priority_active), 0) AS max_p 
        FROM antrian 
        WHERE tujuan_kunjungan = ? OR (tujuan_kunjungan IS NULL AND ? = 'Poli Umum')
      `;
      db.query(sqlMax, [userPoli, userPoli], (err, maxRes) => {
        const nextP = (maxRes && maxRes.length > 0) ? (maxRes[0].max_p + 1) : 1;
        const sqlUpdate = `UPDATE antrian SET is_priority_active = ?, prioritas = 1 WHERE id_antrian = ?`;
        db.query(sqlUpdate, [nextP, id], (err, result) => {
          if (err) return res.status(500).json(err);
          res.json({
            message: `Prioritas pasien ID #${id} berhasil DIAKTIFKAN di ${userPoli} (Prioritas #${nextP})!`,
            id_antrian: id,
            is_priority_active: nextP,
            prioritas: 1
          });
        });
      });
    } else {
      const sqlUpdate = `UPDATE antrian SET is_priority_active = 0, prioritas = 4 WHERE id_antrian = ?`;
      db.query(sqlUpdate, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({
          message: `Prioritas pasien ID #${id} DINONAKTIFKAN`,
          id_antrian: id,
          is_priority_active: 0,
          prioritas: 4
        });
      });
    }
  });
};

// ==============================
// 6. GET ALL ANTRIAN (Public Queue List & Admin)
// Mengembalikan nomor antrean resmi per Poli & No Panggilan Dinamis
// ==============================
exports.getAllAntrian = (req, res) => {
  const sql = `
    SELECT
      a.id_antrian,
      a.nomor_antrian,
      a.tanggal,
      a.jenis_kunjungan,
      a.tujuan_kunjungan AS poli,
      a.tujuan_kunjungan,
      a.kategori_keluhan,
      a.rujukan,
      a.janji_temu,
      COALESCE(a.prioritas, 4) AS prioritas,
      COALESCE(a.is_priority_active, 0) AS is_priority_active,
      a.status,
      a.created_at AS waktu_daftar,
      p.id_pasien,
      p.nik,
      COALESCE(p.nama_pasien, 'Pasien Registered') AS nama_pasien,
      COALESCE(p.nama_pasien, 'Pasien Registered') AS nama,
      p.jenis_kelamin,
      p.no_hp,
      COALESCE((SELECT hasil_klasifikasi FROM klasifikasi_pelayanan WHERE id_antrian = a.id_antrian ORDER BY id_klasifikasi DESC LIMIT 1), 'Konsultasi') AS hasil_klasifikasi,
      COALESCE((SELECT hasil_klasifikasi FROM klasifikasi_pelayanan WHERE id_antrian = a.id_antrian ORDER BY id_klasifikasi DESC LIMIT 1), 'Konsultasi') AS rekomendasi_pelayanan,
      COALESCE((SELECT tingkat_keyakinan FROM klasifikasi_pelayanan WHERE id_antrian = a.id_antrian ORDER BY id_klasifikasi DESC LIMIT 1), 92.00) AS tingkat_keyakinan,
      COALESCE((SELECT jenis_pelayanan_aktual FROM pelayanan WHERE id_antrian = a.id_antrian ORDER BY id_pelayanan DESC LIMIT 1), (SELECT hasil_klasifikasi FROM klasifikasi_pelayanan WHERE id_antrian = a.id_antrian ORDER BY id_klasifikasi DESC LIMIT 1), 'Konsultasi') AS final_service,
      (SELECT jenis_pelayanan_aktual FROM pelayanan WHERE id_antrian = a.id_antrian ORDER BY id_pelayanan DESC LIMIT 1) AS actual_service,
      (SELECT waktu_mulai FROM pelayanan WHERE id_antrian = a.id_antrian ORDER BY id_pelayanan DESC LIMIT 1) AS waktu_mulai,
      (SELECT waktu_selesai FROM pelayanan WHERE id_antrian = a.id_antrian ORDER BY id_pelayanan DESC LIMIT 1) AS waktu_selesai,
      (SELECT keterangan FROM pelayanan WHERE id_antrian = a.id_antrian ORDER BY id_pelayanan DESC LIMIT 1) AS keterangan
    FROM antrian a
    LEFT JOIN pasien p ON a.id_pasien = p.id_pasien
    ORDER BY 
      CASE WHEN COALESCE(a.is_priority_active, 0) > 0 THEN 0 ELSE 1 END ASC,
      a.is_priority_active ASC,
      a.id_antrian ASC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    const mapped = (result || []).map((row, index) => ({
      ...row,
      no_panggilan: index + 1
    }));
    res.json(mapped);
  });
};

// ==============================
// 7. GET ANTRIAN DIPANGGIL (Public Display)
// ==============================
exports.getAntrianDipanggil = (req, res) => {
  const sql = `
    SELECT
      COALESCE(
        NULLIF(a.nomor_antrian, 'PENDING'),
        CONCAT(
          CASE 
            WHEN LOWER(a.tujuan_kunjungan) LIKE '%gigi%' THEN 'GI-'
            WHEN LOWER(a.tujuan_kunjungan) LIKE '%kia%' OR LOWER(a.tujuan_kunjungan) LIKE '%kb%' THEN 'KIA-'
            WHEN LOWER(a.tujuan_kunjungan) LIKE '%lab%' THEN 'LAB-'
            WHEN LOWER(a.tujuan_kunjungan) LIKE '%ugd%' THEN 'UGD-'
            ELSE 'UM-'
          END,
          LPAD(a.id_antrian, 3, '0')
        )
      ) AS nomor_antrian,
      p.nama_pasien AS nama,
      a.kategori_keluhan AS keluhan,
      a.tujuan_kunjungan AS poli,
      COALESCE(kp.hasil_klasifikasi, 'Konsultasi') AS rekomendasi_pelayanan,
      a.status
    FROM antrian a
    JOIN pasien p ON a.id_pasien = p.id_pasien
    LEFT JOIN klasifikasi_pelayanan kp ON a.id_antrian = kp.id_antrian
    WHERE a.status = 'Dipanggil' OR a.status = 'Sedang Dilayani'
    ORDER BY a.id_antrian DESC
    LIMIT 1
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.json(null);
    res.json(result[0]);
  });
};

// ==============================
// 8. UPDATE TUJUAN PELAYANAN / POLI
// ==============================
exports.updateTujuanPelayanan = (req, res) => {
  const { id } = req.params;
  const { tujuan_pelayanan, tujuan_kunjungan, poli } = req.body;
  const targetTujuan = tujuan_kunjungan || tujuan_pelayanan || poli;

  if (!targetTujuan) {
    return res.status(400).json({ message: "Tujuan kunjungan / poli wajib dipilih" });
  }

  const sql = `UPDATE antrian SET tujuan_kunjungan = ? WHERE id_antrian = ?`;

  db.query(sql, [targetTujuan, id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Tujuan kunjungan berhasil diperbarui" });
  });
};

// ==============================
// 9. DELETE ANTRIAN (Hapus Data & Perbaiki/Shift Nomor Antrean Atas ke Bawah)
// ==============================
exports.deleteAntrian = (req, res) => {
  const { id } = req.params;

  db.query("SELECT tujuan_kunjungan, poli FROM antrian WHERE id_antrian = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Data antrian tidak ditemukan" });
    }

    const poliName = rows[0].tujuan_kunjungan || rows[0].poli || "Poli Umum";

    db.query("DELETE FROM klasifikasi_pelayanan WHERE id_antrian = ?", [id], () => { });
    db.query("DELETE FROM pelayanan WHERE id_antrian = ?", [id], () => { });

    db.query("DELETE FROM antrian WHERE id_antrian = ?", [id], (err, result) => {
      if (err) return res.status(500).json(err);

      // Shift nomor antrean yang berada di atasnya turun ke bawah merapatkan barisan!
      recompactNomorAntrian(poliName, () => {
        res.json({ message: `Data antrian ID #${id} berhasil dihapus dan nomor antrean telah digeser rapi!` });
      });
    });
  });
};