'use client'

import { useEffect, useState } from 'react'
import styles from './groups.module.scss'
import AdminLayout from '../../../component/AdminLayout'

export default function GroupsPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGroups() {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          console.warn('🚫 No token found, redirecting to login...')
          window.location.href = '/login'
          return
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/admin/groups`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        const data = await res.json()
        setGroups(data.groups || [])
      } catch (err) {
        console.error('Error fetching groups:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [])

  return (
    <AdminLayout>
      <div className={styles.container}>
        <h1 className={styles.heading}>📦 All Groups</h1>

        {loading ? (
          <div className={styles.loader}>Loading groups...</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Subscription</th>
                  <th>Owner</th>
                  <th>Subscribers</th>
                  <th>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, i) => (
                  <tr key={i}>
                    <td>
                      <div className={styles.groupTitle}>{group.groupTitle}</div>
                      <a
                        className={styles.inviteLink}
                        href={group.inviteLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        check group on telegram
                      </a>
                    </td>
                    <td>
                      ₦{group.subscriptionAmount.toLocaleString()} /{' '}
                      {group.subscriptionDuration}
                    </td>
                    <td>
                      <div>{group.owner.username || group.owner.telegramId}</div>
                      <small className={styles.ownerEmail}>{group.owner.email}</small>
                    </td>
                    <td>{group.totalSubscribers}</td>
                    <td>₦{group.totalRevenue.toLocaleString()}</td>
                    <td>
                      <span className={group.isActive ? styles.active : styles.inactive}>
                        {group.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
