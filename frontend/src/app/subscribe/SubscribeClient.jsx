'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import useCheckout from 'bani-react'
import { useEffect, useState } from 'react'
import styles from './subscribe.module.scss'

export default function SubscribePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { BaniPopUp } = useCheckout()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [pollingStatus, setPollingStatus] = useState('')

  const groupId = searchParams.get('groupId')
  const groupName = searchParams.get('groupName') || ''
  const amount = searchParams.get('amount')
  const duration = searchParams.get('duration')
  const telegramId = searchParams.get('userId') || ''

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const internalReference = `BNI-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => setLoading(false), 1000)

    const pendingRef = localStorage.getItem('lastPaymentReference')
    if (pendingRef && !isSuccess && !isProcessing) {
      if (confirm('You have a pending payment. Would you like to check its status?')) {
        setIsProcessing(true)
        pollPaymentStatus(pendingRef)
      } else {
        localStorage.removeItem('lastPaymentReference')
      }
    }

    return () => clearTimeout(timer)
  }, [])

  const handleOnClose = (response) => {
    console.log('Payment modal closed with response:', response)
    if (!isSuccess) {
      setIsProcessing(false)
    }
  }

  const handleOnSuccess = async (response) => {
    setIsSuccess(true)
    setIsProcessing(false)
    localStorage.removeItem('lastPaymentReference')

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: internalReference,
          transactionRef: response.reference,
          status: 'successful'
        }),
      })

      const redirectUrl = `/subscribe/success?reference=${response.reference}&groupId=${groupId}&amount=${amount}&telegramId=${telegramId}`
      router.push(redirectUrl)
    } catch (err) {
      console.error('Success handler error:', err)
      setError(`Payment succeeded but record update failed. Reference: ${response.reference}`)
    }
  }

  const validateInputs = () => {
    if (!amount || !email || !phone || !firstName || !lastName) {
      alert('Please fill all required fields')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address')
      return false
    }

    let formattedPhone = phone.trim()
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+234' + formattedPhone.slice(1)
    }

    if (!/^\+234\d{10}$/.test(formattedPhone)) {
      alert('Please enter a valid Nigerian phone number (e.g. 08012345678)')
      return false
    }

    return formattedPhone
  }

  const pollPaymentStatus = async (baniRef) => {
    let attempts = 0
    const maxAttempts = 10
    const delay = 3000

    const poll = async () => {
      try {
        setPollingStatus(`Checking payment status (${attempts + 1}/${maxAttempts})...`)

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
          },
          body: JSON.stringify({
            reference: internalReference,
            transactionRef: baniRef,
            status: 'successful'
          }),
        })

        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text()
          throw new Error(`Unexpected server response: ${text}`)
        }

        const data = await res.json()
        console.log('Payment status response:', data)

        if (data.payment) {
          handleOnSuccess({ reference: baniRef })
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, delay)
        } else {
          setIsProcessing(false)
          setError(data.message || 'Payment verification timed out.')
          localStorage.removeItem('lastPaymentReference')
        }
      } catch (err) {
        console.error('Polling error:', err)
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, delay)
        } else {
          setIsProcessing(false)
          setError('Failed to verify payment. Contact support with your reference number.')
          localStorage.removeItem('lastPaymentReference')
        }
      }
    }

    poll()
  }

  const handlePay = async () => {
    if (isSuccess) return

    const formattedPhone = validateInputs()
    if (!formattedPhone) return

    const merchantKey = process.env.NEXT_PUBLIC_BANI_PUBLIC_KEY
    if (!merchantKey) {
      alert('Payment system error. Please contact support.')
      return
    }

    setIsProcessing(true)
    setError(null)
    setPollingStatus('')

    try {
      const recordRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: internalReference,
          telegramId,
          group: groupId,
          amount: Number(amount),
          duration,
          email,
          phone: formattedPhone,
          firstName,
          lastName,
          status: 'pending'
        }),
      })

      if (!recordRes.ok) {
        const errorText = await recordRes.text()
        throw new Error(errorText || 'Failed to initialize payment')
      }

      const { payment } = await recordRes.json()

      BaniPopUp({
        amount: amount.toString(),
        email,
        phoneNumber: formattedPhone,
        firstName,
        lastName,
        merchantKey,
        merchantRef: internalReference,
        metadata: {
          telegramId,
          groupId,
          duration,
          internalReference
        },
        onClose: handleOnClose,
        callback: (response) => {
          console.log('Bani callback response:', response)
          const baniRef = response.reference

          if (response.success === true || ['successful', 'completed', 'paid'].includes(response.status)) {
            handleOnSuccess({ reference: baniRef })
          } else if (['pending', 'payment_processing', 'processing'].includes(response.status)) {
            setError('⏳ Payment is processing. Please wait...')
            localStorage.setItem('lastPaymentReference', baniRef)
            pollPaymentStatus(baniRef)
          } else {
            setIsProcessing(false)
            setError(response.message || `Payment failed. Status: ${response.status}`)
            localStorage.removeItem('lastPaymentReference')
          }
        }
      })

    } catch (err) {
      console.error('Payment initiation error:', err)
      setError(err.message || 'Failed to start payment process. Please try again.')
      setIsProcessing(false)
      localStorage.removeItem('lastPaymentReference')

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/errors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: err.message,
          reference: internalReference,
          page: 'subscribe',
          timestamp: new Date().toISOString()
        }),
      })
    }
  }

  if (loading || !mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonHeader}></div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className={styles.skeletonLine}></div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1>Subscribe to {groupName}</h1>

      <div className={styles.summary}>
        <div><span>Amount:</span> ₦{amount}</div>
        <div><span>Duration:</span> {duration} month(s)</div>
      </div>

      <div className={styles.formGroup}>
        <label>First Name *</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={isProcessing || isSuccess}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Last Name *</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={isProcessing || isSuccess}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isProcessing || isSuccess}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Phone Number *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="08012345678"
          disabled={isProcessing || isSuccess}
        />
        <small>We'll automatically convert to +234 format</small>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          {error.includes('Reference') && (
            <button
              onClick={() => navigator.clipboard.writeText(error.split(': ')[1])}
              className={styles.copyButton}
            >
              Copy Reference
            </button>
          )}
        </div>
      )}

      {pollingStatus && (
        <div className={styles.pollingStatus}>
          {pollingStatus}
          <button
            onClick={() => {
              setIsProcessing(false)
              setPollingStatus('')
              setError('Payment check cancelled. You will receive email confirmation if payment succeeds.')
            }}
            className={styles.cancelButton}
          >
            Cancel Verification
          </button>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={isProcessing || isSuccess}
        className={isProcessing ? styles.processing : isSuccess ? styles.success : ''}
      >
        {isProcessing ? (
          <>
            <span className={styles.spinner}></span>
            Processing Payment...
          </>
        ) : isSuccess ? (
          'Payment Successful!'
        ) : (
          `Pay ₦${amount} Now`
        )}
      </button>

      <div className={styles.note}>
        <p>By proceeding, you agree to our Terms of Service.</p>
        <p>You'll be redirected to Bani's secure payment page.</p>
      </div>
    </div>
  )
}
