'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FaEnvelope } from 'react-icons/fa'

export default function Home() {
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <main className="min-h-screen bg-[#FAF9F7] flex flex-col items-center justify-center px-4 text-center">
      <div className="h-10 mb-6">
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm max-w-sm w-full">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded text-sm max-w-sm w-full">
            {successMessage}
          </div>
        )}
      </div>

      <Image
        src="/threadcub.svg"
        alt="Threadcub Logo"
        width={128}
        height={128}
        className="mb-4"
      />
      <h1 className="text-[56px] font-bold text-[#6F3F11] font-['Averia_Sans_Libre']">
        Threadcub
      </h1>
      <p className="text-lg text-[#333044] font-medium font-karla mb-12">
        Tiny paws, mighty exports
      </p>
{/*
      <h2 className="text-2xl text-[#333044] font-bold font-['Averia_Sans_Libre'] mb-2">
        Find it hard to manage all those <br />super long AI chats?
      </h2>
      <p className="text-base text-[#333044] font-medium font-karla max-w-md mb-8">
        We've been busy building a few surprisingly seamless ways of keeping organised. 
        If you'd like to try it out early we'd love you to give it a whirl.
      </p>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const form = e.currentTarget
          const formData = new FormData(form)
          const email = formData.get('email') as string
          const website = formData.get('website') as string

          if (website) return

          setIsSubmitting(true)
          setErrorMessage('')
          setSuccessMessage('')

          try {
            const response = await fetch('/api/send-welcome-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                email,
                source: 'landing-page'
              }),
            })
            const data = await response.json()

            if (data.success) {
              setSuccessMessage("See you at the den!")
              setTimeout(() => setSuccessMessage(''), 4000)
              form.reset()
            } else {
              setErrorMessage(data.error || 'Oops! Something went wrong.')
              setTimeout(() => setErrorMessage(''), 4000)
            }
          } catch (err) {
            console.error('Email failed:', err)
            setErrorMessage('Oops! Something went wrong.')
            setTimeout(() => setErrorMessage(''), 4000)
          } finally {
            setIsSubmitting(false)
          }
        }}
        className="flex items-center justify-center w-full max-w-md"
      >
        <div className="relative flex-grow">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A5ACB6]">
            <FaEnvelope />
          </div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="pl-10 pr-4 h-10 w-full border border-[#A5ACB6] rounded-[4px] text-sm font-karla placeholder-[#A5ACB6] focus:outline-none focus:ring-1 focus:ring-[#7B3AE1] focus:border-[#7B3AE1]"
          />
          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ml-3 h-10 px-4 rounded-[4px] bg-[#7B3AE1] text-white font-bold text-sm hover:bg-purple-700 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Joining...' : 'SNEAK PEEK'}
        </button>
      </form>

      
<p className="text-sm text-muted-foreground mt-6">
  Already got access?{' '}
  <Link href="/auth?mode=signin" className="underline hover:text-black">
    Sign in here
  </Link>
</p>
*/}
    </main>
  )
}