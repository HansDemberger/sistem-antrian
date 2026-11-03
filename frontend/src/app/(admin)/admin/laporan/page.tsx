"use client";
import { useEffect, useState } from "react";

interface Laporan {
  id_antrian: number;
  nomor_antrian: string;
  nama: string;
  nik?: string;
  keluhan?: string;
  kategori_keluhan?: string;
  kebutuhan_pelayanan: string;
  hasil_klasifikasi?: string;
  prioritas?: number;
  is_priority_active?: number;
  tujuan_pelayanan: string;
  tujuan_kunjungan?: string;
  jenis_pelayanan_aktual?: string;
  status: string;
  waktu_daftar: string;
}

export default function LaporanPage() {
  const [filter, setFilter] = useState({
    tanggalAwal: "",
    tanggalAkhir: "",
    kebutuhan: "Semua",
    poli: "Semua",
    status: "Semua",
  });

  const [laporanData, setLaporanData] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getLaporan = async (customFilter = filter) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();

      if (customFilter.tanggalAwal)
        params.append("tanggal_awal", customFilter.tanggalAwal);

      if (customFilter.tanggalAkhir)
        params.append("tanggal_akhir", customFilter.tanggalAkhir);

      if (customFilter.kebutuhan !== "Semua")
        params.append("kebutuhan_pelayanan", customFilter.kebutuhan);

      if (customFilter.poli !== "Semua")
        params.append("tujuan_pelayanan", customFilter.poli);

      if (customFilter.status !== "Semua")
        params.append("status", customFilter.status);

      const res = await fetch(
        `http://localhost:5000/api/laporan?${params.toString()}`,
        { headers }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Gagal mengambil data (status ${res.status})`);
      }

      const data = await res.json();
      setLaporanData(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err: any) {
      console.error("Laporan Fetch Error:", err);
      setLaporanData([]);
      if (err.name === "TypeError" || err.message?.includes("fetch")) {
        setErrorMessage("Gagal terhubung ke server backend (http://localhost:5000). Pastikan backend server Node.js sudah dijalankan.");
      } else {
        setErrorMessage(err.message || "Terjadi kesalahan saat memuat data laporan.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLaporan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPasien = new Set(laporanData.map((d) => d.nama)).size;
  const totalAntrian = laporanData.length;
  const countPoliUmum = laporanData.filter((d) => (d.tujuan_pelayanan || d.tujuan_kunjungan || d.kebutuhan_pelayanan || "").toLowerCase().includes("umum")).length;
  const countPoliGigi = laporanData.filter((d) => (d.tujuan_pelayanan || d.tujuan_kunjungan || d.kebutuhan_pelayanan || "").toLowerCase().includes("gigi")).length;
  const countPoliKIA = laporanData.filter((d) => (d.tujuan_pelayanan || d.tujuan_kunjungan || d.kebutuhan_pelayanan || "").toLowerCase().includes("kia") || (d.tujuan_pelayanan || "").toLowerCase().includes("kb")).length;
  const countLab = laporanData.filter((d) => (d.tujuan_pelayanan || d.tujuan_kunjungan || d.kebutuhan_pelayanan || "").toLowerCase().includes("lab")).length;
  const countIGD = laporanData.filter((d) => (d.tujuan_pelayanan || d.tujuan_kunjungan || d.kebutuhan_pelayanan || "").toLowerCase().includes("ugd") || (d.tujuan_pelayanan || "").toLowerCase().includes("igd")).length;

  const handleReset = () => {
    const resetFilter = {
      tanggalAwal: "",
      tanggalAkhir: "",
      kebutuhan: "Semua",
      poli: "Semua",
      status: "Semua",
    };
    setFilter(resetFilter);
    getLaporan(resetFilter);
  };

  const handleExportExcel = () => {
    if (laporanData.length === 0) return;

    const header = [
      "No",
      "Nomor Antrean",
      "Nama Pasien",
      "NIK",
      "Prioritas Medis",
      "Keluhan Pasien",
      "Rekomendasi ML",
      "Poli Tujuan",
      "Status Antrean",
      "Tanggal Daftar",
    ];

    const rows = laporanData.map((item, index) => [
      index + 1,
      item.nomor_antrian,
      item.nama,
      item.nik || "-",
      (item.is_priority_active || 0) > 0 ? "⚡ Prioritas Aktif" : `P${item.prioritas || 4}`,
      item.kategori_keluhan || item.keluhan || "-",
      item.hasil_klasifikasi || item.kebutuhan_pelayanan || "Konsultasi",
      item.tujuan_pelayanan || item.tujuan_kunjungan || "Poli Umum",
      item.status,
      new Date(item.waktu_daftar).toLocaleDateString("id-ID"),
    ]);

    const csvContent =
      [header, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `laporan-antrian-puskesmas-pauh-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (laporanData.length === 0) return;
    window.print();
  };

  const formattedToday = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <div className="space-y-6">
      {/* KOP SURAT PUSKESMAS RESMI (HANYA TAMPIL SAAT CETAK / EXPORT PDF) */}
      <div className="hidden print:block mb-4 text-center border-b-4 border-black pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-black">PEMERINTAH KOTA PADANG</h3>
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-black mt-0.5">DINAS KESEHATAN KOTA PADANG</h2>
        <h1 className="text-xl font-black uppercase text-black mt-0.5">UPTD PUSKESMAS PAUH</h1>
        <p className="text-[11px] font-normal text-black mt-1">
          Jl. Ir. H. Juanda No. 12, Pauh, Kota Padang, Sumatera Barat | Telp: (0751) 778901 | Email: puskesmas.pauh@padang.go.id
        </p>
        <div className="border-t-2 border-black mt-1.5"></div>
      </div>

      {/* JUDUL CETAK RESMI (HANYA TAMPIL SAAT CETAK / EXPORT PDF) */}
      <div className="hidden print:block text-center my-4">
        <h2 className="text-sm font-bold uppercase underline tracking-wider text-black">
          LAPORAN REKAPITULASI ANTREAN PASIEN & ROUTING PELAYANAN MEDIS
        </h2>
        <p className="text-[11px] text-black mt-1">
          Periode Filter: {filter.tanggalAwal ? `${filter.tanggalAwal} s/d ${filter.tanggalAkhir || "Sekarang"}` : "Semua Periode"} &nbsp;|&nbsp; Poli: {filter.poli} &nbsp;|&nbsp; Tanggal Cetak: {formattedToday}
        </p>
      </div>

      {/* HEADER WEBSITE (DIFILTER SAAT CETAK) */}
      <div className="print:hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-gray-900 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Laporan Rekapitulasi Antrean & Klasifikasi Pelayanan
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          Rekapitulasi lengkap data antrean pasien per Poli, tingkat prioritas medis, dan klasifikasi rekomendasi Decision Tree ML.
        </p>
      </div>

      {errorMessage && (
        <div className="print:hidden rounded-xl bg-red-50 p-4 text-red-700 border border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          <p className="font-semibold text-sm">⚠️ Masalah Koneksi Backend Server:</p>
          <p className="text-xs mt-1">{errorMessage}</p>
        </div>
      )}

      {/* FILTER WEBSITE (DIFILTER SAAT CETAK) */}
      <div className="print:hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="mb-4 text-base font-bold text-gray-800 dark:text-white">Filter Laporan</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 text-xs">
          <div>
            <label className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">Tanggal Awal</label>
            <input
              type="date"
              value={filter.tanggalAwal}
              onChange={(e) =>
                setFilter({ ...filter, tanggalAwal: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 p-2.5 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">Tanggal Akhir</label>
            <input
              type="date"
              value={filter.tanggalAkhir}
              onChange={(e) =>
                setFilter({ ...filter, tanggalAkhir: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 p-2.5 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">Rekomendasi ML</label>
            <select
              className="w-full rounded-lg border border-slate-200 p-2.5 dark:bg-gray-800 dark:text-white"
              value={filter.kebutuhan}
              onChange={(e) => setFilter({ ...filter, kebutuhan: e.target.value })}
            >
              <option>Semua</option>
              <option>Konsultasi</option>
              <option>Konsultasi + Pemeriksaan</option>
              <option>Konsultasi + Tindakan</option>
              <option>Laboratorium</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">Poli Tujuan</label>
            <select
              className="w-full rounded-lg border border-slate-200 p-2.5 dark:bg-gray-800 dark:text-white"
              value={filter.poli}
              onChange={(e) =>
                setFilter({ ...filter, poli: e.target.value })
              }
            >
              <option>Semua</option>
              <option>Poli Umum</option>
              <option>Poli Gigi</option>
              <option>Poli KIA/KB</option>
              <option>Laboratorium</option>
              <option>UGD</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block font-medium text-gray-700 dark:text-gray-300">Status Antrean</label>
            <select
              className="w-full rounded-lg border border-slate-200 p-2.5 dark:bg-gray-800 dark:text-white"
              value={filter.status}
              onChange={(e) =>
                setFilter({ ...filter, status: e.target.value })
              }
            >
              <option>Semua</option>
              <option>Menunggu</option>
              <option>ACTIVE QUEUE</option>
              <option>Dipanggil</option>
              <option>Selesai</option>
              <option>NO-SHOW</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex gap-3 text-xs font-semibold">
          <button
            onClick={() => getLaporan()}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-white hover:bg-teal-700 transition cursor-pointer"
          >
            Tampilkan Laporan
          </button>

          <button
            onClick={handleReset}
            className="rounded-lg bg-slate-500 px-5 py-2.5 text-white hover:bg-slate-600 transition cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS METRICS POLI (DIFILTER SAAT CETAK) */}
      <div className="print:hidden grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-xl bg-blue-600 p-4 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Pasien</p>
          <h2 className="mt-1 text-2xl font-extrabold">{totalPasien}</h2>
        </div>

        <div className="rounded-xl bg-teal-600 p-4 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Antrean</p>
          <h2 className="mt-1 text-2xl font-extrabold">{totalAntrian}</h2>
        </div>

        <div className="rounded-xl bg-slate-800 p-4 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Poli Umum (UM-)</p>
          <h2 className="mt-1 text-2xl font-extrabold">{countPoliUmum}</h2>
        </div>

        <div className="rounded-xl bg-emerald-600 p-4 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Poli Gigi (GI-)</p>
          <h2 className="mt-1 text-2xl font-extrabold">{countPoliGigi}</h2>
        </div>

        <div className="rounded-xl bg-purple-600 p-4 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">KIA/KB (KIA-)</p>
          <h2 className="mt-1 text-2xl font-extrabold">{countPoliKIA}</h2>
        </div>

        <div className="rounded-xl bg-amber-600 p-4 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Laboratorium (LAB-)</p>
          <h2 className="mt-1 text-2xl font-extrabold">{countLab}</h2>
        </div>

        <div className="rounded-xl bg-red-600 p-4 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">UGD (UGD-)</p>
          <h2 className="mt-1 text-2xl font-extrabold">{countIGD}</h2>
        </div>
      </div>

      {/* TABEL DATA REKAP RESMI */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-gray-900 dark:border-gray-800 print:p-0 print:border-none print:shadow-none">
        <div className="print:hidden mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">Data Rekapitulasi Laporan</h2>

          <div className="flex gap-2">
            <button
              onClick={handleExportPdf}
              disabled={laporanData.length === 0}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
            >
              📄 Cetak Laporan PDF Resmi
            </button>

            <button
              onClick={handleExportExcel}
              disabled={laporanData.length === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
            >
              📊 Export Excel (CSV)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs border border-slate-300 print:border-black print:text-[10px]">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 print:bg-slate-200 print:text-black print:border-black">
                <th className="py-2.5 px-3 border border-slate-300 print:border-black text-center">No</th>
                <th className="py-2.5 px-4 border border-slate-300 print:border-black">No. Antrean</th>
                <th className="py-2.5 px-4 border border-slate-300 print:border-black">Nama Pasien & NIK</th>
                <th className="py-2.5 px-4 border border-slate-300 print:border-black">Prioritas Medis</th>
                <th className="py-2.5 px-4 border border-slate-300 print:border-black">Keluhan Pasien</th>
                <th className="py-2.5 px-4 border border-slate-300 print:border-black">Rekomendasi ML</th>
                <th className="py-2.5 px-4 border border-slate-300 print:border-black">Poli Tujuan</th>
                <th className="py-2.5 px-4 border border-slate-300 print:border-black text-center">Status</th>
                <th className="py-2.5 px-4 border border-slate-300 print:border-black text-center">Tanggal Daftar</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 print:divide-black">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Memuat data laporan...
                  </td>
                </tr>
              ) : laporanData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    {errorMessage ? "Tidak ada data (server offline)." : "Belum ada data laporan antrean."}
                  </td>
                </tr>
              ) : (
                laporanData.map((item, index) => (
                  <tr key={item.id_antrian ? `lap-${item.id_antrian}-${index}` : `lap-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 print:hover:bg-transparent">
                    <td className="py-2.5 px-3 border border-slate-300 print:border-black text-center text-slate-700 print:text-black font-medium">{index + 1}</td>
                    
                    {/* Nomor Antrean */}
                    <td className="py-2.5 px-4 border border-slate-300 print:border-black whitespace-nowrap">
                      <span className="font-mono text-xs print:text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 whitespace-nowrap inline-block tracking-wider print:bg-transparent print:border-none print:text-black">
                        {item.nomor_antrian}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 border border-slate-300 print:border-black font-bold text-slate-900 dark:text-white print:text-black">
                      {item.nama}
                      <span className="block text-[10px] font-normal text-slate-500 print:text-black">NIK: {item.nik || "-"}</span>
                    </td>

                    {/* Prioritas Medis */}
                    <td className="py-2.5 px-4 border border-slate-300 print:border-black whitespace-nowrap">
                      {(item.is_priority_active || 0) > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white border border-red-700 print:bg-transparent print:text-black print:border-none">
                          ⚡ Prioritas Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 print:bg-transparent print:text-black print:border-none">
                          {item.prioritas === 1 ? "P1 (Konsultasi + Tindakan)" :
                           item.prioritas === 2 ? "P2 (Konsultasi + Pemeriksaan)" :
                           item.prioritas === 3 ? "P3 (Laboratorium)" :
                           "P4 (Konsultasi)"}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 border border-slate-300 print:border-black text-slate-700 dark:text-slate-300 print:text-black font-medium">
                      {item.kategori_keluhan || item.keluhan || "-"}
                    </td>

                    <td className="py-2.5 px-4 border border-slate-300 print:border-black">
                      <span className="inline-flex items-center rounded bg-teal-50 px-2 py-0.5 text-xs print:text-[10px] font-semibold text-teal-700 dark:bg-teal-950/50 border border-teal-200 print:bg-transparent print:text-black print:border-none">
                        {item.hasil_klasifikasi || item.kebutuhan_pelayanan || "Konsultasi"}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 border border-slate-300 print:border-black">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs print:text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 border border-blue-200 print:bg-transparent print:text-black print:border-none">
                        {item.tujuan_pelayanan || item.tujuan_kunjungan || "Poli Umum"}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 border border-slate-300 print:border-black text-center whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-300 print:bg-transparent print:text-black print:border-none">
                        {item.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 border border-slate-300 print:border-black text-center text-slate-600 print:text-black whitespace-nowrap">
                      {item.waktu_daftar && !isNaN(new Date(item.waktu_daftar).getTime())
                        ? new Date(item.waktu_daftar).toLocaleDateString("id-ID")
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER TANDA TANGAN DOKUMEN PUSKESMAS RESMI (HANYA TAMPIL SAAT CETAK / EXPORT PDF) */}
      <div className="hidden print:block mt-12 pt-4">
        <div className="flex justify-between text-xs font-medium text-black px-6">
          <div className="text-center space-y-16">
            <p>Mengetahui,<br /><strong>Kepala UPTD Puskesmas Pauh</strong></p>
            <div>
              <p className="font-bold underline">( dr. Hj. Nining Fitriani, M.Kes )</p>
              <p className="text-[10px] text-black">NIP. 19780512 200501 2 004</p>
            </div>
          </div>

          <div className="text-center space-y-16">
            <p>Padang, {formattedToday}<br /><strong>Petugas Penanggung Jawab Antrean</strong></p>
            <div>
              <p className="font-bold underline">( Admin Pelayanan Antrean )</p>
              <p className="text-[10px] text-black">NIP. 19850314 201001 1 008</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
