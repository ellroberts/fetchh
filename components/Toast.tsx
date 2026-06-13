// components/Toast.tsx
'use client'
import React, { useEffect, useState } from 'react'
import { Alert } from './Alert'

export interface ToastProps {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  onClose: () => void
  duration?: number
}

export const Toast: React.FC<ToastProps> = ({
  type,
  message,
  onClose,
  duration = 3500,
}) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(show)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: visible
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(24px)',
        zIndex: 100,
        maxWidth: '420px',
        minWidth: '280px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Alert
        type={type}
        size="md"
        shadow="lg"
        onClose={() => {
          setVisible(false)
          setTimeout(onClose, 300)
        }}
      >
        {message}
      </Alert>
    </div>
  )
}
