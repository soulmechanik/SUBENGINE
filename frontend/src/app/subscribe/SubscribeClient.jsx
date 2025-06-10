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
  const [clientReference, setClientReference] = useState('')

  // Extract query parameters
  const groupId = searchParams.get('groupId')
  const groupName = searchParams.get('groupName') || ''
  const amount = searchParams.get('amount')
  const duration = searchParams.get('duration')
  const telegramId = searchParams.get('userId') || ''

  // Form state
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Generate a client-side reference ID
  const generateReference = () => {
    return `BNPay-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  }

  const handleOnClose = (response) => {
    console.log('Payment Closed:', response)
    if (!isSuccess) {
      setIsProcessing(false)
    }
  }

  const handleOnSuccess = async (response) => {
    console.log('Payment Success:', response)
    setIsProcessing(true)
    setError(null)

    try {
      // Update the payment record with the actual Bani reference
      const updateRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/update-reference`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempReference: clientReference,
          baniReference: response.reference,
          status: 'processing'
        }),
      })

      if (!updateRes.ok) {
        throw new Error('Failed to update payment reference')
      }

      // Poll for payment confirmation
      const maxAttempts = 10
      let attempts = 0
      let status = 'pending'

      while (attempts < maxAttempts) {
        const statusRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/status?ref=${response.reference}`
        )
        const statusData = await statusRes.json()
        status = statusData.status
        
        if (status === 'successful') break
        await new Promise(resolve => setTimeout(resolve, 2000))
        attempts++
      }

      if (status === 'successful') {
        setIsSuccess(true)
        setIsProcessing(false)
        router.push({
          pathname: '/subscribe/success',
          query: { groupId, amount },
        })
      } else {
        setError('Payment processing is taking longer than expected. Please check back later.')
        setIsProcessing(false)
      }
    } catch (err) {
      console.error('Payment confirmation error:', err)
      setError('Payment was successful but confirmation failed. Please contact support with your reference.')
      setIsProcessing(false)
    }
  }

  const handlePay = async () => {
    if (isSuccess) return

    // Validate all required fields
    if (!amount || !email || !phone || !firstName || !lastName || !groupId || !telegramId || !duration) {
      alert('Please fill all required fields')
      return
    }

    // Validate phone number
    let formattedPhone = phone.trim()
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+234' + formattedPhone.slice(1)
    }

    if (!/^\+234\d{10}$/.test(formattedPhone)) {
      alert('Please enter a valid Nigerian phone number starting with 0')
      return
    }

    const merchantKey = process.env.NEXT_PUBLIC_BANI_PUBLIC_KEY
    if (!merchantKey) {
      alert('Payment system error. Please contact support.')
      return
    }

    setIsProcessing(true)
    const reference = generateReference()
    setClientReference(reference)

    try {
      // Create initial pending payment record
      const recordRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          telegramId,
          groupId,
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
        throw new Error('Failed to initialize payment')
      }

      // Launch Bani payment popup
      BaniPopUp({
        amount: amount.toString(),
        email,
        phoneNumber: formattedPhone,
        firstName,
        lastName,
        merchantKey,
        metadata: { 
          groupId, 
          duration, 
          telegramId,
          clientReference: reference // Include our reference in metadata
        },
        onClose: handleOnClose,
        callback: handleOnSuccess,
      })

    } catch (err) {
      console.error('Payment initiation error:', err)
      setError('Failed to start payment process. Please try again.')
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
          <span>Amount:</span>
          <span>₦{amount}</span>
        </div>
        <div className={styles.summaryItem}>
          <span>Duration:</span>
          <span>{duration}</span>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="firstName">First Name</label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="John"
          required
          disabled={isSuccess}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="lastName">Last Name</label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Doe"
          required
          disabled={isSuccess}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={isSuccess}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="phone">Phone Number</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="08000111111"
          required
          disabled={isSuccess}
        />
        <p className={styles.hint}>We'll convert it to +234 format</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button
        onClick={handlePay}
        disabled={isProcessing || isSuccess}
        className={isSuccess ? styles.success : isProcessing ? styles.processing : ''}
      >
        {isSuccess ? 'Payment Successful!' : 
         isProcessing ? <><span className={styles.spinner} /> Processing...</> : 
         'Pay Now'}
      </button>
    </div>
  )
}