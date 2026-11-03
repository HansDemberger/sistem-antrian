"use client";

import { useEffect, useState } from "react";

interface ItemAntrian {
  id_antrian: number;
  nomor_antrian: string;
  no_panggilan?: number;
  nama_pasien: string;
  nik?: string;
  jenis_kunjungan: string;
  kategori_keluhan: string;
  poli?: string;
  tujuan_kunjungan?: string;
  final_service?: string;
  hasil_klasifikasi?: string;
  prioritas?: number;
  is_priority_active?: number;
  status: string;
  waktu_daftar: string;
}

export default function KelolaAntrianPage() {
  const [antrianList, setAntrianList] = useState<ItemAntrian[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoli, setSelectedPoli] = useState("Semua Poli");
  const [isPriorityMode, setIsPriorityMode] = useState(false);

  const getAntrian = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("http://localhost:5000/api/antrian", { headers });

      if (res.ok) {
        const data = await res.json();
        setAntrianList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAntrian();
    const interval = setInterval(getAntrian, 2000);
    return () => clearInterval(interval);
  }, []);

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
        getAntrian();
      } else {
        const data = await res.json();
        alert(data.message || "Gagal mengupdate status prioritas");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleUpdateStatus = async (id: number, targetStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/antrian/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (res.ok) {
        getAntrian();
      } else {
        const data = await res.json();
        alert(data.message || "Gagal mengupdate status");
      }
    } catch (err) {
      console.log(err);
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
        getAntrian();
      } else {
        const data = await res.json();
        alert(data.message || "Gagal menghapus antrean");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const filteredList = antrianList.filter((item) => {
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
            Pengelolaan Antrean Pasien Per-Poli
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau dan kelola antrean pasien berdasarkan Kode Poli (UM, GI, KIA, LAB, UGD) secara terpisah.
          </p>
        </div>

        {/* Kontrol Filter & Mode Urutan Prioritas */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPriorityMode(!isPriorityMode)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm border ${isPriorityMode
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
              {antrianList.length}
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
              {antrianList.filter(i => (i.poli || i.tujuan_kunjungan || "").toLowerCase().includes("umum")).length}
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
              {antrianList.filter(i => (i.poli || i.tujuan_kunjungan || "").toLowerCase().includes("gigi")).length}
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
              {antrianList.filter(i => {
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
              {antrianList.filter(i => (i.poli || i.tujuan_kunjungan || "").toLowerCase().includes("lab")).length}
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
              {antrianList.filter(i => {
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
        <div className="py-12 text-center text-sm text-slate-500">Memuat data antrean...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="py-3.5 px-4">No. Panggilan</th>
                <th className="py-3.5 px-4">No. Antrean</th>
                <th className="py-3.5 px-4">Prioritas Medis</th>
                <th className="py-3.5 px-4">Pasien & Keluhan</th>
                <th className="py-3.5 px-4">Poli Tujuan</th>
                <th className="py-3.5 px-4">Rekomendasi ML</th>
                <th className="py-3.5 px-4">Pelayanan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredList.map((item, index) => (
                <tr key={item.id_antrian ? `kelola-${item.id_antrian}-${index}` : `kelola-${index}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Nomor Panggilan (Posisi Urutan Panggilan Baru Per-Poli) */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
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
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200/80 dark:border-blue-800 whitespace-nowrap inline-block tracking-wider">
                      {item.nomor_antrian}
                    </span>
                  </td>

                  {/* Prioritas Medis */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${item.prioritas === 1 ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/80" :
                      item.prioritas === 2 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80" :
                        item.prioritas === 3 ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80" :
                          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200"
                      }`}>
                      {item.prioritas === 1 ? "P1 (Konsultasi + Tindakan)" :
                        item.prioritas === 2 ? "P2 (Konsultasi + Pemeriksaan)" :
                          item.prioritas === 3 ? "P3 (Laboratorium)" :
                            "P4 (Konsultasi)"}
                    </span>
                  </td>

                  {/* Pasien & Keluhan */}
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block">
                      {item.nama_pasien || "Pasien"}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      Keluhan: {item.kategori_keluhan}
                    </span>
                  </td>

                  {/* Poli Tujuan */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70">
                      {item.poli || item.tujuan_kunjungan || "Poli Umum"}
                    </span>
                  </td>

                  {/* Rekomendasi Decision Tree ML */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/70">
                      {item.hasil_klasifikasi || "Konsultasi"}
                    </span>
                  </td>

                  {/* Pelayanan Aktual */}
                  <td className="py-3.5 px-4">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium block">
                      {item.final_service || item.hasil_klasifikasi || "Konsultasi"}
                    </span>
                  </td>

                  {/* Status Antrean */}
                  <td className="py-3.5 px-4">
                    {(item.status === "ACTIVE QUEUE" || item.status === "Antrean Aktif") && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                        Antrean Aktif
                      </span>
                    )}
                    {(item.status === "BOOKED" || item.status === "Terpesan") && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Terpesan
                      </span>
                    )}
                    {(item.status === "Dipanggil" || item.status === "DIPANGGIL") && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500 text-white">
                        Dipanggil
                      </span>
                    )}
                    {(item.status === "Selesai" || item.status === "COMPLETED" || item.status === "SELESAI") && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Selesai
                      </span>
                    )}
                    {(item.status === "NO-SHOW" || item.status === "Tidak Hadir") && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Tidak Hadir
                      </span>
                    )}
                    {(item.status === "Menunggu" || item.status === "Menunggu Verifikasi") && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        Menunggu
                      </span>
                    )}
                  </td>

                  {/* Aksi Manajemen Antrean (Tombol Minimalis) */}
                  <td className="py-3.5 px-4 text-center space-x-1.5 whitespace-nowrap">
                    {/* Tombol Aktifkan Prioritas: Warna MERAH jika Aktif, Warna BIASA jika Tidak Aktif */}
                    <button
                      onClick={() => handleTogglePriority(item.id_antrian, item.is_priority_active)}
                      title={
                        (item.is_priority_active || 0) > 0
                          ? `Prioritas Aktif (#${index + 1} Panggilan). Klik untuk menonaktifkan.`
                          : "Klik untuk mengaktifkan prioritas agar pasien dipanggil lebih awal"
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer ${(item.is_priority_active || 0) > 0
                        ? "bg-red-600 text-white border-red-700 shadow-sm hover:bg-red-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                    >
                      {(item.is_priority_active || 0) > 0 ? `⚡ Prioritas Aktif (#${index + 1})` : "⚡ Aktifkan Prioritas"}
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(item.id_antrian, "Dipanggil")}
                      disabled={item.status === "Dipanggil" || item.status === "Selesai" || item.status === "COMPLETED" || item.status === "NO-SHOW"}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition disabled:opacity-40 cursor-pointer"
                    >
                      Panggil
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(item.id_antrian, "Selesai")}
                      disabled={item.status === "Selesai" || item.status === "COMPLETED" || item.status === "NO-SHOW"}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-40 cursor-pointer"
                    >
                      Selesai
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(item.id_antrian, "NO-SHOW")}
                      disabled={item.status === "Selesai" || item.status === "COMPLETED" || item.status === "NO-SHOW"}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-40 cursor-pointer"
                    >
                      Tidak Hadir
                    </button>

                    <button
                      onClick={() => handleDeleteAntrian(item.id_antrian)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-red-100 text-red-800 hover:bg-red-200 border border-red-300 transition cursor-pointer"
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
    </div>
  );
}