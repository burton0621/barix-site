"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./DevViewNav.module.css";

export default function DevViewNav() {
  const pathname = usePathname();

  function active(href) {
    return pathname === href ? styles.active : "";
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>DevView</div>

        <nav className={styles.nav}>
          <Link className={`${styles.link} ${active("/devview")}`} href="/devview">
            Overview
          </Link>
          <Link className={`${styles.link} ${active("/devview/users")}`} href="/devview/users">
            Users
          </Link>
          <Link className={`${styles.link} ${active("/devview/access")}`} href="/devview/access">
            Access
          </Link>
        </nav>
      </div>
    </header>
  );
}