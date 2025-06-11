'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SuccessClient() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('checking')

  const reference = searchParams.get('reference')
  const groupId = searchParams.get('groupId')
  const amount = searchParams.get('amount')

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference, status: 'successful', transactionRef: reference })
        })

        if (res.ok) {
          setStatus('success')
        } else {
          setStatus('failed')
        }
      } catch (err) {
        console.error('Verification failed:', err)
        setStatus('failed')
      }
    }

    if (reference) {
      verify()
    } else {
      setStatus('failed')
    }
  }, [reference])

  return (
    <div style={{ padding: '2rem' }}>
      {status === 'checking' && <p>Verifying your payment...</p>}
      {status === 'success' && (
        <div>
          <h1>🎉 Payment Successful!</h1>
          <p>You’ve successfully subscribed to the group.</p>
          <p><strong>Reference:</strong> {reference}</p>
          <p><strong>Amount:</strong> ₦{amount}</p>
        </div>
      )}
      {status === 'failed' && (
        <div>
          <h1>⚠️ Payment Verification Failed</h1>
          <p>We couldn't confirm your payment. Please contact support.</p>
          {reference && <p><strong>Reference:</strong> {reference}</p>}
        </div>
      )}
    </div>
  )
}
