'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function ExtensionLoginPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/auth?mode=signin&from=extension')
  }, [router])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-page-bg)' }}>
      <Loader2 size={32} style={{ color: 'var(--color-primary-500)', animation: 'spin 1s linear infinite' }} />
    </div>
  )
}
