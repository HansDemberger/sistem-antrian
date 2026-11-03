"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootAdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login"); // Ganti dengan rute yang sesuai untuk halaman login
  }, [router]);

  return null; // Atau tampilkan halaman loading
}
