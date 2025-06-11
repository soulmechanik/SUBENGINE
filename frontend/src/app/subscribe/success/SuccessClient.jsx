'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './success.module.scss'

export default function SuccessClient() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('checking')
  const [isLoading, setIsLoading] = useState(true)

  const reference = searchParams.get('reference')
  const groupId = searchParams.get('groupId')
  const amount = searchParams.get('amount')

  useEffect(() => {
    const verify = async () => {
      try {
        setIsLoading(true)
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
      } finally {
        setIsLoading(false)
      }
    }

    if (reference) {
      verify()
    } else {
      setStatus('failed')
      setIsLoading(false)
    }
  }, [reference])

  return (
    <div className={styles.container}>
      {isLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Verifying your payment...</p>
        </div>
      ) : (
        <>
          {status === 'success' && (
            <div className={styles.successState}>
              <div className={styles.iconContainer}>
                <svg className={styles.checkmark} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none"/>
                  <path className={styles.checkmarkCheck} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
              </div>
              <h1>Payment Successful!</h1>
              <p className={styles.successMessage}>You've successfully subscribed to the group</p>
              <div className={styles.details}>
                <p><strong>Reference:</strong> {reference}</p>
                <p><strong>Amount:</strong> ₦{amount}</p>
              </div>
              <button className={styles.actionButton}>Continue to Dashboard</button>
            </div>
          )}
          {status === 'failed' && (
            <div className={styles.failedState}>
              <div className={styles.iconContainer}>
                <svg className={styles.failureIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle className={styles.failureCircle} cx="26" cy="26" r="25" fill="none"/>
                  <path className={styles.failurePath} fill="none" d="M16 16 36 36 M36 16 16 36"/>
                </svg>
              </div>
              <h1>Payment Verification Failed</h1>
              <p className={styles.errorMessage}>We couldn't confirm your payment</p>
              {reference && <p><strong>Reference:</strong> {reference}</p>}
              <button className={styles.actionButton}>Contact Support</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}