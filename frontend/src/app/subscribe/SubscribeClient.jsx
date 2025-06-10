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

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => setLoading(false), 1000) // Simulate loading
    return () => clearTimeout(timer)
  }, [])

  const handleOnClose = (response) => {
    console.log('Payment Closed:', response)
    if (!isSuccess) {
      setIsProcessing(false) // Only reset if not successful
    }
  }

const handleOnSuccess = async (response) => {
  console.log('Payment Success:', response)
  setIsProcessing(true) // still processing
  setError(null)

  const paymentData = {
    telegramId,
    groupId,
    amount: Number(amount),
    duration,
    email,
    reference: response?.reference,

  }

  try {
    // Save the payment record
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    })

    if (!res.ok) {
      throw new Error('Failed to save payment on server')
    }

    // Poll the backend until status is "successful"
    const checkStatus = async () => {
      const statusRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/status?ref=${response.reference}`, {
        credentials: 'include',
      })
      const statusData = await statusRes.json()
      return statusData.status
    }

    const maxAttempts = 10
    let attempts = 0
    let status = 'pending'

    while (attempts < maxAttempts) {
      status = await checkStatus()
      if (status === 'successful') break
      await new Promise(resolve => setTimeout(resolve, 2000)) // wait 2 seconds
      attempts++
    }

    if (status === 'successful') {
      setIsSuccess(true)
      setIsProcessing(false)
      router.push({
        pathname: '/subscribe/success',
        query: {
          groupId,
          amount,
        },
      })
    } else {
      setError('Payment was made but could not be confirmed yet. Please refresh this page in a few seconds.')
      setIsProcessing(false)
    }

  } catch (err) {
    console.error('Error saving payment:', err)
    setError('Payment was successful but we encountered an issue recording it. Please contact support with your payment reference.')
    setIsProcessing(false)
    setIsSuccess(false)
  }
}


const handlePay = async () => {
  if (isSuccess) return

  if (
    !amount || !email || !phone || !firstName || !lastName ||
    !groupId || !telegramId || !duration
  ) {
    alert('Missing required information. Please fill all fields.')
    return
  }

  let formattedPhone = phone.trim()
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+234' + formattedPhone.slice(1)
  }

  if (!/^\+234\d{10}$/.test(formattedPhone)) {
    alert('Please enter a valid Nigerian phone number.')
    return
  }

  const merchantKey = process.env.NEXT_PUBLIC_BANI_PUBLIC_KEY
  if (!merchantKey) {
    alert('Merchant key is missing. Please contact support.')
    return
  }

  setIsProcessing(true)

  try {
    // Step 1: Save the payment INITIALLY (status = 'pending')
    const recordRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId,
        groupId,
        amount: Number(amount),
        duration,
        email,
        reference: 'pending-temp', // or generate client-side UUID or leave it out if backend will assign
        phone: formattedPhone,
        firstName,
        lastName
      }),
    })

    if (!recordRes.ok) {
      throw new Error('Failed to initialize payment on server')
    }

    // Step 2: Launch Bani modal AFTER recording it
    BaniPopUp({
      amount: amount.toString(),
      email,
      phoneNumber: formattedPhone,
      firstName,
      lastName,
      merchantKey,
      metadata: { groupId, duration, telegramId },
      onClose: handleOnClose,
      callback: handleOnSuccess,
    })

  } catch (err) {
    console.error('Error initiating payment:', err)
    setError('Failed to initialize payment. Please try again.')
    setIsProcessing(false)
  }
}


  if (loading || !mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonHeader}></div>
        
        <div className={styles.skeletonInfo}></div>
        <div className={styles.skeletonInfo}></div>
        <div className={styles.skeletonInfo}></div>
        
        {[...Array(4)].map((_, i) => (
          <div key={i} className={styles.skeletonFormGroup}>
            <div className={styles.skeletonLabel}></div>
            <div className={styles.skeletonInput}></div>
          </div>
        ))}
        
        <div className={styles.skeletonButton}></div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Subscribe to {groupName}</h1>
      
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Amount:</span>
          <span className={styles.summaryValue}>₦{amount}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Duration:</span>
          <span className={styles.summaryValue}>{duration}</span>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="firstName" className={styles.label}>
          First Name
        </label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="John"
          className={styles.input}
          required
          disabled={isSuccess}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="lastName" className={styles.label}>
          Last Name
        </label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Doe"
          className={styles.input}
          required
          disabled={isSuccess}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={styles.input}
          required
          disabled={isSuccess}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="phone" className={styles.label}>
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 08000111111"
          className={styles.input}
          required
          disabled={isSuccess}
        />
        <p className={styles.hint}>We'll convert it to international format (+234...)</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button
        onClick={handlePay}
        disabled={isProcessing || isSuccess}
        className={
          isSuccess ? styles.buttonSuccess : 
          isProcessing ? styles.buttonDisabled : 
          styles.button
        }
      >
        {isSuccess ? (
          'Payment Successful!'
        ) : isProcessing ? (
          <>
            <span className={styles.spinner}></span>
            Processing Payment...
          </>
        ) : (
          'Pay Now'
        )}
      </button>
    </div>
  )
}