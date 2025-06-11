import { Suspense } from 'react'
import SuccessClient from './SuccessClient'

export default function SuccessPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <Suspense fallback={<p>Verifying your payment...</p>}>
        <SuccessClient />
      </Suspense>
    </div>
  )
}
