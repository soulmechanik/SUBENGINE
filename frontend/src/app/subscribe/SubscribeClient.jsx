'use client'

import { useSearchParams } from 'next/navigation'
import useCheckout from 'bani-react'
import { useEffect, useState } from 'react'
import styles from './subscribe.module.scss'

export default function SubscribePage() {
  const searchParams = useSearchParams()
  const { BaniPopUp } = useCheckout()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('idle') // 'idle' | 'processing' | 'success' | 'failed'
  const [error, setError] = useState(null)
  const [paymentData, setPaymentData] = useState(null)

  // Get parameters from URL
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
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('Nigeria')

  const reference = `BNI-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const validateInputs = () => {
    // Required fields validation
    if (!amount || !email || !phone || !firstName || !lastName || !address || !city || !state) {
      alert('Please fill all required fields')
      return false
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email address')
      return false
    }

    // Phone number validation and formatting
    let formattedPhone = phone.trim()
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+234' + formattedPhone.slice(1)
    }

    if (!/^\+234\d{10}$/.test(formattedPhone)) {
      alert('Please enter a valid Nigerian phone number (e.g. 08012345678)')
      return false
    }

    return {
      formattedPhone,
      customerData: {
        email,
        phone: formattedPhone,
        firstName,
        lastName,
        address,
        city,
        state,
        country
      }
    }
  }

  const handlePaymentSuccess = (response) => {
    setPaymentStatus('success')
    setPaymentData({
      reference: response.reference,
      amount,
      groupName,
      date: new Date().toLocaleString()
    })
    setIsProcessing(false)
  }

  const handlePaymentFailure = (message) => {
    setPaymentStatus('failed')
    setError(message || 'Payment failed. Please try again.')
    setIsProcessing(false)
  }

  const handlePay = async () => {
    if (paymentStatus === 'success') return

    const validation = validateInputs()
    if (!validation) return

    const { formattedPhone, customerData } = validation

    const merchantKey = process.env.NEXT_PUBLIC_BANI_PUBLIC_KEY
    if (!merchantKey) {
      alert('Payment system error. Please contact support.')
      return
    }

    setIsProcessing(true)
    setPaymentStatus('processing')
    setError(null)

    try {
      // Record payment in your database
      const recordRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          telegramId,
          group: groupId,
          amount: Number(amount),
          duration,
          customerData,
          status: 'pending'
        }),
      })

      if (!recordRes.ok) {
        throw new Error(await recordRes.text() || 'Failed to initialize payment')
      }

      // Initialize Bani payment
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
          internalReference: reference,
          customerData
        },
        callback: (response) => {
          console.log('Bani callback:', response)
          
          if (['successful', 'completed', 'paid'].includes(response.status)) {
            handlePaymentSuccess(response)
          } 
          else if (['pending', 'payment_processing'].includes(response.status)) {
            startPaymentVerification(response.reference)
          }
          else {
            handlePaymentFailure(response.message || 'Payment could not be completed')
          }
        }
      })

    } catch (err) {
      console.error('Payment error:', err)
      handlePaymentFailure(err.message || 'An unexpected error occurred')
    }
  }

  const startPaymentVerification = (paymentRef) => {
    let intervalId

    const verifyPayment = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: paymentRef })
        })

        const data = await res.json()
        
        if (data.status === 'successful') {
          handlePaymentSuccess(data)
          clearInterval(intervalId)
        } else if (['failed', 'cancelled'].includes(data.status)) {
          handlePaymentFailure(data.message || 'Payment verification failed')
          clearInterval(intervalId)
        }
      } catch (err) {
        console.error('Verification error:', err)
      }
    }

    // Check immediately and then every 5 seconds
    verifyPayment()
    intervalId = setInterval(verifyPayment, 5000)
    
    // Cleanup function
    return () => clearInterval(intervalId)
  }

  const resetPayment = () => {
    setPaymentStatus('idle')
    setPaymentData(null)
    setError(null)
  }

  if (loading || !mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonHeader}></div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className={styles.skeletonLine}></div>
        ))}
      </div>
    )
  }

  if (paymentStatus === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.successMessage}>
          <h1>🎉 Payment Successful!</h1>
          <p>You've successfully subscribed to {groupName}.</p>
          
          <div className={styles.paymentDetails}>
            <div className={styles.detailRow}>
              <span>Reference:</span>
              <span>{paymentData.reference}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Amount:</span>
              <span>₦{paymentData.amount}</span>
            </div>
            <div className={styles.detailRow}>
              <span>Date:</span>
              <span>{paymentData.date}</span>
            </div>
          </div>

          <button 
            onClick={resetPayment}
            className={styles.returnButton}
          >
            Make Another Payment
          </button>
        </div>
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

      {paymentStatus === 'failed' && (
        <div className={styles.errorMessage}>
          <p>⚠️ {error}</p>
          <button onClick={resetPayment} className={styles.tryAgainButton}>
            Try Again
          </button>
        </div>
      )}

      <div className={styles.formGroup}>
        <label>First Name *</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={isProcessing}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>Last Name *</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={isProcessing}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>Email Address *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isProcessing}
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
          disabled={isProcessing}
          required
        />
        <small>We'll automatically convert to +234 format</small>
      </div>

      <div className={styles.formGroup}>
        <label>Address *</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={isProcessing}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>City *</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={isProcessing}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>State *</label>
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
          disabled={isProcessing}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label>Country</label>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled
        />
      </div>

      <button
        onClick={handlePay}
        disabled={isProcessing}
        className={isProcessing ? styles.processing : ''}
      >
        {isProcessing ? (
          <>
            <span className={styles.spinner}></span>
            Processing Payment...
          </>
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