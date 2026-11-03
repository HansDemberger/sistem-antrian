const db = require("../config/database");

exports.getLaporan = (req, res) => {
  const {
    tanggal_awal,
    tanggal_akhir,
    tujuan_pelayanan,
    tujuan_kunjungan,
    kebutuhan_pelayanan,
    kategori_keluhan,
    keluhan,
    status,
  } = req.query;

  let sql = `
    SELECT
      a.id_antrian,
      a.nomor_antrian,
      a.tanggal,
      a.jenis_kunjungan,
      a.tujuan_kunjungan,
      a.tujuan_kunjungan AS tujuan_pelayanan,
      a.kategori_keluhan,
      a.kategori_keluhan AS keluhan,
      a.rujukan,
      a.janji_temu,
      COALESCE(a.prioritas, 4) AS prioritas,
      COALESCE(a.is_priority_active, 0) AS is_priority_active,
      a.status,
      a.created_at AS waktu_daftar,
      p.nik,
      COALESCE(p.nama_pasien, 'Pasien Registered') AS nama_pasien,
      COALESCE(p.nama_pasien, 'Pasien Registered') AS nama,
      COALESCE(kp.hasil_klasifikasi, 'Konsultasi') AS kebutuhan_pelayanan,
      COALESCE(kp.hasil_klasifikasi, 'Konsultasi') AS hasil_klasifikasi,
      COALESCE(kp.tingkat_keyakinan, 95.00) AS tingkat_keyakinan,
      COALESCE(pel.jenis_pelayanan_aktual, kp.hasil_klasifikasi, 'Konsultasi') AS jenis_pelayanan_aktual,
      pel.waktu_mulai,
      pel.waktu_selesai,
      pel.keterangan
    FROM antrian a
    LEFT JOIN pasien p ON a.id_pasien = p.id_pasien
    LEFT JOIN klasifikasi_pelayanan kp ON a.id_antrian = kp.id_antrian
    LEFT JOIN pelayanan pel ON a.id_antrian = pel.id_antrian
    WHERE 1=1
  `;

  const params = [];

  if (tanggal_awal && tanggal_akhir) {
    sql += ` AND a.tanggal BETWEEN ? AND ? `;
    params.push(tanggal_awal, tanggal_akhir);
  }

  const filterTujuan = tujuan_kunjungan || tujuan_pelayanan;
  if (filterTujuan && filterTujuan !== "Semua") {
    sql += ` AND a.tujuan_kunjungan = ? `;
    params.push(filterTujuan);
  }

  const filterKeb = kebutuhan_pelayanan || kategori_keluhan || keluhan;
  if (filterKeb && filterKeb !== "Semua") {
    sql += ` AND (COALESCE(kp.hasil_klasifikasi, '') LIKE ? OR a.kategori_keluhan LIKE ?) `;
    params.push(`%${filterKeb}%`, `%${filterKeb}%`);
  }

  if (status && status !== "Semua") {
    sql += ` AND a.status = ? `;
    params.push(status);
  }

  sql += ` ORDER BY a.id_antrian DESC `;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Laporan SQL Error:", err);
      return res.status(500).json({ message: err.message || "Database Query Error" });
    }
    res.json(result);
  });
};