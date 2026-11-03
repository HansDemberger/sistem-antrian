"use client";

import { useEffect, useState } from "react";

interface AntrianDipanggil {
  nomor_antrian: string;
  nama: string;
  kebutuhan_pelayanan: string;
  tujuan_pelayanan: string;
  status: string;
}

export default function DisplayPage() {
  const [antrian, setAntrian] = useState<AntrianDipanggil | null>(null);
  const [loading, setLoading] = useState(true);

  const getAntrianDipanggil = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/antrian/dipanggil");
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
    getAntrianDipanggil();

    const interval = setInterval(() => {
      getAntrianDipanggil();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-2xl font-bold text-teal-700">
        Memuat Tampilan Display Antrian...
      </div>
    );
  }

  if (!antrian) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h1 className="mb-4 text-5xl font-extrabold text-teal-800 tracking-tight">
          SISTEM ANTRIAN ONLINE PUSKESMAS PAUH
        </h1>
        <p className="text-2xl font-medium text-slate-500">
          Belum ada antrian pasien yang sedang dipanggil
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-teal-50/50 p-8">
      <h1 className="mb-2 text-4xl font-extrabold text-teal-800 tracking-tight">
        SISTEM MANAJEMEN ANTRIAN ONLINE
      </h1>
      <p className="mb-8 text-xl font-medium text-teal-600">
        Routing Pelayanan Pasien - Puskesmas Pauh Kota Padang
      </p>

      <p className="text-2xl font-bold uppercase tracking-widest text-slate-500">
        Nomor Antrean Dipanggil
      </p>

      <h2 className="my-6 text-9xl font-black text-teal-600 drop-shadow-md">
        {antrian.nomor_antrian}
      </h2>

      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl ring-1 ring-teal-100 text-center">
        <p className="mb-4 text-3xl font-bold text-slate-800">
          {antrian.nama}
        </p>

        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-teal-50 p-5 text-left">
          <div className="flex justify-between items-center text-lg">
            <span className="text-slate-500">Klasifikasi Kebutuhan:</span>
            <span className="font-bold text-teal-700">
              {antrian.kebutuhan_pelayanan || antrian.tujuan_pelayanan || "Poli Umum"}
            </span>
          </div>

          <div className="flex justify-between items-center text-lg border-t border-teal-200/60 pt-3">
            <span className="text-slate-500">Poli Tujuan:</span>
            <span className="font-bold text-blue-700">
              {antrian.tujuan_pelayanan || "Poli Umum"}
            </span>
          </div>

          <div className="flex justify-between items-center text-lg border-t border-teal-200/60 pt-3">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-emerald-600 animate-pulse">
              {antrian.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}