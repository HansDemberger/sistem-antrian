"use client";

import { useEffect, useState } from "react";

interface PendaftaranItem {
  id_antrian: number;
  nomor_antrian?: string;
  nama_pasien: string;
  nik?: string;
  jenis_kunjungan: string;
  kategori_keluhan: string;
  rekomendasi_pelayanan?: string;
  hasil_klasifikasi?: string;
  tingkat_keyakinan?: number;
  confidence?: number;
  prioritas?: number;
  is_priority_active?: number;
  status: string;
  waktu_daftar: string;
  poli?: string;
  tujuan_kunjungan?: string;
  final_service?: string;
}

export default function MenerimaPendaftaranBerobatPage() {
  const [list, setList] = useState<PendaftaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PendaftaranItem | null>(null);
  const [isPriorityMode, setIsPriorityMode] = useState(false);

  const [formValidasi, setFormValidasi] = useState({
    final_service: "Konsultasi",
    poli: "Poli Umum",
    is_override: false
  });

  const getPendaftaran = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = isPriorityMode
        ? "http://localhost:5000/api/antrian?sort=priority"
        : "http://localhost:5000/api/antrian?sort=newest";

      const res = await fetch(url, { headers });

      if (res.ok) {
        const data = await res.json();
        setList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPendaftaran();
    const interval = setInterval(getPendaftaran, 2000);
    return () => clearInterval(interval);
  }, [isPriorityMode]);

  const handleTogglePriority = async (id: number, currentActiveState?: number) => {
    try {
      const token = localStorage.getItem("token");
      const nextState = currentActiveState === 1 ? 0 : 1;

      const res = await fetch(`http://localhost:5000/api/antrian/${id}/prioritas`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_priority_active: nextState }),
      });

      if (res.ok) {
        getPendaftaran();
      } else {
        const data = await res.json();
        alert(data.message || "Gagal mengupdate status prioritas");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleOpenModal = (item: PendaftaranItem) => {
    setSelectedItem(item);
    setFormValidasi({
      final_service: item.final_service || item.rekomendasi_pelayanan || item.hasil_klasifikasi || "Konsultasi",
      poli: item.poli || item.tujuan_kunjungan || "Poli Umum",
      is_override: false
    });
  };

  const handleConfirmAccept = async () => {
    if (!selectedItem) return;
    const recommended = selectedItem.rekomendasi_pelayanan || selectedItem.hasil_klasifikasi || "Konsultasi";
    const recommendedPoli = selectedItem.poli || selectedItem.tujuan_kunjungan || "Poli Umum";
    executeVerifikasi(recommended, recommendedPoli, false);
  };

  const handleConfirmOverride = async () => {
    if (!selectedItem) return;
    executeVerifikasi(formValidasi.final_service, formValidasi.poli, true);
  };

  const executeVerifikasi = async (finalService: string, targetPoli: string, isOverride: boolean) => {
    if (!selectedItem) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/antrian/${selectedItem.id_antrian}/verifikasi`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          final_service: finalService,
          poli: targetPoli,
          is_override: isOverride
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Gagal melakukan verifikasi");
        return;
      }

      const modeText = isOverride ? "OVERRIDE" : "ACCEPT ML RECOMMENDATION";
      alert(`Verifikasi Berhasil (${modeText})!\nBooking Number diterbitkan: ${data.nomor_antrian}`);
      setSelectedItem(null);
      getPendaftaran();
    } catch (err) {
      console.log(err);
      alert("Terjadi kesalahan pada server");
    }
  };

  const handleDeleteAntrian = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data antrean ini? Nomor antrean di atasnya akan otomatis digeser merapat ke bawah.")) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/antrian/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        getPendaftaran();
      } else {
        const data = await res.json();
        alert(data.message || "Gagal menghapus antrean");
      }
    } catch (err) {
      console.log(err);
    }
  };



  const [selectedPoli, setSelectedPoli] = useState("Semua Poli");

  const filteredList = list.filter((item) => {
    if (!selectedPoli || selectedPoli === "Semua Poli") return true;
    const itemPoli = (item.poli || item.tujuan_kunjungan || "Poli Umum").toLowerCase();
    const sel = selectedPoli.toLowerCase();

    if (sel.includes("gigi") && itemPoli.includes("gigi")) return true;
    if ((sel.includes("kia") || sel.includes("kb")) && (itemPoli.includes("kia") || itemPoli.includes("kb"))) return true;
    if (sel.includes("lab") && itemPoli.includes("lab")) return true;
    if ((sel.includes("ugd") || sel.includes("emergency")) && (itemPoli.includes("ugd") || itemPoli.includes("emergency"))) return true;
    if (sel.includes("umum") && itemPoli.includes("umum")) return true;

    return itemPoli.includes(sel);
  });

  return (
    <div className="rounded-2xl bg-white p-7 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verifikasi Pendaftaran Pasien Per-Poli
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Verifikasi rekomendasi Decision Tree, tentukan Jenis Pelayanan Akhir & Penetapan Nomor Antrean per Poli.
          </p>
        </div>

        {/* Kontrol Filter & Mode Urutan Prioritas */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPriorityMode(!isPriorityMode)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm border whitespace-nowrap ${isPriorityMode
              ? "bg-red-600 text-white border-red-700 hover:bg-red-700 shadow-red-200"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200"
              }`}
          >
            {isPriorityMode ? "⚡ Prioritas Medis Aktif (P1 Didahulukan)" : "🕒 Mode Urutan Pendaftaran Terbaru"}
          </button>

          <select
            className="rounded-xl border border-gray-300 p-2.5 text-xs font-semibold dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={selectedPoli}
            onChange={(e) => setSelectedPoli(e.target.value)}
          >
            <option value="Semua Poli">Semua Poli (Semua Antrean)</option>
            <option value="Poli Umum">Poli Umum (UM-)</option>
            <option value="Poli Gigi">Poli Gigi (GI-)</option>
            <option value="Poli KIA / KB">Poli KIA / KB (KIA-)</option>
            <option value="Laboratorium">Laboratorium (LAB-)</option>
            <option value="UGD / Emergency">UGD / Emergency (UGD-)</option>
          </select>
        </div>
      </div>

      {/* Card Ringkasan & Tab Filter Per-Kode Poli */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card Semua Poli */}
        <button
          onClick={() => setSelectedPoli("Semua Poli")}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${selectedPoli === "Semua Poli"
            ? "bg-teal-50 border-teal-500 dark:bg-teal-950/60 dark:border-teal-400 shadow-sm"
            : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100"
            }`}
        >
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Semua Poli</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {list.length}
            </span>
            <span className="text-[10px] font-bold text-teal-600 bg-teal-100 dark:bg-teal-900 dark:text-teal-300 px-1.5 py-0.5 rounded">
              ALL
            </span>
          </div>
        </button>

        {/* Card Poli Umum (UM) */}
        <button
          onClick={() => setSelectedPoli("Poli Umum")}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${selectedPoli === "Poli Umum"
            ? "bg-blue-50 border-blue-500 dark:bg-blue-950/60 dark:border-blue-400 shadow-sm"
            : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100"
            }`}
        >
          <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Poli Umum</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {list.filter(i => (i.poli || i.tujuan_kunjungan || "").toLowerCase().includes("umum")).length}
            </span>
            <span className="text-[10px] font-mono font-extrabold text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded">
              UM-
            </span>
          </div>
        </button>

        {/* Card Poli Gigi (GI) */}
        <button
          onClick={() => setSelectedPoli("Poli Gigi")}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${selectedPoli === "Poli Gigi"
            ? "bg-cyan-50 border-cyan-500 dark:bg-cyan-950/60 dark:border-cyan-400 shadow-sm"
            : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100"
            }`}
        >
          <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Poli Gigi</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {list.filter(i => (i.poli || i.tujuan_kunjungan || "").toLowerCase().includes("gigi")).length}
            </span>
            <span className="text-[10px] font-mono font-extrabold text-cyan-700 bg-cyan-100 dark:bg-cyan-900 dark:text-cyan-200 px-1.5 py-0.5 rounded">
              GI-
            </span>
          </div>
        </button>

        {/* Card Poli KIA/KB (KIA) */}
        <button
          onClick={() => setSelectedPoli("Poli KIA / KB")}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${selectedPoli === "Poli KIA / KB"
            ? "bg-pink-50 border-pink-500 dark:bg-pink-950/60 dark:border-pink-400 shadow-sm"
            : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100"
            }`}
        >
          <p className="text-[11px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wide">Poli KIA / KB</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {list.filter(i => {
                const p = (i.poli || i.tujuan_kunjungan || "").toLowerCase();
                return p.includes("kia") || p.includes("kb");
              }).length}
            </span>
            <span className="text-[10px] font-mono font-extrabold text-pink-700 bg-pink-100 dark:bg-pink-900 dark:text-pink-200 px-1.5 py-0.5 rounded">
              KIA-
            </span>
          </div>
        </button>

        {/* Card Laboratorium (LAB) */}
        <button
          onClick={() => setSelectedPoli("Laboratorium")}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${selectedPoli === "Laboratorium"
            ? "bg-purple-50 border-purple-500 dark:bg-purple-950/60 dark:border-purple-400 shadow-sm"
            : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100"
            }`}
        >
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Laboratorium</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {list.filter(i => (i.poli || i.tujuan_kunjungan || "").toLowerCase().includes("lab")).length}
            </span>
            <span className="text-[10px] font-mono font-extrabold text-purple-700 bg-purple-100 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded">
              LAB-
            </span>
          </div>
        </button>

        {/* Card UGD (UGD) */}
        <button
          onClick={() => setSelectedPoli("UGD / Emergency")}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${selectedPoli === "UGD / Emergency"
            ? "bg-red-50 border-red-500 dark:bg-red-950/60 dark:border-red-400 shadow-sm"
            : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-100"
            }`}
        >
          <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">UGD / Darurat</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {list.filter(i => {
                const p = (i.poli || i.tujuan_kunjungan || "").toLowerCase();
                return p.includes("ugd") || p.includes("emergency");
              }).length}
            </span>
            <span className="text-[10px] font-mono font-extrabold text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 rounded">
              UGD-
            </span>
          </div>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Memuat data pendaftaran...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                <th className="py-4 px-4">No. Panggilan</th>
                <th className="py-4 px-4">No. Antrean</th>
                <th className="py-4 px-4">Pasien</th>
                <th className="py-4 px-4">Prioritas Medis</th>
                <th className="py-4 px-4">Keluhan & Kunjungan</th>
                <th className="py-4 px-4">Poli Tujuan</th>
                <th className="py-4 px-4">Rekomendasi ML</th>
                <th className="py-4 px-4">Pelayanan Aktual (Admin)</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-center">Aksi Verifikasi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredList.map((item, index) => (
                <tr key={item.id_antrian ? `menerima-${item.id_antrian}-${index}` : `menerima-${index}`} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition">
                  {/* Nomor Panggilan (Posisi Urutan Panggilan Baru Per-Poli) */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {(item.is_priority_active || 0) > 0 ? (
                      <span className="font-mono text-xs font-extrabold text-white bg-red-600 px-2.5 py-1 rounded-md border border-red-700 shadow-sm animate-pulse whitespace-nowrap inline-block">
                        ⚡ #{index + 1} (PRIORITAS)
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap inline-block">
                        #{index + 1}
                      </span>
                    )}
                  </td>

                  {/* Nomor Antrean (Tiket Asli Pasien - Permanen Tidak Berubah) */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/80 dark:border-blue-800 whitespace-nowrap inline-block tracking-wider">
                      {item.nomor_antrian || "PENDING"}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">
                    {item.nama_pasien || "Pasien"}
                    <span className="block text-xs font-normal text-gray-400">NIK: {item.nik || "-"}</span>
                  </td>
                  {/* Kolom Prioritas Medis Aturan Database Puskesmas */}
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-extrabold ${item.prioritas === 1 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200" :
                      item.prioritas === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-200" :
                        item.prioritas === 3 ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200" :
                          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200"
                      }`}>
                      {item.prioritas === 1 ? "Prioritas 1 (Konsultasi + Tindakan)" :
                        item.prioritas === 2 ? "Prioritas 2 (Konsultasi + Pemeriksaan)" :
                          item.prioritas === 3 ? "Prioritas 3 (Laboratorium)" :
                            "Prioritas 4 (Konsultasi)"}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">
                    <span className="font-semibold block">{item.kategori_keluhan || "Umum"}</span>
                    <span className="text-xs text-gray-400">Kunjungan: {item.jenis_kunjungan || "Kontrol"}</span>
                  </td>
                  {/* Kolom Poli Tujuan (Ruangan Unit Medis) */}
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                      {item.poli || item.tujuan_kunjungan || "Poli Umum"}
                    </span>
                  </td>
                  {/* Kolom Rekomendasi Murni Decision Tree ML */}
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {item.hasil_klasifikasi || item.rekomendasi_pelayanan || "Konsultasi"} ({item.confidence || item.tingkat_keyakinan || 92}%)
                    </span>
                  </td>
                  {/* Kolom Pelayanan Aktual Hasil Verifikasi Admin */}
                  <td className="py-4 px-4">
                    {(item.status === "Menunggu Verifikasi" || item.status === "Menunggu") ? (
                      <span className="text-xs italic text-gray-400 font-medium">
                        Belum Ditetapkan Admin
                      </span>
                    ) : (
                      <span className="block text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {item.final_service || item.hasil_klasifikasi || "Konsultasi"}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {(item.status === "Menunggu Verifikasi" || item.status === "Menunggu") ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Menunggu Verifikasi
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.status} ({item.poli || item.tujuan_kunjungan})
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center space-x-1.5 whitespace-nowrap">
                    {/* Tombol Aktifkan Prioritas: MERAH jika Aktif, BIASA jika Tidak Aktif */}
                    <button
                      onClick={() => handleTogglePriority(item.id_antrian, item.is_priority_active)}
                      title={
                        (item.is_priority_active || 0) > 0
                          ? `Prioritas Aktif (#${index + 1} Panggilan). Klik untuk menonaktifkan.`
                          : "Klik untuk mengaktifkan prioritas agar pasien dipanggil lebih awal"
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${(item.is_priority_active || 0) > 0
                        ? "bg-red-600 text-white border-red-700 shadow-sm hover:bg-red-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                    >
                      {(item.is_priority_active || 0) > 0 ? `⚡ Prioritas Aktif (#${index + 1})` : "⚡ Aktifkan Prioritas"}
                    </button>

                    <button
                      onClick={() => handleOpenModal(item)}
                      className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 transition shadow cursor-pointer"
                    >
                      Verifikasi Pendaftaran
                    </button>

                    <button
                      onClick={() => handleDeleteAntrian(item.id_antrian)}
                      className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                      title="Hapus Antrean"
                    >
                      🗑️ Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL VERIFIKASI ADMIN */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-5">

            <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                VERIFIKASI PENDAFTARAN PASIEN
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Pasien: <strong className="text-teal-600">{selectedItem.nama_pasien}</strong>
              </p>
            </div>

            {/* Panel Hasil Prediksi ML */}
            <div className="rounded-2xl bg-teal-50 p-4 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                Prediksi Decision Tree ML:
              </p>
              <p className="text-2xl font-black text-teal-900 dark:text-teal-100">
                {selectedItem.hasil_klasifikasi || selectedItem.rekomendasi_pelayanan || "Konsultasi"}
              </p>
              <p className="text-xs text-teal-700 dark:text-teal-400">
                Tingkat Keyakinan: <strong>{selectedItem.confidence || selectedItem.tingkat_keyakinan || 92}%</strong>
              </p>
            </div>

            {/* OPSI 1: TERIMA REKOMENDASI ML */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300">Opsi 1: Terima Rekomendasi ML</p>
                <p className="text-sm font-extrabold text-emerald-900 dark:text-emerald-100 mt-0.5">
                  {selectedItem.hasil_klasifikasi || "Konsultasi"} &rarr; {selectedItem.poli || selectedItem.tujuan_kunjungan || "Poli Umum"}
                </p>
              </div>
              <button
                onClick={handleConfirmAccept}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-700 transition shadow cursor-pointer"
              >
                TERIMA
              </button>
            </div>

            {/* OPSI 2: UBAH PELAYANAN MANUAL */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
              <p className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">Opsi 2: Ubah Pelayanan Akhir Manual</p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1 dark:text-gray-300">Jenis Pelayanan Akhir:</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 p-2 dark:bg-gray-700 dark:text-white"
                    value={formValidasi.final_service}
                    onChange={(e) => setFormValidasi({ ...formValidasi, final_service: e.target.value })}
                  >
                    <option value="Konsultasi">Konsultasi</option>
                    <option value="Tindakan Medis">Tindakan Medis</option>
                    <option value="Pemeriksaan Laboratorium">Pemeriksaan Laboratorium</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 dark:text-gray-300">Poli Tujuan:</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 p-2 dark:bg-gray-700 dark:text-white"
                    value={formValidasi.poli}
                    onChange={(e) => setFormValidasi({ ...formValidasi, poli: e.target.value })}
                  >
                    <option value="Poli Umum">Poli Umum</option>
                    <option value="Poli Gigi">Poli Gigi</option>
                    <option value="Poli KIA / KB">Poli KIA / KB</option>
                    <option value="UGD / Emergency">UGD / Emergency</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleConfirmOverride}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-700 transition shadow cursor-pointer"
                >
                  SIMPAN & TETAPKAN ANTREAN
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}