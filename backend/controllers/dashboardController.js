const db = require("../config/database");

exports.getAntrianTerbaru = (req, res) => {
  const sql = `
    SELECT
      a.nomor_antrian,
      p.nama_pasien AS nama,
      a.tujuan_kunjungan,
      COALESCE(kp.hasil_klasifikasi, a.tujuan_kunjungan) AS kebutuhan_pelayanan,
      COALESCE(kp.hasil_klasifikasi, a.tujuan_kunjungan) AS hasil_klasifikasi,
      a.status,
      a.created_at AS waktu_daftar
    FROM antrian a
    JOIN pasien p ON a.id_pasien = p.id_pasien
    LEFT JOIN klasifikasi_pelayanan kp ON a.id_antrian = kp.id_antrian
    ORDER BY a.id_antrian DESC
    LIMIT 5
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.getPasienDipanggil = (req, res) => {
  const sql = `
    SELECT
      a.nomor_antrian,
      p.nama_pasien AS nama,
      a.tujuan_kunjungan,
      COALESCE(kp.hasil_klasifikasi, a.tujuan_kunjungan) AS kebutuhan_pelayanan,
      COALESCE(kp.hasil_klasifikasi, a.tujuan_kunjungan) AS hasil_klasifikasi,
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

exports.getPoliChart = (req, res) => {
  const sql = `
    SELECT
      tujuan_kunjungan AS tujuan_pelayanan,
      COUNT(*) AS jumlah
    FROM antrian
    GROUP BY tujuan_kunjungan
    ORDER BY jumlah DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.getPrioritasChart = (req, res) => {
  const sql = `
    SELECT
      COALESCE(kp.hasil_klasifikasi, a.tujuan_kunjungan, 'Poli Umum') AS kebutuhan_pelayanan,
      COUNT(*) AS jumlah
    FROM antrian a
    LEFT JOIN klasifikasi_pelayanan kp ON a.id_antrian = kp.id_antrian
    GROUP BY COALESCE(kp.hasil_klasifikasi, a.tujuan_kunjungan, 'Poli Umum')
    ORDER BY jumlah DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.getLineChart = (req, res) => {
  const sql = `
    SELECT
      DATE(tanggal) AS tanggal,
      COUNT(*) AS jumlah
    FROM antrian
    GROUP BY DATE(tanggal)
    ORDER BY DATE(tanggal) ASC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.getDashboard = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM pasien) AS total_pasien,
      (SELECT COUNT(*) FROM antrian WHERE tanggal = CURDATE()) AS antrian_hari_ini,
      (SELECT COUNT(*) FROM antrian WHERE status = 'Menunggu') AS menunggu,
      (SELECT COUNT(*) FROM antrian WHERE status = 'Dipanggil') AS sedang_dilayani,
      (SELECT COUNT(*) FROM antrian WHERE status = 'Selesai') AS selesai
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);

    res.json({
      totalPasien: result[0].total_pasien || 0,
      antrianHariIni: result[0].antrian_hari_ini || 0,
      menunggu: result[0].menunggu || 0,
      sedangDilayani: result[0].sedang_dilayani || 0,
      selesai: result[0].selesai || 0,
    });
  });
};