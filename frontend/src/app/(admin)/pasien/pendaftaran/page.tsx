"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfilPasien {
  id_pasien: number;
  nama_pasien?: string;
  nama?: string;
  nik?: string;
  umur?: number;
  jenis_kelamin?: string;
}

export default function PendaftaranPage() {
  const router = useRouter();
  const [profil, setProfil] = useState<ProfilPasien | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [rekomendasiPelayanan, setRekomendasiPelayanan] = useState("Konsultasi");
  const [rekomendasiPoli, setRekomendasiPoli] = useState("Poli Umum");
  const [nomorAntrian, setNomorAntrian] = useState("UM-001");
  const [confidence, setConfidence] = useState<number | string>(92);
  const [prioritas, setPrioritas] = useState<number>(4);
  const [statusVerifikasi, setStatusVerifikasi] = useState("Menunggu");
  const [tanggalKunjungan, setTanggalKunjungan] = useState("");

  const [form, setForm] = useState({
    tanggal_kunjungan: new Date().toISOString().split("T")[0],
    poli_tujuan: "Poli Umum",
    jenis_kunjungan: "Kontrol",
    status_pasien: "Lama",
    kategori_keluhan: "",
    rujukan: "Tidak",
    janji_temu: "Tidak",
  });

  useEffect(() => {
    getProfil();
  }, []);

  const getProfil = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/pasien/profil/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProfil(data);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!form.kategori_keluhan || !form.kategori_keluhan.trim()) {
        alert("Harap tuliskan Keluhan Utama Anda terlebih dahulu.");
        return;
      }

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/antrian", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_pasien: profil?.id_pasien || 1,
          tanggal_kunjungan: form.tanggal_kunjungan,
          poli_tujuan: form.poli_tujuan,
          jenis_kunjungan: form.jenis_kunjungan,
          status_pasien: form.status_pasien,
          kategori_keluhan: form.kategori_keluhan,
          rujukan: form.rujukan,
          janji_temu: form.janji_temu,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal melakukan pendaftaran antrian");
      }

      setRekomendasiPelayanan(data.rekomendasi_pelayanan || data.hasil_klasifikasi || "Konsultasi");
      setRekomendasiPoli(data.poli || data.tujuan_kunjungan || "Poli Umum");
      setNomorAntrian(data.nomor_antrian || "UM-001");
      setConfidence(data.confidence || data.tingkat_keyakinan || 92);
      setPrioritas(data.prioritas || 4);
      setStatusVerifikasi(data.status || "Menunggu");
      setTanggalKunjungan(form.tanggal_kunjungan);
      setShowSuccessModal(true);
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat pendaftaran antrian");
    }
  };

  return (
    <div className="max-w-3xl mx-auto rounded-2xl bg-white p-7 shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800 space-y-6">
      <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          Form Pendaftaran Antrean Pasien
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          Silakan isi data kunjungan Anda. Sistem Machine Learning Decision Tree akan mengklasifikasikan rekomendasi pelayanan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-medium">
        {/* Nama & NIK Pasien */}
        <div>
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Nama Pasien
          </label>
          <input
            value={profil?.nama_pasien || profil?.nama || "Pasien"}
            readOnly
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            NIK Pasien
          </label>
          <input
            value={profil?.nik || "-"}
            readOnly
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        {/* Tanggal Kunjungan */}
        <div>
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Tanggal Kunjungan
          </label>
          <div className="relative">
            <input
              id="tanggal_kunjungan_input"
              type="date"
              min={new Date().toISOString().split("T")[0]}
              onClick={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker();
                } catch (err) { }
              }}
              className="w-full cursor-pointer rounded-xl border border-gray-300 p-3 pr-10 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-teal-500"
              value={form.tanggal_kunjungan}
              onChange={(e) => setForm({ ...form, tanggal_kunjungan: e.target.value })}
            />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("tanggal_kunjungan_input") as HTMLInputElement;
                if (el) {
                  try {
                    el.showPicker();
                  } catch (err) { }
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 dark:text-teal-400 hover:text-teal-700 p-1 cursor-pointer"
              title="Buka Kalender"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Poli Tujuan (Dipilih Manual oleh Pasien) */}
        <div>
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Poli Tujuan
          </label>
          <select
            className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-teal-500 font-semibold"
            value={form.poli_tujuan}
            onChange={(e) => setForm({ ...form, poli_tujuan: e.target.value })}
          >
            <option value="Poli Umum">Poli Umum</option>
            <option value="Poli Gigi">Poli Gigi</option>
            <option value="Poli KIA/KB">Poli KIA / KB</option>
            <option value="Laboratorium">Laboratorium</option>
            <option value="UGD">UGD / Emergency</option>
          </select>
        </div>

        {/* Jenis Kunjungan */}
        <div>
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Jenis Kunjungan
          </label>
          <select
            className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-teal-500"
            value={form.jenis_kunjungan}
            onChange={(e) => setForm({ ...form, jenis_kunjungan: e.target.value })}
          >
            <option value="Kontrol">Kontrol</option>
            <option value="Baru">Baru</option>
          </select>
        </div>

        {/* Status Pasien */}
        <div>
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Status Pasien
          </label>
          <select
            className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-teal-500"
            value={form.status_pasien}
            onChange={(e) => setForm({ ...form, status_pasien: e.target.value })}
          >
            <option value="Lama">Lama</option>
            <option value="Baru">Baru</option>
          </select>
        </div>

        {/* Keluhan Utama (Input Teks Bebas) */}
        <div>
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Keluhan Utama Pasien
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-teal-500 font-medium placeholder-gray-400"
            placeholder="Tuliskan keluhan yang Anda rasakan (contoh: Darah tinggi, Luka, Flu, Gatal, dll.)"
            value={form.kategori_keluhan}
            onChange={(e) => setForm({ ...form, kategori_keluhan: e.target.value })}
            required
          />
        </div>

        {/* Memiliki Rujukan? */}
        <div>
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Memiliki Surat Rujukan?
          </label>
          <select
            className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-teal-500"
            value={form.rujukan}
            onChange={(e) => setForm({ ...form, rujukan: e.target.value })}
          >
            <option value="Tidak">Tidak</option>
            <option value="Ya">Ya</option>
          </select>
        </div>

        {/* Janji Temu? */}
        <div>
          <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Memiliki Janji Temu Sebelumnya?
          </label>
          <select
            className="w-full rounded-xl border border-gray-300 p-3 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-teal-500"
            value={form.janji_temu}
            onChange={(e) => setForm({ ...form, janji_temu: e.target.value })}
          >
            <option value="Tidak">Tidak</option>
            <option value="Ya">Ya</option>
          </select>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={handleSubmit}
          className="rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 transition shadow-sm text-sm cursor-pointer"
        >
          Daftar ➔
        </button>
      </div>

      {/* MODAL HASIL ANALISIS DECISION TREE */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">

            <div className="text-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 uppercase tracking-wide">
                ⏳ Menunggu Verifikasi Admin
              </span>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white uppercase mt-2">
                PENDAFTARAN DIPROSES
              </h2>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-0.5">Rekomendasi Pelayanan Diprediksi oleh Decision Tree ML</p>
            </div>

            <div className="space-y-3 rounded-xl bg-amber-50/80 p-4 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
              <div className="text-center pb-2 border-b border-amber-200 dark:border-amber-800">
                <p className="text-gray-500 font-semibold uppercase text-[10px]">Status Nomor Antrean Anda:</p>
                <p className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-1">
                  PENDING (Menunggu Verifikasi Admin)
                </p>
              </div>

              <div>
                <p className="text-gray-500 font-semibold uppercase">Poli Tujuan:</p>
                <p className="text-base font-bold text-teal-800 dark:text-teal-300 mt-0.5">
                  {rekomendasiPoli}
                </p>
              </div>

              <div className="border-t border-amber-200 dark:border-amber-800 pt-2">
                <p className="text-gray-500 font-semibold uppercase">Rekomendasi Pelayanan ML:</p>
                <p className="text-base font-bold text-gray-800 dark:text-white mt-0.5">
                  {rekomendasiPelayanan}
                </p>
              </div>

              <div className="border-t border-amber-200 dark:border-amber-800 pt-2">
                <p className="text-gray-500 font-semibold uppercase">Tingkat Keyakinan ML:</p>
                <p className="text-sm font-bold text-teal-700 dark:text-teal-400 mt-0.5">
                  {confidence}%
                </p>
              </div>

              <div className="border-t border-amber-200 dark:border-amber-800 pt-2 flex justify-between items-center">
                <div>
                  <p className="text-gray-500 font-semibold uppercase">Prioritas Layanan Medis:</p>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">Aturan Baku Database Puskesmas</p>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-xs font-black ${prioritas === 1 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200" :
                    prioritas === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-200" :
                      prioritas === 3 ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200" :
                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200"
                  }`}>
                  Prioritas {prioritas}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <p className="font-semibold text-center">ℹ️ Informasi Verifikasi Admin:</p>
              <p className="text-[11px] text-center">
                Pendaftaran Anda telah berhasil diproses oleh algoritma Decision Tree. Status antrean saat ini <strong>ditahan (Pending)</strong> menunggu verifikasi Petugas Admin. Setelah diverifikasi, Nomor Antrean Resmi dan E-Tiket Anda akan diterbitkan serta tombol Cek-In akan diaktifkan.
              </p>
            </div>

            <div className="flex gap-2 pt-2 text-xs font-semibold">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 rounded-xl border border-gray-300 py-3 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
              >
                Tutup
              </button>

              <button
                onClick={() => router.push("/pasien/statusantrian")}
                className="flex-1 rounded-xl bg-teal-600 py-3 text-white hover:bg-teal-700 transition"
              >
                Cek Status Antrean ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}