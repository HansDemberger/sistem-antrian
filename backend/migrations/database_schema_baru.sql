-- ==============================================================================
-- DATABASE SCHEMA BARU: SISTEM MANAJEMEN ANTRIAN ONLINE PUSKESMAS PAUH
-- Untuk di-import / di-migrasi pada Laragon (phpMyAdmin / HeidiSQL)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS db_antrian_puskesmas
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE db_antrian_puskesmas;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS pelayanan;
DROP TABLE IF EXISTS klasifikasi_pelayanan;
DROP TABLE IF EXISTS antrian;
DROP TABLE IF EXISTS pasien;
DROP TABLE IF EXISTS user;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 1. Tabel user (Mandiri) - Role: Admin & Pasien
-- ==============================================================================
CREATE TABLE user (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    nama_user VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Pasien') NOT NULL DEFAULT 'Pasien',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- 2. Tabel pasien (Mandiri)
-- ==============================================================================
CREATE TABLE pasien (
    id_pasien INT AUTO_INCREMENT PRIMARY KEY,
    nik VARCHAR(16) NOT NULL UNIQUE,
    nama_pasien VARCHAR(100) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    jenis_kelamin ENUM('L', 'P') NOT NULL,
    alamat TEXT DEFAULT NULL,
    no_hp VARCHAR(15) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- 3. Tabel antrian (Tabel Transaksi Utama)
-- ==============================================================================
CREATE TABLE antrian (
    id_antrian INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien INT NOT NULL,
    tanggal DATE NOT NULL,
    jenis_kunjungan VARCHAR(50) NOT NULL,
    tujuan_kunjungan VARCHAR(50) NOT NULL,
    kategori_keluhan VARCHAR(100) NOT NULL,
    rujukan ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
    janji_temu ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
    nomor_antrian VARCHAR(20) NOT NULL,
    prioritas INT DEFAULT 4,
    status ENUM('Menunggu', 'Dipanggil', 'Selesai') DEFAULT 'Menunggu',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_antrian_pasien 
        FOREIGN KEY (id_pasien) 
        REFERENCES pasien (id_pasien) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- 3b. Tabel prioritas_pelayanan (Aturan Prioritas Medis Puskesmas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS prioritas_pelayanan (
    id_prioritas INT AUTO_INCREMENT PRIMARY KEY,
    layanan_key VARCHAR(100) NOT NULL UNIQUE,
    nama_pelayanan VARCHAR(150) NOT NULL,
    tingkat_prioritas INT NOT NULL,
    keterangan VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO prioritas_pelayanan (layanan_key, nama_pelayanan, tingkat_prioritas, keterangan) VALUES
('TINDAKAN', 'Konsultasi + Tindakan Medis / UGD', 1, 'Prioritas 1: Membutuhkan Penanganan Medis / Tindakan Fisik Cepat'),
('PEMERIKSAAN', 'Konsultasi + Pemeriksaan Medis (Gigi/KIA)', 2, 'Prioritas 2: Membutuhkan Pemeriksaan Fisik Khusus'),
('LABORATORIUM', 'Pemeriksaan Laboratorium / Cek Darah', 3, 'Prioritas 3: Membutuhkan Pengambilan Sampel Specimen'),
('KONSULTASI', 'Konsultasi Biasa', 4, 'Prioritas 4: Konsultasi / Edukasi Kesehatan Biasa')
ON DUPLICATE KEY UPDATE tingkat_prioritas = VALUES(tingkat_prioritas);

-- ==============================================================================
-- 4. Tabel klasifikasi_pelayanan (Hasil Algoritma Decision Tree)
-- ==============================================================================
CREATE TABLE klasifikasi_pelayanan (
    id_klasifikasi INT AUTO_INCREMENT PRIMARY KEY,
    id_antrian INT NOT NULL,
    hasil_klasifikasi VARCHAR(100) NOT NULL,
    tingkat_keyakinan DECIMAL(5,2) DEFAULT NULL,
    waktu_klasifikasi DATETIME DEFAULT CURRENT_TIMESTAMP,
    versi_model VARCHAR(50) DEFAULT NULL,
    CONSTRAINT fk_klasifikasi_antrian 
        FOREIGN KEY (id_antrian) 
        REFERENCES antrian (id_antrian) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- 5. Tabel pelayanan (Pencatatan Aktual)
-- ==============================================================================
CREATE TABLE pelayanan (
    id_pelayanan INT AUTO_INCREMENT PRIMARY KEY,
    id_antrian INT NOT NULL,
    jenis_pelayanan_aktual VARCHAR(100) NOT NULL,
    waktu_mulai DATETIME NOT NULL,
    waktu_selesai DATETIME DEFAULT NULL,
    keterangan TEXT DEFAULT NULL,
    CONSTRAINT fk_pelayanan_antrian 
        FOREIGN KEY (id_antrian) 
        REFERENCES antrian (id_antrian) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INDEXING
CREATE INDEX idx_antrian_tanggal ON antrian(tanggal);
CREATE INDEX idx_antrian_status ON antrian(status);
CREATE INDEX idx_klasifikasi_hasil ON klasifikasi_pelayanan(hasil_klasifikasi);

-- ==============================================================================
-- CONTOH DATA SEEDER AWAL
-- ==============================================================================

-- Seed User Admin & Pasien (Password default: admin123)
INSERT INTO user (nama_user, username, password, role) VALUES 
('Administrator Puskesmas', 'admin', 'admin123', 'Admin'),
('Budi Santoso', '1371010101950001', 'admin123', 'Pasien'),
('Siti Rahmah', '1371010202980002', 'admin123', 'Pasien');

-- Seed Pasien Contoh
INSERT INTO pasien (nik, nama_pasien, tanggal_lahir, jenis_kelamin, alamat, no_hp) VALUES
('1371010101950001', 'Budi Santoso', '1995-05-12', 'L', 'Jl. Pauh Raya No. 12, Padang', '081266001122'),
('1371010202980002', 'Siti Rahmah', '1998-08-20', 'P', 'Kuranji, Kota Padang', '081377002233');

-- Seed Antrian Contoh
INSERT INTO antrian (id_pasien, tanggal, jenis_kunjungan, tujuan_kunjungan, kategori_keluhan, rujukan, janji_temu, nomor_antrian, status) VALUES
(1, CURDATE(), 'Baru', 'Poli Umum', 'Demam dan Batuk', 'Tidak', 'Tidak', 'A001', 'Menunggu'),
(2, CURDATE(), 'Lama', 'Poli Gigi', 'Sakit Gigi Berlubang', 'Tidak', 'Tidak', 'B001', 'Dipanggil');

-- Seed Hasil Klasifikasi Decision Tree Contoh
INSERT INTO klasifikasi_pelayanan (id_antrian, hasil_klasifikasi, tingkat_keyakinan, versi_model) VALUES
(1, 'Poli Umum', 95.50, 'DecisionTree_v1.0'),
(2, 'Poli Gigi', 98.20, 'DecisionTree_v1.0');

-- Seed Pelayanan Contoh
INSERT INTO pelayanan (id_antrian, jenis_pelayanan_aktual, waktu_mulai, waktu_selesai, keterangan) VALUES
(2, 'Poli Gigi', NOW(), NULL, 'Pasien sedang dilakukan tindakan pemeriksaan gigi');
