"use client";

import React from "react";

const AntrianSayaPage: React.FC = () => {
  const myQueue = {
    nomor: "B012",
    status: "Menunggu",
    estimasi: "15 menit",
    poli: "Poli Umum",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Status Antrian Saya
      </h1>
      <div className="space-y-4 text-lg">
        <p><strong>Nomor Antrian:</strong> <span className="font-mono text-blue-600 dark:text-blue-400">{myQueue.nomor}</span></p>
        <p><strong>Poli Tujuan:</strong> {myQueue.poli}</p>
        <p><strong>Status:</strong> <span className="font-semibold text-yellow-600 dark:text-yellow-400">{myQueue.status}</span></p>
        <p><strong>Estimasi Waktu Tunggu:</strong> {myQueue.estimasi}</p>
      </div>
    </div>
  );
};

export default AntrianSayaPage;