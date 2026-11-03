"use client";

import { useEffect, useState } from "react";

interface Pasien {
  id_pasien: number;
  nik: string;
  nama_pasien: string;
  nama?: string;
  tanggal_lahir: string;
  jenis_kelamin: "L" | "P" | string;
  alamat: string;
  no_hp: string;
  umur?: number;
}

const initialFormData: Omit<Pasien, "id_pasien"> = {
  nik: "",
  nama_pasien: "",
  tanggal_lahir: "",
  jenis_kelamin: "L",
  alamat: "",
  no_hp: "",
};

export default function PasienPage() {
  const [pasienList, setPasienList] = useState<Pasien[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedPasienId, setSelectedPasienId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // State untuk Popup Modal "Buat Akun Pasien" oleh Admin
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountPasien, setAccountPasien] = useState<Pasien | null>(null);
  const [accountForm, setAccountForm] = useState({
    username: "",
    password: "",
  });
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  const fetchPasien = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/pasien", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Gagal mengambil data pasien");
      }

      const data = await res.json();
      setPasienList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
      setPasienList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasien();
  }, []);

  const handleOpenModal = (pasien?: Pasien) => {
    if (pasien) {
      setIsEdit(true);
      setSelectedPasienId(pasien.id_pasien);
      setFormData({
        nik: pasien.nik,
        nama_pasien: pasien.nama_pasien || pasien.nama || "",
        tanggal_lahir: pasien.tanggal_lahir ? new Date(pasien.tanggal_lahir).toISOString().split("T")[0] : "",
        jenis_kelamin: pasien.jenis_kelamin || "L",
        no_hp: pasien.no_hp || "",
        alamat: pasien.alamat || "",
      });
    } else {
      setIsEdit(false);
      setFormData(initialFormData);
      setSelectedPasienId(null);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Handler Buka Popup Modal "Buat Akun"
  const handleOpenAccountModal = (pasien: Pasien) => {
    setAccountPasien(pasien);
    setAccountForm({
      username: pasien.nik || "",
      password: "123",
    });
    setAccountModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = isEdit ? `http://localhost:5000/api/pasien/${selectedPasienId}` : "http://localhost:5000/api/pasien";
    const method = isEdit ? "PUT" : "POST";

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Gagal ${isEdit ? "mengubah" : "menambah"} data pasien`);
      }

      await fetchPasien();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Simpan Akun Pasien oleh Admin
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountPasien) return;

    if (!accountForm.username || !accountForm.password) {
      alert("Email/Username dan Password wajib diisi!");
      return;
    }

    try {
      setAccountSubmitting(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`http://localhost:5000/api/pasien/${accountPasien.id_pasien}/buat-akun`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: accountForm.username,
          password: accountForm.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal membuat akun pasien");
      }

      alert(data.message || `Akun pasien ${accountPasien.nama_pasien || accountPasien.nama} berhasil dibuat!`);
      setAccountModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat membuat akun pasien");
    } finally {
      setAccountSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Data Master Pasien</h1>
          <p className="text-sm text-gray-500">Kelola data medis & buat akun login pasien Puskesmas Pauh</p>
        </div>
        <button onClick={() => handleOpenModal()} className="rounded-xl bg-teal-600 px-5 py-2.5 font-bold text-white hover:bg-teal-700 transition shadow">
          + Tambah Pasien Baru
        </button>
      </div>

      {loading && <p className="text-gray-500">Memuat data pasien...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 text-sm text-left">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 uppercase text-xs">
              <tr>
                <th className="border p-3 text-center">ID</th>
                <th className="border p-3">NIK</th>
                <th className="border p-3">Nama Pasien</th>
                <th className="border p-3">Tanggal Lahir</th>
                <th className="border p-3 text-center">Jenis Kelamin</th>
                <th className="border p-3">No. HP</th>
                <th className="border p-3">Alamat</th>
                <th className="border p-3 text-center">Aksi Manajemen Pasien</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {!Array.isArray(pasienList) || pasienList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    Belum ada data pasien terdaftar.
                  </td>
                </tr>
              ) : (
                pasienList.map((pasien, index) => (
                  <tr key={pasien.id_pasien ? `pasien-${pasien.id_pasien}-${index}` : `pasien-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="border p-3 text-center text-gray-500">{pasien.id_pasien}</td>
                    <td className="border p-3 font-semibold text-teal-700 dark:text-teal-400">{pasien.nik}</td>
                    <td className="border p-3 font-medium text-gray-800 dark:text-white">{pasien.nama_pasien || pasien.nama}</td>
                    <td className="border p-3 text-gray-600 dark:text-gray-300">
                      {pasien.tanggal_lahir ? new Date(pasien.tanggal_lahir).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="border p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pasien.jenis_kelamin === "L" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                        {pasien.jenis_kelamin === "L" ? "Laki-laki (L)" : "Perempuan (P)"}
                      </span>
                    </td>
                    <td className="border p-3 text-gray-600 dark:text-gray-300">{pasien.no_hp || "-"}</td>
                    <td className="border p-3 text-gray-600 dark:text-gray-300">{pasien.alamat || "-"}</td>
                    <td className="border p-3 text-center space-x-1.5 whitespace-nowrap">
                      {/* Tombol Edit Data Pasien */}
                      <button
                        onClick={() => handleOpenModal(pasien)}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition shadow"
                        disabled={submitting}
                      >
                        Edit
                      </button>

                      {/* Tombol Buat Akun Pasien */}
                      <button
                        onClick={() => handleOpenAccountModal(pasien)}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition shadow cursor-pointer"
                      >
                        Buat Akun
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* POPUP MODAL TAMBAH/EDIT PASIEN */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {isEdit ? "Edit Data Pasien" : "Tambah Pasien Baru"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs font-medium">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">NIK Pasien (16 Digit)</label>
                <input
                  type="text"
                  name="nik"
                  value={formData.nik}
                  onChange={handleChange}
                  maxLength={16}
                  required
                  className="w-full rounded-lg border p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-mono"
                  placeholder="Masukkan NIK 16 digit"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Nama Pasien</label>
                <input
                  type="text"
                  name="nama_pasien"
                  value={formData.nama_pasien}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    name="tanggal_lahir"
                    value={formData.tanggal_lahir}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Jenis Kelamin</label>
                  <select
                    name="jenis_kelamin"
                    value={formData.jenis_kelamin}
                    onChange={handleChange}
                    className="w-full rounded-lg border p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">No. HP / WhatsApp (Maks. 20 Karakter)</label>
                <input
                  type="text"
                  name="no_hp"
                  value={formData.no_hp}
                  onChange={handleChange}
                  maxLength={20}
                  className="w-full rounded-lg border p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-mono"
                  placeholder="0812xxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Alamat Pasien</label>
                <textarea
                  name="alamat"
                  value={formData.alamat}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-lg border p-2.5 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Masukkan alamat domisili"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-teal-600 px-5 py-2 font-bold text-white hover:bg-teal-700 shadow"
                >
                  {submitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL "BUAT AKUN LOGIN PASIEN" OLEH ADMIN */}
      {accountModalOpen && accountPasien && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-teal-200 dark:border-teal-800 space-y-4">

            <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
              <h2 className="text-lg font-extrabold text-gray-800 dark:text-white">
                Buat Akun Login Pasien
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Admin mendaftarkan akun login untuk pasien agar dapat mengakses antrean online.
              </p>
            </div>

            {/* Informasi Pasien Terpilih */}
            <div className="rounded-xl bg-teal-50 p-3.5 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs space-y-1">
              <p className="text-gray-500">Nama Pasien: <strong className="text-teal-800 dark:text-teal-300 font-bold">{accountPasien.nama_pasien || accountPasien.nama}</strong></p>
              <p className="text-gray-500">NIK Pasien: <strong className="text-gray-800 dark:text-white font-mono">{accountPasien.nik || "-"}</strong></p>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-semibold">
                  Email / Username Login
                </label>
                <input
                  type="text"
                  value={accountForm.username}
                  onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-300 p-3 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-teal-500 font-semibold"
                  placeholder="Masukkan Email atau Username / NIK"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-semibold">
                  Password
                </label>
                <input
                  type="text"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-300 p-3 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:border-teal-500 font-semibold"
                  placeholder="Masukkan password akun pasien"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={accountSubmitting}
                  className="rounded-xl bg-teal-600 px-5 py-2.5 font-bold text-white hover:bg-teal-700 transition shadow"
                >
                  {accountSubmitting ? "Menyimpan..." : "Simpan Akun Pasien"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
