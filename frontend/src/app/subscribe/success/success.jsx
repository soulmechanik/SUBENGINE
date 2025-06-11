'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './success.module.scss' // create if not exists

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const reference = searchParams.get('reference')
  const groupId = searchParams.get('groupId')
  const amount = searchParams.get('amount')
  const telegramId = searchParams.get('telegramId')

  const [status, setStatus] = useState('verifying') // verifying | success | failed
  const [error, setError] = useState(null)

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('failed')
        setError('Missing payment reference.')
        return
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        })

        const data = await res.json()

        if (!res.ok || !data.success || data.payment?.status !== 'successful') {
          setStatus('failed')
          setError('Payment verification failed or was not successful.')
        } else {
          setStatus('success')
        }
      } catch (err) {
        console.error('Error verifying payment:', err)
        setStatus('failed')
        setError('Error verifying payment. Please try again.')
      }
    }

    verifyPayment()
  }, [reference])

  return (
    <div className={styles.container}>
      {status === 'verifying' && <p>Verifying your payment...</p>}

      {status === 'success' && (
        <div className={styles.success}>
          <h1>✅ Payment Successful!</h1>
          <p>Thank you! Your subscription is now active.</p>
          <p><strong>Reference:</strong> {reference}</p>
          {groupId && <p><strong>Group ID:</strong> {groupId}</p>}
          {amount && <p><strong>Amount:</strong> ₦{amount}</p>}
        </div>
      )}

      {status === 'failed' && (
        <div className={styles.error}>
          <h1>❌ Payment Verification Failed</h1>
          <p>{error}</p>
          {reference && (
            <p>
              If you were charged, please contact support with this reference: <br />
              <strong>{reference}</strong>
            </p>
          )}
        </div>
      )}

      <button onClick={() => router.push('/')} className={styles.backButton}>
        Go Back Home
      </button>
    </div>
  )
}
