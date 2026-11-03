"use client";

import { useEffect, useState } from "react";

interface Antrian {
  id_antrian: number;
  nomor_antrian: string;
  nama_pasien: string;
  nama?: string;
  nik?: string;
  jenis_kunjungan: string;
  tujuan_kunjungan: string;
  kategori_keluhan: string;
  keluhan?: string;
  rujukan: string;
  janji_temu: string;
  hasil_klasifikasi: string;
  kebutuhan_pelayanan?: string;
  tingkat_keyakinan: number;
  prioritas?: number;
  status: string;
  waktu_daftar: string;
}

const sortAntrianList = (items: Antrian[]) => {
  return [...items].sort((a, b) => b.id_antrian - a.id_antrian);
};

export default function AntrianPage() {
  const [antrian, setAntrian] = useState<Antrian[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAntrian();
    const interval = setInterval(getAntrian, 2000);
    return () => clearInterval(interval);
  }, []);

  const getAntrian = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("http://localhost:5000/api/antrian", {
        headers,
      });

      const data = await res.json();
      setAntrian(sortAntrianList(Array.isArray(data) ? data : []));
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const updateTujuan = async (id: number, tujuan: string) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:5000/api/antrian/${id}/tujuan`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tujuan_kunjungan: tujuan,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      alert(data.message);
      getAntrian();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Monitoring & Klasifikasi Antrean Pasien
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoring data medis antrean, hasil rekomendasi Machine Learning Decision Tree, dan penyesuaian Poli Tujuan.
          </p>
        </div>

        <a
          href="/admin/kelolahantrian"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition shadow whitespace-nowrap"
        >
          Buka Kelola Antrean (Eksekusi Real-Time) &rarr;
        </a>
      </div>

      {loading ? (
        <p className="text-gray-500 py-8 text-center">Memuat data antrean...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 text-left">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="border p-3 text-center">No</th>
                <th className="border p-3 text-center">Nomor Antrean</th>
                <th className="border p-3">Nama Pasien</th>
                <th className="border p-3">Jenis Kunjungan</th>
                <th className="border p-3">Kategori Keluhan</th>
                <th className="border p-3 text-center">Klasifikasi ML (Decision Tree)</th>
                <th className="border p-3 text-center">Keyakinan (Confidence)</th>
                <th className="border p-3">Poli Tujuan (Penyesuaian Rute)</th>
                <th className="border p-3 text-center">Status Antrean</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {!Array.isArray(antrian) || antrian.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    Belum ada data antrian pasien.
                  </td>
                </tr>
              ) : (
                antrian.map((item, index) => (
                  <tr key={item.id_antrian ? `antrian-${item.id_antrian}-${index}` : `antrian-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="border p-3 text-center text-gray-500">
                      {index + 1}
                    </td>

                    <td className="border p-3 font-extrabold text-center text-teal-700 dark:text-teal-400 text-base">
                      {item.nomor_antrian}
                    </td>

                    <td className="border p-3 font-bold text-gray-800 dark:text-white">
                      {item.nama_pasien || item.nama}
                    </td>

                    <td className="border p-3 text-gray-600 dark:text-gray-300">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 font-semibold dark:bg-gray-800 dark:text-gray-300">
                        {item.jenis_kunjungan || "Baru"}
                      </span>
                    </td>

                    <td className="border p-3 text-gray-600 dark:text-gray-300">
                      {item.kategori_keluhan || item.keluhan}
                    </td>

                    {/* KLASIFIKASI DECISION TREE */}
                    <td className="border p-3 text-center">
                      <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {item.hasil_klasifikasi || item.kebutuhan_pelayanan || "Poli Umum"}
                      </span>
                    </td>

                    <td className="border p-3 text-center text-xs font-bold text-teal-600">
                      {item.tingkat_keyakinan || 95}%
                    </td>

                    {/* TUJUAN KUNJUNGAN (Dapat Disesuaikan Admin) */}
                    <td className="border p-3">
                      <div className="flex gap-2">
                        <select
                          className="flex-1 rounded-lg border border-gray-300 p-1.5 text-xs dark:bg-gray-800 dark:text-white dark:border-gray-700 font-medium"
                          value={item.tujuan_kunjungan || item.hasil_klasifikasi || ""}
                          onChange={(e) => {
                            const copy = [...antrian];
                            copy[index].tujuan_kunjungan = e.target.value;
                            setAntrian(copy);
                          }}
                        >
                          <option value="Poli Umum">Poli Umum</option>
                          <option value="Poli Gigi">Poli Gigi</option>
                          <option value="KIA">Poli KIA / KB</option>
                          <option value="IGD">UGD / Emergency</option>
                        </select>

                        <button
                          onClick={() =>
                            updateTujuan(
                              item.id_antrian,
                              item.tujuan_kunjungan
                            )
                          }
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition cursor-pointer shadow"
                        >
                          Simpan
                        </button>
                      </div>
                    </td>

                    {/* STATUS ANTREAN */}
                    <td className="border p-3 text-center">
                      {(item.status === "Menunggu" || item.status === "Menunggu Verifikasi") && (
                        <span className="rounded-full bg-gray-500 px-3 py-1 text-xs font-semibold text-white">
                          Menunggu Verifikasi
                        </span>
                      )}
                      {(item.status === "Dipanggil" || item.status === "DIPANGGIL") && (
                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white animate-pulse">
                          Dipanggil
                        </span>
                      )}
                      {(item.status === "Selesai" || item.status === "COMPLETED" || item.status === "SELESAI") && (
                        <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                          Selesai
                        </span>
                      )}
                      {(item.status === "ACTIVE QUEUE" || item.status === "Antrean Aktif") && (
                        <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-bold text-white">
                          Antrean Aktif
                        </span>
                      )}
                      {(item.status === "BOOKED" || item.status === "Terpesan") && (
                        <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">
                          Terpesan
                        </span>
                      )}
                      {(item.status === "NO-SHOW" || item.status === "Tidak Hadir") && (
                        <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
                          Tidak Hadir
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}