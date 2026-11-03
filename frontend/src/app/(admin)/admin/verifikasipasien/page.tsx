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

export default function VerifikasiPasienPage() {
  const [list, setList] = useState<PendaftaranItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PendaftaranItem | null>(null);
  const [isPriorityMode, setIsPriorityMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Menunggu Verifikasi");
  const [selectedPoli, setSelectedPoli] = useState("Semua Poli");

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
    const interval = setInterval(getPendaftaran, 2500);
    return () => clearInterval(interval);
  }, [isPriorityMode]);

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

      const modeText = isOverride ? "OVERRIDE PETUGAS" : "TERIMA REKOMENDASI ML";
      alert(`Verifikasi Berhasil (${modeText})!\nNomor Antrean Resmi diterbitkan: ${data.nomor_antrian}`);
      setSelectedItem(null);
      getPendaftaran();
    } catch (err) {
      console.log(err);
      alert("Terjadi kesalahan pada server");
    }
  };

  const handleDeleteAntrian = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data pendaftaran antrean ini?")) {
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

  const pendingCount = list.filter(i => (i.status || "").toLowerCase().includes("verifikasi") || i.nomor_antrian === "PENDING").length;

  const filteredList = list.filter((item) => {
    // Filter status
    const itemStatus = (item.status || "").toLowerCase();
    const isPending = itemStatus.includes("verifikasi") || item.nomor_antrian === "PENDING";

    if (statusFilter === "Menunggu Verifikasi" && !isPending) {
      return false;
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
              Verifikasi Pendaftaran Pasien
            </h1>
            {pendingCount > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {pendingCount} Pending Verifikasi
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Verifikasi rekomendasi algoritma Decision Tree ML, tentukan pelayanan akhir, dan terbitkan nomor antrean resmi pasien.
          </p>
        </div>

        {/* Kontrol Filter & Mode Prioritas */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs font-bold text-amber-900 dark:text-amber-300 dark:border-amber-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Menunggu Verifikasi">⏳ Khusus Pending Verifikasi Admin ({pendingCount})</option>
            <option value="Semua Status">📋 Semua Pendaftaran Pasien ({list.length})</option>
          </select>

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

      {/* Warning Box jika ada pasien pending */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-lg text-lg">
            ⏳
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">
              Ada {pendingCount} Pasien Menunggu Verifikasi Pendaftaran
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
              Pasien-pasien di bawah ini telah diproses oleh algoritma Decision Tree ML. Nomor antrean dan E-Tiket mereka ditahan sampai Anda menekan tombol <strong>"Verifikasi Pasien"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Tabel Utama Pendaftaran */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 uppercase text-[11px] font-bold border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="p-3.5">ID / Waktu</th>
              <th className="p-3.5">Pasien (NIK)</th>
              <th className="p-3.5">Poli & Keluhan</th>
              <th className="p-3.5 bg-teal-50/50 dark:bg-teal-950/30">Prediksi Decision Tree ML</th>
              <th className="p-3.5">Status Tiket</th>
              <th className="p-3.5 text-center">Aksi Verifikasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">
                  Memuat data pendaftaran pasien...
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">
                  {statusFilter === "Menunggu Verifikasi"
                    ? "Tidak ada pasien yang menunggu verifikasi admin."
                    : "Tidak ada data pendaftaran pasien."}
                </td>
              </tr>
            ) : (
              filteredList.map((item, index) => {
                const isPending = (item.status || "").toLowerCase().includes("verifikasi") || item.nomor_antrian === "PENDING";
                const confidenceVal = item.confidence || item.tingkat_keyakinan || 92;

                return (
                  <tr
                    key={item.id_antrian ? `verifikasi-${item.id_antrian}-${index}` : `verifikasi-${index}`}
                    className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition ${isPending ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
                      }`}
                  >
                    {/* ID & Waktu */}
                    <td className="p-3.5">
                      <span className="font-bold text-gray-900 dark:text-white">#{item.id_antrian}</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {item.waktu_daftar ? new Date(item.waktu_daftar).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </p>
                    </td>

                    {/* Pasien & NIK */}
                    <td className="p-3.5">
                      <p className="font-bold text-gray-900 dark:text-white">{item.nama_pasien || "Pasien"}</p>
                      <p className="text-[11px] text-gray-500 font-mono">NIK: {item.nik || "-"}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {item.jenis_kunjungan || "Lama"}
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

                    {/* Prediksi ML Decision Tree */}
                    <td className="p-3.5 bg-teal-50/30 dark:bg-teal-950/20">
                      <div className="space-y-1">
                        <span className="font-bold text-teal-800 dark:text-teal-300 block text-xs">
                          {item.rekomendasi_pelayanan || item.hasil_klasifikasi || "Konsultasi"}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-gray-500">Keyakinan:</span>
                          <span className="font-bold text-teal-700 dark:text-teal-400">{confidenceVal}%</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Tiket */}
                    <td className="p-3.5">
                      {isPending ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase">
                          ⏳ PENDING VERIFIKASI
                        </span>
                      ) : (
                        <div>
                          <span className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            {item.nomor_antrian}
                          </span>
                          <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">{item.status}</p>
                        </div>
                      )}
                    </td>

                    {/* Aksi Verifikasi */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${isPending
                            ? "bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-200 dark:shadow-none"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                        >
                          {isPending ? "✓ Verifikasi Pasien" : "Edit Verifikasi"}
                        </button>

                        <button
                          onClick={() => handleDeleteAntrian(item.id_antrian)}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                          title="Hapus Antrean"
                        >
                          🗑️ Hapus
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

      {/* MODAL VERIFIKASI ADMIN & PENETAPAN NOMOR ANTREAN RESMI */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-5">
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Form Verifikasi Pendaftaran Admin
                </h3>
                <p className="text-xs text-gray-500">Pasien: <strong className="text-teal-700 dark:text-teal-400">{selectedItem.nama_pasien}</strong> (NIK: {selectedItem.nik || "-"})</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Rekomendasi ML Decision Tree */}
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-teal-900 dark:text-teal-200 uppercase">🤖 Output ML Decision Tree:</span>
                <span className="px-2 py-0.5 rounded bg-teal-200 text-teal-800 dark:bg-teal-900 dark:text-teal-200 font-extrabold text-[11px]">
                  Confidence: {selectedItem.confidence || selectedItem.tingkat_keyakinan || 92}%
                </span>
              </div>
              <p className="text-sm font-extrabold text-teal-800 dark:text-teal-300">
                {selectedItem.rekomendasi_pelayanan || selectedItem.hasil_klasifikasi || "Konsultasi"}
              </p>
              <div className="pt-2 border-t border-teal-200 dark:border-teal-800 grid grid-cols-2 gap-2 text-gray-700 dark:text-gray-300">
                <div>
                  <span className="text-gray-500">Poli Pilihan Pasien:</span>
                  <p className="font-bold">{selectedItem.poli || selectedItem.tujuan_kunjungan || "Poli Umum"}</p>
                </div>
                <div>
                  <span className="text-gray-500">Keluhan Utama:</span>
                  <p className="font-semibold">{selectedItem.kategori_keluhan}</p>
                </div>
              </div>
            </div>

            {/* Pilihan Opsi Verifikasi */}
            <div className="space-y-4 text-xs font-medium">
              <label className="block font-bold text-gray-800 dark:text-gray-200">
                Tindakan Admin:
              </label>

              <div className="space-y-3">
                {/* Opsi Terima ML */}
                <div
                  onClick={() => setFormValidasi({ ...formValidasi, is_override: false })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${!formValidasi.is_override
                    ? "bg-teal-50/80 border-teal-500 dark:bg-teal-950/60 dark:border-teal-400"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                    }`}
                >
                  <input
                    type="radio"
                    checked={!formValidasi.is_override}
                    onChange={() => setFormValidasi({ ...formValidasi, is_override: false })}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      1. Terima Rekomendasi ML Decision Tree & Terbitkan Nomor Antrean
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Menyetujui rekomendasi <strong>{selectedItem.rekomendasi_pelayanan || selectedItem.hasil_klasifikasi || "Konsultasi"}</strong> di <strong>{selectedItem.poli || selectedItem.tujuan_kunjungan || "Poli Umum"}</strong>.
                    </p>
                  </div>
                </div>

                {/* Opsi Override Manual */}
                <div
                  onClick={() => setFormValidasi({ ...formValidasi, is_override: true })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${formValidasi.is_override
                    ? "bg-orange-50/80 border-orange-500 dark:bg-orange-950/60 dark:border-orange-400"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                    }`}
                >
                  <input
                    type="radio"
                    checked={formValidasi.is_override}
                    onChange={() => setFormValidasi({ ...formValidasi, is_override: true })}
                    className="mt-0.5"
                  />
                  <div className="w-full">
                    <p className="font-bold text-gray-900 dark:text-white">
                      2. Override Keputusan (Ubah Poli / Pelayanan Manual)
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Ubah poli atau pelayanan jika secara klinis memerlukan penanganan khusus yang berbeda dari rekomendasi ML.
                    </p>

                    {formValidasi.is_override && (
                      <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Poli Tujuan Baru:
                          </label>
                          <select
                            className="w-full rounded-lg border border-gray-300 p-2 text-xs font-semibold dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={formValidasi.poli}
                            onChange={(e) => setFormValidasi({ ...formValidasi, poli: e.target.value })}
                          >
                            <option value="Poli Umum">Poli Umum (UM-)</option>
                            <option value="Poli Gigi">Poli Gigi (GI-)</option>
                            <option value="Poli KIA/KB">Poli KIA/KB (KIA-)</option>
                            <option value="Laboratorium">Laboratorium (LAB-)</option>
                            <option value="UGD">UGD / Emergency (UGD-)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Jenis Pelayanan Akhir:
                          </label>
                          <select
                            className="w-full rounded-lg border border-gray-300 p-2 text-xs font-semibold dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={formValidasi.final_service}
                            onChange={(e) => setFormValidasi({ ...formValidasi, final_service: e.target.value })}
                          >
                            <option value="Konsultasi">Konsultasi Biasa</option>
                            <option value="Konsultasi + Pemeriksaan Medis">Konsultasi + Pemeriksaan</option>
                            <option value="Konsultasi + Tindakan Medis">Konsultasi + Tindakan Medis</option>
                            <option value="Pemeriksaan Laboratorium">Pemeriksaan Laboratorium</option>
                            <option value="Penanganan UGD Emergency">Penanganan UGD Emergency</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Aksi Verifikasi */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs font-bold">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
              >
                Batal
              </button>

              <button
                onClick={formValidasi.is_override ? handleConfirmOverride : handleConfirmAccept}
                className="px-5 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition shadow-md cursor-pointer"
              >
                ✓ Sahkan & Terbitkan Nomor Antrean
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
