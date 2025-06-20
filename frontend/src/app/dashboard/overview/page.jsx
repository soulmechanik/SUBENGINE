'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../../../component/AdminLayout';
import styles from './overview.module.scss';

export default function OverviewPage() {
  const [revenue, setRevenue] = useState([]);
  const [stats, setStats] = useState({});
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

      try {
        const [revRes, statsRes, txRes] = await Promise.all([
          fetch(`${BASE_URL}/api/admin/revenue/weekly`).then(res => res.json()),
          fetch(`${BASE_URL}/api/admin/stats`).then(res => res.json()),
          fetch(`${BASE_URL}/api/admin/transactions`).then(res => res.json()),
        ]);

        setRevenue(revRes.revenue || []);
        setStats(statsRes || {});
        setTransactions(txRes.transactions || []);
      } catch (err) {
        console.error('Overview fetch error:', err);
      }
    };

    fetchData();
  }, []);

  return (
    <AdminLayout>
      <div className={styles.overview}>
        <section className={styles.metrics}>
          <div className={styles.card}>
            <h3>Total Groups</h3>
            <p>{stats.totalGroups ?? '—'}</p>
          </div>
          <div className={styles.card}>
            <h3>Total Group Owners</h3>
            <p>{stats.totalGroupOwners ?? '—'}</p>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Weekly Revenue</h2>
          {revenue.length === 0 ? (
            <p>No revenue data this week.</p>
          ) : (
            <ul className={styles.revenueList}>
              {revenue.map((owner, idx) => (
                <li key={idx}>
                  <strong>{owner.username || owner.telegramId}</strong> – ₦{owner.totalRevenue.toLocaleString()} from {owner.groups.length} group(s)
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h2>Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Group</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map((tx) => (
                  <tr key={tx._id}>
                    <td>{tx.email}</td>
                    <td>₦{tx.amount.toLocaleString()}</td>
                    <td>{tx.status}</td>
                    <td>{tx.groupTitle || '—'}</td>
                    <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
