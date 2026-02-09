"use client";

import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./settings.module.css";

export default function SettingsLayout({ children }) {
  const pathname = usePathname();

  const linkClass = (href) =>
    `${styles.sidebarLink} ${pathname === href ? styles.sidebarLinkActive : ""}`;

  return (
    <div className={styles.page}>
      <DashboardNavbar />

      <main className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Manage your account settings</p>
        </div>

        <div className={styles.settingsLayout}>
          <aside className={styles.settingsSidebar}>
            <nav className={styles.sidebarNav}>
              <Link className={linkClass("/settings/account")} href="/settings/account">
                Account
              </Link>
              <Link className={linkClass("/settings/invoice")} href="/settings/invoice">
                Invoice Settings
              </Link>
              <Link className={linkClass("/settings/temp-wip")} href="/settings/temp-wip">
                Temp WIP
              </Link>
            </nav>
          </aside>

          <section className={styles.settingsContent}>{children}</section>
        </div>
      </main>
    </div>
  );
}
