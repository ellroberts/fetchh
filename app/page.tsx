'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'

export default function Home() {
  return (
    <main style={{
      background: '#F7F6F4',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 16px',
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E5E5E5',
        borderRadius: 12,
        padding: '40px 32px',
        width: '100%',
        maxWidth: 480,
        textAlign: 'center',
      }}>
        <img src="/digestt-logo.svg" alt="Digestt" style={{ height: 32, marginBottom: 24 }} />
        <p style={{ margin: 0, fontSize: 16, color: '#555' }}>Sign up is coming soon.</p>
      </div>
    </main>
  )
}
