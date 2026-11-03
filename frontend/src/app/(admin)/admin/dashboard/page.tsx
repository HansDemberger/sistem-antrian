"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { PieChartIcon } from "@/icons";

interface DashboardData {
  totalPasien: number;
  antrianHariIni: number;
  menunggu: number;
  sedangDilayani: number;
  selesai: number;
}
interface LineChartData {
  tanggal: string;
  jumlah: number;
}
interface KebutuhanChartData {
  kebutuhan_pelayanan: string;
  jumlah: number;
}
interface PoliChartData {
  tujuan_pelayanan: string;
  jumlah: number;
}
interface PasienDipanggil {
  nomor_antrian: string;
  nama: string;
  kebutuhan_pelayanan: string;
  tujuan_pelayanan: string;
  prioritas: string;
  status: string;
}
interface AntrianTerbaru {
  id_antrian?: number | string;
  nomor_antrian: string;
  nama: string;
  kebutuhan_pelayanan: string;
  tujuan_pelayanan: string;
  prioritas: string;
  status: string;
  waktu_daftar: string;
}

const CHART_HEIGHT = 240;
const COLORS = ["#eab308", "#f97316", "#16a34a", "#3b82f6"];

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [lineData, setLineData] = useState<LineChartData[]>([]);
  const [kebutuhanData, setKebutuhanData] = useState<KebutuhanChartData[]>([]);
  const [poliData, setPoliData] = useState<PoliChartData[]>([]);
  const [pasienDipanggil, setPasienDipanggil] = useState<PasienDipanggil | null>(null);
  const [antrianTerbaru, setAntrianTerbaru] = useState<AntrianTerbaru[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard();
    getLineChart();
    getKebutuhanChart();
    getPoliChart();
    getPasienDipanggil();
    getAntrianTerbaru();

    const interval = setInterval(() => {
      getPasienDipanggil();
      getAntrianTerbaru();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const getDashboard = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/dashboard", {
        headers: authHeader(),
      });
      if (!res.ok) return;
      const data = await res.json();

      setDashboard({
        totalPasien: data.totalPasien ?? data.total_pasien ?? 0,
        antrianHariIni: data.antrianHariIni ?? data.antrian_hari_ini ?? 0,
        menunggu: data.menunggu ?? 0,
        sedangDilayani: data.sedangDilayani ?? data.sedang_dilayani ?? 0,
        selesai: data.selesai ?? 0,
      });
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const getLineChart = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/dashboard/line-chart", {
        headers: authHeader(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        const hasil = data.map((item: any) => ({
          tanggal: new Date(item.tanggal).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
          }),
          jumlah: item.jumlah,
        }));
        setLineData(hasil);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const getKebutuhanChart = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/dashboard/prioritas-chart", {
        headers: authHeader(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setKebutuhanData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
  };

  const getPoliChart = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/dashboard/poli-chart", {
        headers: authHeader(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setPoliData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
  };

  const getPasienDipanggil = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/dashboard/pasien-dipanggil", {
        headers: authHeader(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setPasienDipanggil(data && typeof data === "object" && !Array.isArray(data) ? data : null);
    } catch (err) {
      console.log(err);
    }
  };

  const getAntrianTerbaru = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/dashboard/antrian-terbaru", {
        headers: authHeader(),
      });
      if (!res.ok) {
        setAntrianTerbaru([]);
        return;
      }
      const data = await res.json();
      setAntrianTerbaru(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      setAntrianTerbaru([]);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Memuat data dashboard...
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Data dashboard tidak ditemukan. Pastikan Anda telah login sebagai Admin dan server backend aktif.
      </div>
    );
  }

  const pieData = [
    { name: "Menunggu", value: dashboard.menunggu },
    { name: "Sedang Dilayani", value: dashboard.sedangDilayani },
    { name: "Selesai", value: dashboard.selesai },
  ];

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Dashboard Admin
        </h1>
        <p className="text-sm text-gray-500">
          Klasifikasi Kebutuhan Pelayanan Pasien Menggunakan Algoritma Decision Tree untuk Routing Antrean Puskesmas Pauh
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <SummaryCard label="Total Pasien" value={dashboard.totalPasien} color="bg-blue-600" />
        <SummaryCard label="Antrian Hari Ini" value={dashboard.antrianHariIni} color="bg-teal-600" />
        <SummaryCard label="Menunggu" value={dashboard.menunggu} color="bg-yellow-500" />
        <SummaryCard label="Sedang Dilayani" value={dashboard.sedangDilayani} color="bg-orange-500" />
        <SummaryCard label="Selesai" value={dashboard.selesai} color="bg-green-600" />
      </div>

      {/* CHART SECTION */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Persentase Status Antrean" center icon={<PieChartIcon className="size-4" />}>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={2}
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* PASIEN SEDANG DILAYANI */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-gray-900 dark:ring-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700 dark:text-gray-200">
              Pasien Sedang Dipanggil / Dilayani
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Rute Antrean Langsung
            </span>
          </div>

          {!pasienDipanggil ? (
            <div className="flex h-56 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400 dark:bg-gray-800">
              Tidak ada pasien yang sedang dipanggil
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-blue-50 p-4 text-center shadow-sm dark:from-teal-950/30 dark:to-blue-950/30">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                  Nomor Antrean
                </p>
                <h1 className="mt-2 text-5xl font-extrabold text-teal-700 dark:text-teal-300">
                  {pasienDipanggil.nomor_antrian}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-gray-800">
                <p className="text-slate-500 dark:text-gray-400">Nama</p>
                <p className="text-right font-semibold text-slate-800 dark:text-white">
                  {pasienDipanggil.nama}
                </p>

                <p className="text-slate-500 dark:text-gray-400">Klasifikasi Kebutuhan</p>
                <p className="text-right font-bold text-teal-600 dark:text-teal-400">
                  {pasienDipanggil.kebutuhan_pelayanan || pasienDipanggil.tujuan_pelayanan}
                </p>

                <p className="text-slate-500 dark:text-gray-400">Poli Tujuan</p>
                <p className="text-right font-semibold text-slate-800 dark:text-white">
                  {pasienDipanggil.tujuan_pelayanan || "Poli Umum"}
                </p>

                <p className="text-slate-500 dark:text-gray-400">Status</p>
                <p className="text-right font-semibold text-orange-500">
                  {pasienDipanggil.status}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABEL 5 ANTRIAN TERBARU */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="mb-4 text-base font-semibold text-gray-700 dark:text-gray-200">
          5 Antrian Terbaru & Routing Pelayanan
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                <th className="p-3 font-medium">No</th>
                <th className="p-3 font-medium">Nomor</th>
                <th className="p-3 font-medium">Nama Pasien</th>
                <th className="p-3 font-medium">Klasifikasi Kebutuhan Pelayanan</th>
                <th className="p-3 font-medium">Rute Poli</th>
                <th className="p-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {!Array.isArray(antrianTerbaru) || antrianTerbaru.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">
                    Belum ada data antrian.
                  </td>
                </tr>
              ) : (
                antrianTerbaru.map((item, index) => (
                  <tr key={item.id_antrian ? `dash-antrian-${item.id_antrian}-${index}` : `dash-index-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 text-gray-500">{index + 1}</td>
                    <td className="p-3 font-semibold text-teal-600 dark:text-teal-400">
                      {item.nomor_antrian}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-200">{item.nama}</td>
                    <td className="p-3 font-medium text-teal-700 dark:text-teal-300">
                      {item.kebutuhan_pelayanan || item.tujuan_pelayanan || "Poli Umum"}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {item.tujuan_pelayanan || "Poli Umum"}
                    </td>
                    <td className="p-3 text-center">
                      {renderStatusBadge(item.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl ${color} p-4 text-white shadow-sm`}>
      <p className="text-xs font-medium opacity-90">{label}</p>
      <h2 className="mt-2 text-3xl font-bold">{value}</h2>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
  center = false,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  center?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-gray-900 dark:ring-gray-800 ${className}`}>
      <div className={`mb-3 flex items-center gap-2 text-slate-700 dark:text-gray-200 ${center ? "justify-center" : ""}`}>
        {icon ? (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
            {icon}
          </span>
        ) : null}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function renderStatusBadge(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE QUEUE" || s === "ACTIVE") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        Antrean Aktif
      </span>
    );
  }
  if (s === "DIPANGGIL" || s === "SEDANG DILAYANI") {
    return (
      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
        Sedang Dipanggil
      </span>
    );
  }
  if (s === "SELESAI" || s === "COMPLETED") {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
        Selesai
      </span>
    );
  }
  if (s === "MENUNGGU" || s === "MENUNGGU VERIFIKASI") {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
        Menunggu
      </span>
    );
  }
  if (s === "BOOKED") {
    return (
      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
        Terdaftar
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {status}
    </span>
  );
}
