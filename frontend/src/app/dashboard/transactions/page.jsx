'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../../../component/AdminLayout';
import styles from './transactions.module.scss';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async (status = '') => {
    setLoading(true);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      const url = status
        ? `${BASE_URL}/api/admin/transactions?status=${status}`
        : `${BASE_URL}/api/admin/transactions`;

      const res = await fetch(url);
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleFilterChange = (e) => {
    const selected = e.target.value;
    setFilter(selected);
    fetchTransactions(selected);
  };

  return (
    <AdminLayout>
      <div className={styles.transactions}>
        <div className={styles.header}>
          <h2>All Transactions</h2>
          <select value={filter} onChange={handleFilterChange}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : transactions.length === 0 ? (
          <p>No transactions found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Group</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id}>
                  <td>{tx.email}</td>
                  <td>{tx.groupTitle || '—'}</td>
                  <td>₦{tx.amount.toLocaleString()}</td>
                  <td>{tx.status}</td>
                  <td>{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
