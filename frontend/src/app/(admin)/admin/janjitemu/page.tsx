"use client";

import { useEffect, useState } from "react";

interface JanjiTemuItem {
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
  tanggal?: string;
  tanggal_kunjungan?: string;
  poli?: string;
  tujuan_kunjungan?: string;
  final_service?: string;
}

export default function JanjiTemuPage() {
  const [list, setList] = useState<JanjiTemuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoli, setSelectedPoli] = useState("Semua Poli");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selectedItem, setSelectedItem] = useState<JanjiTemuItem | null>(null);

  const [formValidasi, setFormValidasi] = useState({
    final_service: "Konsultasi",
    poli: "Poli Umum",
    is_override: false
  });

  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const getJanjiTemuList = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("http://localhost:5000/api/antrian", { headers });

      if (res.ok) {
        const data = await res.json();
        // Filter khusus pendaftaran yang memiliki tanggal kunjungan LEWAT HARI INI (> todayStr) atau berstatus janji temu
        const futureItems = (Array.isArray(data) ? data : []).filter((item) => {
          const tgl = (item.tanggal_kunjungan || item.tanggal || "").split("T")[0];
          const isJanji = (item.janji_temu || "").toLowerCase() === "ya";
          return (tgl > todayStr) || (isJanji && tgl !== todayStr);
        });
        setList(futureItems);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getJanjiTemuList();
    const interval = setInterval(getJanjiTemuList, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = (item: JanjiTemuItem) => {
    setSelectedItem(item);
    setFormValidasi({
      final_service: item.final_service || item.rekomendasi_pelayanan || item.hasil_klasifikasi || "Konsultasi",
      poli: item.poli || item.tujuan_kunjungan || "Poli Umum",
      is_override: false
    });
  };

  const handleConfirmVerifikasi = async (isOverride: boolean) => {
    if (!selectedItem) return;
    try {
      const token = localStorage.getItem("token");
      const targetService = isOverride ? formValidasi.final_service : (selectedItem.rekomendasi_pelayanan || selectedItem.hasil_klasifikasi || "Konsultasi");
      const targetPoli = isOverride ? formValidasi.poli : (selectedItem.poli || selectedItem.tujuan_kunjungan || "Poli Umum");

      const res = await fetch(`http://localhost:5000/api/antrian/${selectedItem.id_antrian}/verifikasi`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          final_service: targetService,
          poli: targetPoli,
          is_override: isOverride
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Gagal verifikasi janji temu");
        return;
      }

      alert(`Janji Temu Berhasil Diverifikasi!\nNomor Antrean Khusus Diterbitkan: ${data.nomor_antrian}`);
      setSelectedItem(null);
      getJanjiTemuList();
    } catch (err) {
      console.log(err);
      alert("Terjadi kesalahan server");
    }
  };

  const handleDeleteAntrian = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan / menghapus janji temu ini?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/antrian/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) getJanjiTemuList();
    } catch (err) {
      console.log(err);
    }
  };

  const filteredList = list.filter((item) => {
    // Filter tanggal
    if (filterTanggal) {
      const tglItem = (item.tanggal_kunjungan || item.tanggal || "").split("T")[0];
      if (tglItem !== filterTanggal) return false;
    }

    // Filter status
    if (statusFilter === "Menunggu Verifikasi") {
      const isPending = (item.status || "").toLowerCase().includes("verifikasi") || item.nomor_antrian === "PENDING";
      if (!isPending) return false;
    } else if (statusFilter === "Terverifikasi") {
      const isPending = (item.status || "").toLowerCase().includes("verifikasi") || item.nomor_antrian === "PENDING";
      if (isPending) return false;
    }

    // Filter poli
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
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              📅 Janji Temu & Pendaftaran Kunjungan Mendatang
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm">
              {list.length} Janji Temu Terjadwal
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Daftar khusus pendaftaran pasien dengan tanggal kunjungan mendatang (terpisah mandiri dari antrean aktif hari ini).
          </p>
        </div>

        {/* Kontrol Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold text-gray-500 pl-2">Filter Tanggal:</span>
            <input
              type="date"
              value={filterTanggal}
              onChange={(e) => setFilterTanggal(e.target.value)}
              className="rounded-lg border border-gray-300 p-1.5 text-xs font-semibold dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            />
            {filterTanggal && (
              <button onClick={() => setFilterTanggal("")} className="text-xs text-red-500 font-bold px-1 hover:underline">
                ✕ Reset
              </button>
            )}
          </div>

          <select
            className="rounded-xl border border-gray-300 p-2.5 text-xs font-semibold dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Semua Status">Semua Status (Pending & Terverifikasi)</option>
            <option value="Menunggu Verifikasi">⏳ Menunggu Verifikasi</option>
            <option value="Terverifikasi">✓ Terverifikasi</option>
          </select>

          <select
            className="rounded-xl border border-gray-300 p-2.5 text-xs font-semibold dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={selectedPoli}
            onChange={(e) => setSelectedPoli(e.target.value)}
          >
            <option value="Semua Poli">Semua Poli</option>
            <option value="Poli Umum">Poli Umum</option>
            <option value="Poli Gigi">Poli Gigi</option>
            <option value="Poli KIA / KB">Poli KIA / KB</option>
            <option value="Laboratorium">Laboratorium</option>
            <option value="UGD">UGD / Emergency</option>
          </select>
        </div>
      </div>

      {/* Info Banner Khusus */}
      <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗓️</span>
          <div>
            <h4 className="font-bold text-sm">Halaman Khusus Janji Temu Mendatang</h4>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
              Pendaftaran di halaman ini berstatus janji temu untuk tanggal yang belum tiba. Penomoran antrean (`UM-001`, `GI-001`, dll.) dihitung otomatis per tanggal kunjungan pasien.
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Utama Janji Temu */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200 uppercase text-[11px] font-bold border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="p-3.5">ID</th>
              <th className="p-3.5">📅 Rencana Tanggal Kunjungan</th>
              <th className="p-3.5">Nama Pasien (NIK)</th>
              <th className="p-3.5">Poli & Keluhan</th>
              <th className="p-3.5 bg-teal-50/50 dark:bg-teal-950/30">Rekomendasi ML Decision Tree</th>
              <th className="p-3.5">Nomor / Status Antrean</th>
              <th className="p-3.5 text-center">Aksi Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">
                  Memuat data janji temu mendatang...
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">
                  Tidak ada janji temu mendatang yang terdaftar.
                </td>
              </tr>
            ) : (
              filteredList.map((item, index) => {
                const isPending = (item.status || "").toLowerCase().includes("verifikasi") || item.nomor_antrian === "PENDING";
                const confidenceVal = item.confidence || item.tingkat_keyakinan || 92;

                return (
                  <tr key={item.id_antrian ? `janjitemu-${item.id_antrian}-${index}` : `janjitemu-${index}`} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition">
                    <td className="p-3.5 font-extrabold text-gray-900 dark:text-white">#{item.id_antrian}</td>

                    {/* Tanggal Kunjungan */}
                    <td className="p-3.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 font-extrabold text-xs">
                        <span>📅</span>
                        <span>{formatDateIndo(item.tanggal_kunjungan || item.tanggal)}</span>
                      </div>
                    </td>

                    {/* Pasien & NIK */}
                    <td className="p-3.5">
                      <p className="font-bold text-gray-900 dark:text-white">{item.nama_pasien || "Pasien"}</p>
                      <p className="text-[11px] text-gray-500 font-mono">NIK: {item.nik || "-"}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        Janji Temu (Terjadwal)
                      </span>
                    </td>

                    {/* Poli & Keluhan */}
                    <td className="p-3.5">
                      <span className="font-extrabold text-teal-700 dark:text-teal-300 block">
                        {item.poli || item.tujuan_kunjungan || "Poli Umum"}
                      </span>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {item.kategori_keluhan}
                      </p>
                    </td>

                    {/* ML Decision Tree */}
                    <td className="p-3.5 bg-teal-50/30 dark:bg-teal-950/20">
                      <span className="font-bold text-teal-800 dark:text-teal-300 block text-xs">
                        {item.rekomendasi_pelayanan || item.hasil_klasifikasi || "Konsultasi"}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">Confidence: {confidenceVal}%</span>
                    </td>

                    {/* Status / Nomor */}
                    <td className="p-3.5">
                      {isPending ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase">
                          ⏳ PENDING VERIFIKASI
                        </span>
                      ) : (
                        <div>
                          <span className="px-2.5 py-1 rounded text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            {item.nomor_antrian}
                          </span>
                          <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">{item.status}</p>
                        </div>
                      )}
                    </td>

                    {/* Aksi Admin */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition cursor-pointer"
                        >
                          {isPending ? "✓ Verifikasi Janji" : "Edit Status"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Verifikasi Janji Temu */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Verifikasi Janji Temu Pasien
                </h3>
                <p className="text-xs text-gray-500">Pasien: <strong>{selectedItem.nama_pasien}</strong></p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
              <span className="font-bold text-indigo-900 dark:text-indigo-200">📅 Rencana Tanggal Kunjungan:</span>
              <p className="text-sm font-extrabold text-indigo-800 dark:text-indigo-300">
                {formatDateIndo(selectedItem.tanggal_kunjungan || selectedItem.tanggal)}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs font-bold">
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700">Batal</button>
              <button onClick={() => handleConfirmVerifikasi(false)} className="px-5 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700">
                ✓ Sahkan Janji Temu & Terbitkan Nomor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
