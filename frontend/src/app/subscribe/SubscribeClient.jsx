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
    console.log('Payment modal closed with response:', JSON.stringify(response, null, 2))
    if (!isSuccess) {
      console.log('Payment was not successful, setting isProcessing to false')
      setIsProcessing(false)
    } else {
      console.log('Payment was already successful, keeping state')
    }
  }

  const handleOnSuccess = async (response) => {
    console.log('Payment success handler triggered with response:', JSON.stringify(response, null, 2))
    
    try {
      setIsSuccess(true)
      console.log('Success state set to true, preparing redirect...')
      
      const redirectUrl = `/subscribe/success?reference=${response.reference}&groupId=${groupId}&amount=${amount}&telegramId=${telegramId}`
      console.log('Attempting redirect to:', redirectUrl)
      
      router.push(redirectUrl)
      console.log('Router.push called successfully')
    } catch (err) {
      console.error('Redirect error:', err)
      setError(`Payment succeeded, but redirection failed. Reference: ${response.reference}`)
      setIsProcessing(false)
    } finally {
      console.log('Success handler completed')
    }
  }

  const validateInputs = () => {
    console.log('Validating inputs...')
    
    if (!amount || !email || !phone || !firstName || !lastName) {
      console.log('Validation failed: Missing required fields')
      alert('Please fill all required fields')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log('Validation failed: Invalid email format')
      alert('Please enter a valid email address')
      return false
    }

    let formattedPhone = phone.trim()
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+234' + formattedPhone.slice(1)
    }

    if (!/^\+234\d{10}$/.test(formattedPhone)) {
      console.log('Validation failed: Invalid phone number format')
      alert('Please enter a valid Nigerian phone number (e.g. 08012345678)')
      return false
    }

    console.log('Input validation passed')
    return formattedPhone
  }

  const handlePay = async () => {
    console.log('Pay button clicked')
    
    if (isSuccess) {
      console.log('Payment already succeeded, ignoring click')
      return
    }

    const formattedPhone = validateInputs()
    if (!formattedPhone) {
      console.log('Cannot proceed with payment due to validation errors')
      return
    }

    const merchantKey = process.env.NEXT_PUBLIC_BANI_PUBLIC_KEY
    if (!merchantKey) {
      console.error('Missing merchant key')
      alert('Payment system error. Please contact support.')
      return
    }

    console.log('Starting payment process...')
    setIsProcessing(true)
    setError(null)

    try {
      console.log('Recording payment in database...')
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
        const errorText = await recordRes.text()
        console.error('Payment record failed:', errorText)
        throw new Error(errorText || 'Failed to initialize payment')
      }

      const { payment } = await recordRes.json()
      console.log('Payment recorded successfully:', payment)

      console.log('Opening Bani payment popup...')
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
        onClose: (response) => {
          console.log('Bani onClose callback:', JSON.stringify(response, null, 2))
          handleOnClose(response)
        },
        callback: (response) => {
          console.log('Bani main callback received:', JSON.stringify(response, null, 2))
          console.log('Response status:', response.status)
          
          if (response.status === 'successful') {
            console.log('Payment successful, calling handleOnSuccess')
            handleOnSuccess(response)
          } else if (response.status === 'pending') {
            console.log('Payment pending')
            setIsProcessing(false)
            setError('Payment is pending confirmation. We will notify you when completed.')
          } else {
            console.log('Payment failed or was cancelled')
            if (!isSuccess) {
              setIsProcessing(false)
              setError('Payment failed or was cancelled')
            }
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
    console.log('Rendering loading state')
    return (
      <div className={styles.container}>
        <div className={styles.skeletonHeader}></div>
        {[...Array(7)].map((_, i) => (
          <div key={i} className={styles.skeletonLine}></div>
        ))}
      </div>
    )
  }

  console.log('Rendering main component UI')
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
          {error.includes('reference') && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(error.split(': ')[1])
                console.log('Reference copied to clipboard')
              }}
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