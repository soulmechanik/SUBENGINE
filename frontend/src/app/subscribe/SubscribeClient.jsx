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
  const [paymentId, setPaymentId] = useState(null)

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
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleOnClose = (response) => {
    console.log('Payment closed:', response)
    if (!isSuccess) {
      setIsProcessing(false)
    }
  }

  const handleOnSuccess = async (response) => {
    setIsProcessing(true)
    setError(null)

    try {
      const updateRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          reference: response.reference,
          status: 'successful'
        }),
      })

      if (!updateRes.ok) {
        throw new Error('Failed to confirm payment')
      }

      setIsSuccess(true)
      router.push({
        pathname: '/subscribe/success',
        query: { groupId, amount },
      })

    } catch (err) {
      console.error('Payment confirmation error:', err)
      setError('Payment successful but confirmation failed. Your reference: ' + response.reference)
      setIsProcessing(false)
    }
  }

  const handlePay = async () => {
    if (isSuccess) return

    // Validate inputs
    if (!amount || !email || !phone || !firstName || !lastName || !groupId || !telegramId || !duration) {
      alert('Please fill all required fields')
      return
    }

    // Format phone number
    let formattedPhone = phone.trim()
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+234' + formattedPhone.slice(1)
    }

    if (!/^\+234\d{10}$/.test(formattedPhone)) {
      alert('Please enter a valid Nigerian phone number')
      return
    }

    const merchantKey = process.env.NEXT_PUBLIC_BANI_PUBLIC_KEY
    if (!merchantKey) {
      alert('Payment system error. Please contact support.')
      return
    }

    setIsProcessing(true)

    try {
      // Create initial payment record
      const recordRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          groupId,
          amount: Number(amount),
          duration,
          email,
          phone: formattedPhone,
          firstName,
          lastName,
          status: 'initiated'
        }),
      })

      if (!recordRes.ok) {
        throw new Error('Failed to initialize payment')
      }

      const { _id } = await recordRes.json()
      setPaymentId(_id)

      // Launch Bani payment
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
          paymentId: _id // Include DB ID in metadata
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
        <div><span>Duration:</span> {duration}</div>
      </div>

      <div className={styles.formGroup}>
        <label>First Name</label>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={isSuccess}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>Last Name</label>
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={isSuccess}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSuccess}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isSuccess}
          required
        />
        <p>We'll convert it to +234 format</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button
        onClick={handlePay}
        disabled={isProcessing || isSuccess}
        className={isProcessing ? styles.processing : isSuccess ? styles.success : ''}
      >
        {isProcessing ? 'Processing...' : isSuccess ? 'Success!' : 'Pay Now'}
      </button>
    </div>
  )
}