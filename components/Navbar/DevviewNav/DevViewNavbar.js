"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./devViewNavbar.module.css";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/devview", label: "Overview" },
  { href: "/devview/users", label: "Users" },
  { href: "/devview/access", label: "Access" },
];

export default function DevViewNavbar() {
  const pathname = usePathname();

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.badge}>DevView</div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Platform Admin</h1>
            <p className={styles.subtitle}>Internal tools and admin controls</p>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const active =
              item.href === "/devview"
                ? pathname === "/devview"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}