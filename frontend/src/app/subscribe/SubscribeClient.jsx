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

  const groupId = searchParams.get('groupId')
  const groupName = searchParams.get('groupName') || ''
  const amount = searchParams.get('amount')
  const duration = searchParams.get('duration')
  const telegramId = searchParams.get('userId') || ''

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const reference = `BNI-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  useEffect(() => {
    console.log('Component mounted')
    setMounted(true)
    const timer = setTimeout(() => {
      console.log('Loading complete')
      setLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleOnClose = (response) => {
    console.log('Payment modal closed with response:', response)
    if (!isSuccess) {
      setIsProcessing(false)
    }
  }

  const handleOnSuccess = async (response) => {
    console.log('Payment success handler triggered with response:', response)
    setIsSuccess(true)
    
    try {
      const redirectUrl = `/subscribe/success?reference=${response.reference}&groupId=${groupId}&amount=${amount}&telegramId=${telegramId}`
      console.log('Attempting redirect to:', redirectUrl)
      router.push(redirectUrl)
    } catch (err) {
      console.error('Redirect error:', err)
      setError(`Payment succeeded but redirection failed. Reference: ${response.reference}`)
      setIsProcessing(false)
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

    try {
      const recordRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
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
        throw new Error(await recordRes.text() || 'Failed to initialize payment')
      }

      const { payment } = await recordRes.json()

      BaniPopUp({
        amount: amount.toString(),
        email,
        phoneNumber: formattedPhone,
        firstName,
        lastName,
        merchantKey,
        merchantRef: reference,
        metadata: {
          telegramId,
          groupId,
          duration,
          internalReference: reference
        },
        onClose: handleOnClose,
        callback: (response) => {
          console.log('Bani callback response:', response)
          
          // Handle all possible success states
          if (['successful', 'completed', 'paid'].includes(response.status)) {
            handleOnSuccess(response)
          } 
          // Handle processing states
          else if (['pending', 'payment_processing', 'processing'].includes(response.status)) {
            setError('Payment is processing. Please wait for confirmation...')
            // Keep processing spinner active
          }
          // Handle failures
          else {
            setIsProcessing(false)
            setError(response.message || 'Payment failed or was cancelled')
          }
        }
      })

    } catch (err) {
      console.error('Payment initiation error:', err)
      setError(err.message || 'Failed to start payment process. Please try again.')
      setIsProcessing(false)
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
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>Last Name *</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={isProcessing || isSuccess}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isProcessing || isSuccess}
          required
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
          required
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