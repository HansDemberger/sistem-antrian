"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface User {
  nama: string;
  email: string;
  role: string;
}

const UserDropdown: React.FC = () => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
      }
    }
  }, []);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdown.current) return;
      if (
        !isDropdownOpen ||
        dropdown.current.contains(target as Node) ||
        trigger.current?.contains(target as Node)
      )
        return;
      setDropdownOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [isDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="relative">
      <button
        ref={trigger}
        onClick={() => setDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-4"
      >
        <span className="hidden text-right lg:block">
          <span className="block text-sm font-medium text-gray-900 dark:text-white">
            {user?.nama || "Pengguna"}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {user?.role || "Role"}
          </span>
        </span>

        <span className="h-12 w-12 rounded-full">
          <Image
            width={48}
            height={48}
            src={"/images/user/user-01.jpg"}
            alt="User"
            className="rounded-full"
          />
        </span>
      </button>

      {/* <!-- Dropdown Start --> */}
      <div
        ref={dropdown}
        className={`absolute right-0 mt-4 flex w-64 flex-col rounded-lg border border-gray-200 bg-white shadow-default dark:border-gray-800 dark:bg-gray-900 ${
          isDropdownOpen ? "block" : "hidden"
        }`}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{user?.nama || "Pengguna"}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || "email@example.com"}</p>
        </div>
        <ul className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          {/* Menu items can be added here */}
        </ul>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 px-6 py-3 text-sm font-medium text-red-500 duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800 lg:text-base cursor-pointer"
        >
          Keluar
        </button>
      </div>
      {/* <!-- Dropdown End --> */}
    </div>
  );
};

export default UserDropdown;