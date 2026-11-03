"use client";

import { useEffect, useState } from "react";

interface AntrianSaya {
  id_antrian: number;
  nomor_antrian: string;
  no_panggilan?: number;
  is_priority_active?: number;
  tanggal?: string;
  jenis_kunjungan?: string;
  kategori_keluhan?: string;
  poli?: string;
  tujuan_kunjungan?: string;
  pelayanan?: string;
  rekomendasi_pelayanan?: string;
  hasil_klasifikasi?: string;
  tingkat_keyakinan?: number;
  confidence?: number;
  status: string;
  waktu_daftar?: string;
  sedang_dilayani?: string;
  antrean_di_depan?: number;
}

export default function StatusAntrianPage() {
  const [antrian, setAntrian] = useState<AntrianSaya | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);

  const getAntrianSaya = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/antrian/saya", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        setAntrian(null);
        return;
      }

      const data = await res.json();
      setAntrian(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAntrianSaya();

    const interval = setInterval(() => {
      getAntrianSaya();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleCheckin = async () => {
    if (!antrian?.id_antrian) return;
    try {
      setCheckinLoading(true);
      
      setAntrian((prev) => prev ? { ...prev, status: "ACTIVE QUEUE" } : null);

      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:5000/api/antrian/${antrian.id_antrian}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        getAntrianSaya();
      } else {
        const data = await res.json();
        alert(data.message || "Gagal melakukan check-in");
      }
    } catch (err) {
      console.log(err);
    } finally {
      setCheckinLoading(false);
    }
  };

  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return "18 Agustus";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "long" });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 font-medium text-sm">
        Memuat data antrean...
      </div>
    );
  }

  if (!antrian) {
    return (
      <div className="max-w-md mx-auto rounded-xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-center">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">
          Belum Ada Antrean Aktif
        </h1>
        <p className="mt-2 text-xs text-gray-500">
          Anda belum mendaftar antrian untuk hari ini. Silakan buka menu Pendaftaran Pasien untuk mengambil antrean.
        </p>
      </div>
    );
  }

  const normalizedStatus = (antrian.status || "").toUpperCase();
  const isPendingVerification =
    normalizedStatus === "MENUNGGU VERIFIKASI" ||
    normalizedStatus.includes("VERIFIKASI") ||
    normalizedStatus === "PENDING" ||
    antrian.nomor_antrian === "PENDING";

  const ticketNo = (antrian.nomor_antrian && antrian.nomor_antrian !== "PENDING") ? antrian.nomor_antrian : "-";

  // ========================================================
  // STATE 1: MENUNGGU VERIFIKASI ADMIN (PENDING DITAHAN)
  // ========================================================
  if (isPendingVerification) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-amber-200 dark:bg-gray-900 dark:border-amber-900/50 space-y-5">
          {/* Header Status Pending */}
          <div className="text-center border-b border-gray-100 dark:border-gray-800 pb-3">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs uppercase dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              ⏳ MENUNGGU VERIFIKASI ADMIN
            </span>
            <h2 className="text-lg font-extrabold text-gray-800 dark:text-white uppercase mt-2">
              Status Pendaftaran Ditahan
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Proses ML Decision Tree selesai. Pendaftaran Anda menunggu pengesahan Admin.
            </p>
          </div>

          {/* Card Status Nomor PENDING */}
          <div className="text-center rounded-xl bg-amber-50/70 py-4 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-gray-500 font-medium uppercase">Nomor Antrean Resmi:</p>
            <h1 className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 tracking-wider">
              PENDING
            </h1>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-1">
              (Diterbitkan setelah diverifikasi oleh Admin)
            </p>
          </div>

          {/* Details Ringkas */}
          <div className="space-y-2 text-left bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl text-xs border border-gray-200 dark:border-gray-700 font-medium">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Poli Tujuan:</span>
              <span className="font-bold text-teal-700 dark:text-teal-300">{antrian.poli || antrian.tujuan_kunjungan || "Poli Umum"}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className="text-gray-500 dark:text-gray-400">Rekomendasi ML:</span>
              <span className="font-semibold text-gray-800 dark:text-white">{antrian.pelayanan || antrian.rekomendasi_pelayanan || antrian.hasil_klasifikasi || "Konsultasi"}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className="text-gray-500 dark:text-gray-400">Tanggal Kunjungan:</span>
              <span className="font-semibold text-gray-800 dark:text-white">{formatDateIndo(antrian.tanggal)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className="text-gray-500 dark:text-gray-400">Status Verifikasi:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">MENUNGGU VERIFIKASI</span>
            </div>
          </div>

          {/* Banner Informasi Edukatif */}
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <p className="font-bold text-center">ℹ️ Informasi Penting Pasien:</p>
            <p className="text-[11px] leading-relaxed text-center">
              Setelah Admin melakukan verifikasi, Nomor Antrean Resmi dan E-Tiket Anda akan diterbitkan secara otomatis, serta tombol <strong>CEK-IN ANTREAN</strong> akan muncul di halaman ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // STATE 3: ACTIVE QUEUE (SETELAH PASIEN KLIK CEK-IN)
  // ========================================================
  if (normalizedStatus === "ACTIVE QUEUE" || normalizedStatus.includes("ACTIVE") || normalizedStatus.includes("AKTIF")) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        {/* BANNER NOTIFIKASI NOMOR PANGGILAN BARU (HANYA TAMPIL SAAT ADMIN MENGAKTIFKAN PRIORITAS) */}
        {(antrian.is_priority_active || 0) > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-4 text-white text-center shadow-lg animate-pulse border border-red-500 space-y-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-yellow-300">
              ⚡ PETUGAS ADMIN MENGAKTIFKAN PRIORITAS ⚡
            </p>
            <p className="text-sm font-bold">
              Nomor panggilan Anda didahulukan menjadi: <span className="text-xl font-black underline text-yellow-300">#{antrian.no_panggilan || 1} (PRIORITAS)</span>
            </p>
            <p className="text-[11px] text-red-100 italic">
              (Nomor tiket fisik Anda tetap <strong className="underline">{ticketNo}</strong> dan Anda dipanggil ke-{antrian.no_panggilan || 1} di {antrian.poli || "Poli Tujuan"})
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800 space-y-5">
          {/* Header Status */}
          <div className="text-center border-b border-gray-100 dark:border-gray-800 pb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Status Antrean:</p>
            <span className="inline-block mt-1 px-3 py-1 rounded-md bg-teal-50 text-teal-700 font-bold text-xs uppercase dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              ANTREAN AKTIF
            </span>
          </div>

          {/* Nomor Anda */}
          <div className="text-center rounded-xl bg-gray-50 py-4 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 font-medium">Nomor Tiket Anda:</p>
            <h1 className="text-5xl font-extrabold text-teal-700 dark:text-teal-400 mt-1">
              {ticketNo}
            </h1>
          </div>

        {/* Informasional Metrics */}
        <div className="grid grid-cols-2 gap-3 text-center text-xs">
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 font-medium">Sedang dilayani:</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
              {antrian.sedang_dilayani || "-"}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 font-medium">Antrean di depan:</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
              {antrian.antrean_di_depan ?? 0} pasien
            </p>
          </div>
        </div>

          <p className="text-center text-xs text-gray-400">
            Harap menunggu panggilan menuju {antrian.poli || "Poli Umum"}.
          </p>
        </div>
      </div>
    );
  }

  // ========================================================
  // STATE 4: KETIKA DIPANGGIL
  // ========================================================
  if (normalizedStatus === "DIPANGGIL" || normalizedStatus.includes("PANGGIL") || normalizedStatus.includes("CALL")) {
    return (
      <div className="max-w-md mx-auto rounded-2xl bg-teal-700 p-6 text-white text-center shadow-md space-y-4">
        <h2 className="text-lg font-bold tracking-wide uppercase">
          NOMOR ANDA DIPANGGIL
        </h2>

        <div className="my-4 bg-white rounded-xl py-4 text-teal-800 border border-teal-100">
          <h1 className="text-5xl font-extrabold">
            {antrian.nomor_antrian && antrian.nomor_antrian !== "PENDING" ? antrian.nomor_antrian : "UM-027"}
          </h1>
        </div>

        <p className="text-xs text-teal-100">Silakan menuju ke:</p>
        <p className="text-xl font-bold uppercase">{antrian.poli || antrian.tujuan_kunjungan || "Poli Umum"}</p>
      </div>
    );
  }

  // ========================================================
  // STATE 5: SETELAH PELAYANAN (COMPLETED)
  // ========================================================
  if (normalizedStatus === "COMPLETED" || normalizedStatus === "SELESAI") {
    return (
      <div className="max-w-md mx-auto rounded-2xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-center space-y-4">
        <h2 className="text-base font-bold text-gray-800 dark:text-white uppercase">
          STATUS PELAYANAN
        </h2>

        <div className="space-y-2 rounded-xl bg-gray-50 p-4 dark:bg-gray-800 text-left text-xs border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-500">Nomor:</span>
            <span className="font-bold text-gray-800 dark:text-white">{antrian.nomor_antrian && antrian.nomor_antrian !== "PENDING" ? antrian.nomor_antrian : "UM-027"}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
            <span className="text-gray-500">Pelayanan:</span>
            <span className="font-semibold text-teal-700 dark:text-teal-300">{antrian.pelayanan || antrian.rekomendasi_pelayanan || "Konsultasi"}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
            <span className="text-gray-500">Status:</span>
            <span className="font-bold text-emerald-600 uppercase">SELESAI</span>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Terima kasih telah berkunjung ke Puskesmas Pauh.
        </p>
      </div>
    );
  }

  // ========================================================
  // STATE DEFAULT: E-TICKET RESMI (DESAIN BIASA & BERSIH)
  // ========================================================
  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* BANNER NOTIFIKASI NOMOR PANGGILAN BARU (HANYA TAMPIL SAAT ADMIN MENGAKTIFKAN PRIORITAS) */}
      {(antrian.is_priority_active || 0) > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-4 text-white text-center shadow-lg animate-pulse border border-red-500 space-y-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-yellow-300">
            ⚡ PETUGAS ADMIN MENGAKTIFKAN PRIORITAS ⚡
          </p>
          <p className="text-sm font-bold">
            Nomor panggilan Anda didahulukan menjadi: <span className="text-xl font-black underline text-yellow-300">#{antrian.no_panggilan || 1} (PRIORITAS)</span>
          </p>
          <p className="text-[11px] text-red-100 italic">
            (Nomor tiket fisik Anda tetap <strong className="underline">{ticketNo}</strong> dan Anda dipanggil ke-{antrian.no_panggilan || 1} di {antrian.poli || "Poli Tujuan"})
          </p>
        </div>
      )}

      {/* KARTU E-TICKET SEDERHANA & OFFICIAL */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800 text-center space-y-4">
        
        {/* Header E-Ticket */}
        <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            PUSKESMAS PAUH
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            NOMOR ANTREAN ANDA
          </p>
        </div>

        {/* Body Nomor Antrean */}
        <div className="my-2 py-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-100 dark:border-teal-900">
          <h1 className="text-5xl font-extrabold text-teal-700 dark:text-teal-300">
            {ticketNo}
          </h1>
        </div>

        {/* Details Rapi */}
        <div className="space-y-2 text-left bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl text-xs border border-gray-200 dark:border-gray-700 font-medium">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Pelayanan:</span>
            <span className="font-semibold text-gray-800 dark:text-white">{antrian.pelayanan || antrian.rekomendasi_pelayanan || antrian.hasil_klasifikasi || "Konsultasi"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Poli:</span>
            <span className="font-semibold text-gray-800 dark:text-white">{antrian.poli || antrian.tujuan_kunjungan || "Poli Umum"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Tanggal:</span>
            <span className="font-semibold text-gray-800 dark:text-white">{formatDateIndo(antrian.tanggal)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-500 dark:text-gray-400">Status:</span>
            <span className="font-bold text-teal-700 dark:text-teal-300 uppercase">TERPESAN</span>
          </div>
        </div>

        {/* Stamp E-Ticket */}
        <div className="pt-1 text-xs text-gray-400 font-medium">
          [ E-TIKET RESMI ]
        </div>
      </div>

      {/* TOMBOL CEK-IN BIASA & STANDAR */}
      <div>
        <button
          onClick={handleCheckin}
          disabled={checkinLoading}
          className="w-full rounded-xl bg-teal-600 py-3 font-semibold text-white text-sm hover:bg-teal-700 transition shadow-sm cursor-pointer"
        >
          {checkinLoading ? "Memproses Cek-in..." : "CEK-IN ANTREAN"}
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">
          Setelah tiba di Puskesmas, klik tombol <strong>CEK-IN ANTREAN</strong> di atas.
        </p>
      </div>
    </div>
  );
}