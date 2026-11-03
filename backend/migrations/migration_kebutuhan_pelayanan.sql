-- Migration Script: Tambah kolom kebutuhan_pelayanan untuk Klasifikasi Kebutuhan Pelayanan Pasien (Routing Antrean)

-- Tambah kolom kebutuhan_pelayanan ke tabel antrian
ALTER TABLE antrian 
ADD COLUMN kebutuhan_pelayanan VARCHAR(100) AFTER kesadaran;

-- Tambah indeks untuk performa pencarian / filter routing antrean
CREATE INDEX idx_kebutuhan_pelayanan ON antrian(kebutuhan_pelayanan);

-- Update data antrian lama agar kebutuhan_pelayanan terisi jika masih kosong
UPDATE antrian 
SET kebutuhan_pelayanan = COALESCE(tujuan_pelayanan, 
    CASE 
        WHEN keluhan LIKE '%gigi%' THEN 'Poli Gigi'
        WHEN keluhan LIKE '%hamil%' OR keluhan LIKE '%imunisasi%' OR keluhan LIKE '%kb%' THEN 'Poli KIA/KB'
        WHEN keluhan LIKE '%dada%' OR keluhan LIKE '%pingsan%' OR keluhan LIKE '%sesak%' THEN 'UGD/Emergency'
        ELSE 'Poli Umum'
    END
)
WHERE kebutuhan_pelayanan IS NULL OR kebutuhan_pelayanan = '';
