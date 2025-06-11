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
    setMounted(true)
    const timer = setTimeout(() => setLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

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

  const handlePaymentSuccess = (response) => {
    setPaymentStatus('success')
    setPaymentData({
      reference: response.reference,
      amount,
      groupId,
      telegramId
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

    const formattedPhone = validateInputs()
    if (!formattedPhone) return

    const merchantKey = process.env.NEXT_PUBLIC_BANI_PUBLIC_KEY
    if (!merchantKey) {
      alert('Payment system error. Please contact support.')
      return
    }

    setIsProcessing(true)
    setPaymentStatus('processing')
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
        callback: (response) => {
          console.log('Bani callback:', response)
          
          if (['successful', 'completed', 'paid'].includes(response.status)) {
            handlePaymentSuccess(response)
          } 
          else if (['pending', 'payment_processing'].includes(response.status)) {
            // Start polling if payment is processing
            startPaymentVerification(response.reference)
          }
          else {
            handlePaymentFailure(response.message)
          }
        }
      })

    } catch (err) {
      console.error('Payment error:', err)
      handlePaymentFailure(err.message)
    }
  }

  const startPaymentVerification = (paymentRef) => {
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
          handlePaymentFailure('Payment verification failed')
          clearInterval(intervalId)
        }
      } catch (err) {
        console.error('Verification error:', err)
      }
    }

    // Check immediately and then every 5 seconds
    verifyPayment()
    const intervalId = setInterval(verifyPayment, 5000)
    
    // Return cleanup function
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
        {[...Array(7)].map((_, i) => (
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
            <p><strong>Reference:</strong> {paymentData.reference}</p>
            <p><strong>Amount:</strong> ₦{paymentData.amount}</p>
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

      {paymentStatus !== 'success' && (
        <>
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

          {/* Other form fields (lastName, email, phone) */}

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
        </>
      )}
    </div>
  )
}