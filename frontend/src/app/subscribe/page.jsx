import { Suspense } from 'react'
import SubscribeClient from './SubscribeClient'

export default function SubscribePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SubscribeClient />
    </Suspense>
  )
}
