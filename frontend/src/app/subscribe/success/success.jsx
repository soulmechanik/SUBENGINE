// pages/subscribe/success.jsx

import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function SuccessPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  const { reference, groupId, amount } = router.query

  useEffect(() => {
    if (router.isReady) {
      setMounted(true)
    }
  }, [router.isReady])

  if (!mounted) return <p>Loading...</p>

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f0f8ff',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '2rem', color: 'green' }}>🎉 Payment Successful!</h1>
      <p style={{ fontSize: '1.1rem' }}>Thank you for subscribing to this group.</p>
      <div style={{ marginTop: '1rem', fontSize: '1rem' }}>
        <p><strong>Amount Paid:</strong> ₦{amount}</p>
        <p><strong>Transaction Reference:</strong> {reference}</p>
        <p><strong>Group ID:</strong> {groupId}</p>
      </div>
      <button
        onClick={() => router.push('/')}
        style={{
          marginTop: '2rem',
          padding: '10px 20px',
          backgroundColor: '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Go to Homepage
      </button>
    </div>
  )
}
