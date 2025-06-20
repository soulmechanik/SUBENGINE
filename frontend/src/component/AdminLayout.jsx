'use client';

import Link from 'next/link';
import styles from './layout.module.scss';

export default function AdminLayout({ children }) {
  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <h2 className={styles.logo}>SubEngine</h2>
        <nav className={styles.nav}>
          <Link href="/dashboard/overview">Overview</Link>
          <Link href="/dashboard/transactions">Transactions</Link>
          <Link href="/dashboard/groups">Groups</Link>
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>Admin Dashboard</h1>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
