"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { useSidebar } from "../context/SidebarContext";

import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  PieChartIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: {
    name: string;
    path: string;
  }[];
};

// =======================
// MENU BERDASARKAN ROLE
// =======================

const getMenuItems = (role: string): NavItem[] => {
  if (role === "admin") {
    return [
      {
        icon: <GridIcon />,
        name: "Dashboard",
        path: "/admin/dashboard",
      },
      {
        icon: <UserCircleIcon />,
        name: "Pasien",
        subItems: [
          {
            name: "Data Pasien",
            path: "/admin/datapasien",
          },
        ],
      },
      {
        icon: <TableIcon />,
        name: "Antrian",
        subItems: [
          {
            name: "Verifikasi Pasien",
            path: "/admin/verifikasipasien",
          },
          {
            name: "Kunjungan Mendatang",
            path: "/admin/janjitemu",
          },
          {
            name: "Daftar Antrian Hari Ini",
            path: "/admin/antrian",
          },
          {
            name: "Kelola Antrian Hari Ini",
            path: "/admin/kelolahantrian",
          },
        ],
      },
      {
        icon: <PieChartIcon />,
        name: "Laporan",
        path: "/admin/laporan",
      },
    ];
  }

  if (role === "pasien") {
    return [
      {
        icon: <UserCircleIcon />,
        name: "Pendaftaran Pasien",
        path: "/pasien/pendaftaran",
      },
      {
        icon: <TableIcon />,
        name: "Status Antrean / E-Ticket",
        path: "/pasien/statusantrian",
      },
    ];
  }

  return [];
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();

  const pathname = usePathname();

  const [role, setRole] = useState("");

  // ambil role login
  useEffect(() => {
    const user = localStorage.getItem("user");

    if (user) {
      const data = JSON.parse(user);
      setRole(data.role);
    }
  }, []);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );

  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => path === pathname,
    [pathname]
  );

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prev) => {
      if (prev && prev.index === index) {
        return null;
      }

      return {
        type: "others",
        index,
      };
    });
  };

  const renderMenuItems = (items: NavItem[]) => {
    return (
      <ul className="flex flex-col gap-1.5">
        {items.map((nav, index) => (
          <li key={nav.name || nav.path || `nav-${index}`}>
            {nav.subItems ? (
              <>
                <button
                  onClick={() => handleSubmenuToggle(index)}
                  className={`
                    group flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                    cursor-pointer transition-all duration-200 ease-out
                    ${openSubmenu?.index === index
                      ? "menu-item-active bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20"
                      : "menu-item-inactive text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                    }
                  `}
                >
                  <span
                    className={`
                      flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                      transition-colors duration-200
                      ${openSubmenu?.index === index
                        ? "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300"
                        : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                      }
                    `}
                  >
                    {nav.icon}
                  </span>

                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text truncate text-sm font-medium">
                      {nav.name}
                    </span>
                  )}

                  {(isExpanded || isHovered || isMobileOpen) && (
                    <ChevronDownIcon
                      className={`
                        ml-auto h-4 w-4 shrink-0
                        transition-transform duration-200 ease-out
                        ${openSubmenu?.index === index
                          ? "rotate-180 text-teal-600 dark:text-teal-300"
                          : "text-gray-300 dark:text-gray-600"
                        }
                      `}
                    />
                  )}
                </button>

                <div
                  ref={(el) => {
                    subMenuRefs.current[index] = el;
                  }}
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    height:
                      openSubmenu?.index === index
                        ? `${subMenuRefs.current[index]?.scrollHeight}px`
                        : "0px",
                  }}
                >
                  <ul className="mt-1.5 ml-4 space-y-1 rounded-xl border border-gray-100 bg-gray-50/60 p-2 pl-4 shadow-inner dark:border-white/5 dark:bg-white/[0.03]">
                    {nav.subItems.map((sub, subIdx) => (
                      <li key={sub.path || sub.name || `sub-${subIdx}`}>
                        <Link
                          href={sub.path}
                          className={
                            isActive(sub.path)
                              ? "menu-dropdown-item-active flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-teal-700 bg-white shadow-sm ring-1 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20"
                              : "menu-dropdown-item-inactive flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors duration-150 hover:bg-white hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                          }
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive(sub.path)
                                ? "bg-teal-500"
                                : "bg-gray-300 dark:bg-gray-600"
                              }`}
                          />
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ease-out ${isActive(nav.path)
                      ? "menu-item-active bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20"
                      : "menu-item-inactive text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                    }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${isActive(nav.path)
                        ? "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300"
                        : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                      }`}
                  >
                    {nav.icon}
                  </span>

                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text truncate text-sm font-medium">
                      {nav.name}
                    </span>
                  )}
                </Link>
              )
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <aside
      className={`
        fixed top-0 left-0
        h-screen
        bg-white/95 backdrop-blur-sm dark:bg-gray-900/95
        border-r border-gray-200/80 dark:border-white/10
        shadow-[1px_0_16px_rgba(15,23,42,0.04)]
        z-40
        px-4
        w-72
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:${isExpanded ? "translate-x-0" : "-translate-x-full"}
      `}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center border-b border-gray-100 px-10 py-6 dark:border-white/5">
        <Link href="/" className="flex w-full items-center gap-3 overflow-hidden">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-white shadow-sm ring-1 ring-teal-100 dark:from-teal-500/10 dark:to-transparent dark:ring-teal-500/20">
            <Image
              src="/images/logo/antrian.png"
              alt="logo"
              width={48}
              height={38}
              className="h-8 w-8 object-contain"
            />
          </div>

          {(isExpanded || isHovered || isMobileOpen) && (
            <span className="truncate text-base font-bold tracking-tight text-gray-900 dark:text-white">
              SISTEM ANTRIAN
            </span>
          )}
        </Link>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.32em] text-teal-600/70 dark:text-teal-400/70">
          {role ? `ROLE: ${role.toUpperCase()}` : "MENU ANTRIAN"}
        </h2>

        {renderMenuItems(getMenuItems(role))}
      </div>
    </aside>
  );
};

export default AppSidebar;
