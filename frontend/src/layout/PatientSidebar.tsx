// "use client";
// import React from "react";
// import Link from "next/link";
// import Image from "next/image";
// import { usePathname } from "next/navigation";
// import { GridIcon, TableIcon, UserCircleIcon } from "../icons/index";

// type NavItem = {
//   name: string;
//   icon: React.ReactNode;
//   path: string;
// };

// const navItems: NavItem[] = [
//   {
//     icon: <GridIcon />,
//     name: "Dashboard",
//     path: "/dashboard",
//   },
//   {
//     icon: <TableIcon />,
//     name: "Antrian Saya",
//     path: "/antrian-saya",
//   },
//   {
//     icon: <UserCircleIcon />,
//     name: "Profil Saya",
//     path: "/profil-saya",
//   },
// ];

// const PatientSidebar: React.FC = () => {
//   const pathname = usePathname();

//   const isActive = (path: string) => {
//     // Match /dashboard for patient, not the admin one
//     if (path === "/dashboard") {
//       return pathname === "/dashboard";
//     }
//     return pathname.startsWith(path);
//   };

//   return (
//     <aside
//       className={`fixed flex flex-col top-0 px-4 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-[999] border-r border-gray-200 w-[290px] lg:translate-x-0`}
//     >
//       <div
//         className={`py-8 flex items-center pl-2 justify-start`}
//       >
//         <Link href="/dashboard" className="flex items-center gap-3 w-full">
//           <>
//             <Image
//               className="dark:hidden shrink-0"
//               src="/images/logo/antrian.png"
//               alt="Logo"
//               width={50}
//               height={40}
//             />
//             <Image
//               className="hidden dark:block shrink-0"
//               src="/images/logo/antrian.png"
//               alt="Logo"
//               width={50}
//               height={40}
//             />
//             <span className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">
//               SISTEM ANTRIAN
//             </span>
//           </>
//         </Link>
//       </div>
//       <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
//         <nav className="mb-6">
//           <ul className="flex flex-col gap-4">
//             {navItems.map((nav) => (
//               <li key={nav.name}>
//                 <Link
//                   href={nav.path}
//                   className={`menu-item group ${
//                     isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
//                   }`}
//                 >
//                   <span
//                     className={`${
//                       isActive(nav.path)
//                         ? "menu-item-icon-active"
//                         : "menu-item-icon-inactive"
//                     }`}
//                   >
//                     {nav.icon}
//                   </span>
//                   <span className={`menu-item-text`}>{nav.name}</span>
//                 </Link>
//               </li>
//             ))}
//           </ul>
//         </nav>
//       </div>
//     </aside>
//   );
// };

// export default PatientSidebar;