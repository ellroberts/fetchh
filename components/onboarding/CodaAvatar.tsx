'use client'
import React from 'react'
import Image from 'next/image'

export function CodaAvatar({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt="Coda"
      width={80}
      height={80}
      className="onboarding-avatar"
    />
  )
}
