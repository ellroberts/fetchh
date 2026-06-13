'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, MessageSquare, MessageSquareText, FolderOpen, PawPrint, LibraryBig, GitBranch, Bot, Sparkles, Hammer, FlaskConical, Briefcase, BookOpen } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { CookieBanner } from '@/components/CookieBanner'
import { Button } from '@/components/Button'

const NAV_ITEMS = [
  {
    label: 'Features',
    dropdown: [
      { label: 'Dashboard',  href: '/features', icon: LayoutDashboard, color: 'var(--color-primary-500)' },
      { label: 'Chats',      href: '/features', icon: MessageSquare,    color: 'var(--color-accent-teal)' },
      { label: 'Threads',    href: '/features', icon: MessageSquareText,color: 'var(--color-accent-teal)',  soon: true },
      { label: 'Projects',   href: '/features', icon: FolderOpen,       color: 'var(--color-accent-rose)' },
      { label: 'Storyline',  href: '/features', icon: GitBranch,        color: 'var(--color-accent-purple)', soon: true },
      { label: 'Ask Coda',   href: '/features', icon: Bot,              color: 'var(--color-primary-500)' },
      { label: 'Insights',   href: '/features', icon: Sparkles,         color: 'var(--color-accent-amber)' },
      { label: 'Pawmarks',   href: '/features', icon: PawPrint,         color: 'var(--color-accent-amber)' },
      { label: 'Library',    href: '/features', icon: LibraryBig,       color: 'var(--color-bear-500)',     soon: true },
    ],
  },
  {
    label: 'Use cases',
    dropdown: [
      { label: 'Builders & indie hackers', href: '/use-cases/builders',    icon: Hammer,       color: 'var(--color-accent-rose)' },
      { label: 'Researchers',              href: '/use-cases/researchers', icon: FlaskConical,  color: 'var(--color-accent-teal)' },
      { label: 'Consultants',              href: '/use-cases/consultants', icon: Briefcase,     color: 'var(--color-accent-amber)' },
      { label: 'Lifelong learners',        href: '/use-cases/learners',    icon: BookOpen,      color: 'var(--color-primary-500)' },
    ],
  },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog',    href: 'https://substack.com/@threadcub', external: true },
]

function DropdownMenu({ items }: { items: { label: string; href: string; icon?: React.ElementType; color?: string; soon?: boolean }[] }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 12px)', left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--color-surface-raised)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--border-radius-xl)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      padding: 'var(--spacing-2)',
      minWidth: '260px',
      zIndex: 100,
    }}>
      {items.map(item => {
        const Icon = item.icon
        return (
          <Link key={item.label} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
              padding: 'var(--spacing-2) var(--spacing-3)',
              borderRadius: 'var(--border-radius-lg)',
              transition: 'var(--transition-base)',
              display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-state-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              {Icon && (
                <span style={{ color: item.color || 'var(--color-icon-default)', display: 'flex', flexShrink: 0 }}>
                  <Icon size={18} />
                </span>
              )}
              <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-title)' }}>
                {item.label}
              </span>
              {item.soon && (
                <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-muted)', background: 'var(--color-surface-sunken)', borderRadius: '4px', padding: '1px 6px', marginLeft: 'auto', letterSpacing: '0.04em' }}>
                  Soon
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function NavItem({ item }: { item: { label: string; href?: string; external?: boolean; dropdown?: { label: string; href: string; icon?: React.ElementType; color?: string; soon?: boolean }[] } }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!item.dropdown) {
    return (
      <Link
        href={item.href!}
        target={item.external ? '_blank' : undefined}
        rel={item.external ? 'noopener' : undefined}
        style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', textDecoration: 'none', padding: 'var(--spacing-2) var(--spacing-3)', borderRadius: 'var(--border-radius-lg)', transition: 'var(--transition-base)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-title)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)',
          fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)',
          color: open ? 'var(--color-text-title)' : 'var(--color-text-secondary)',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 'var(--spacing-2) var(--spacing-3)',
          borderRadius: 'var(--border-radius-lg)',
          transition: 'var(--transition-base)',
          fontFamily: 'var(--font-family-primary)',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-title)'}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
      >
        {item.label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'var(--transition-base)' }}>
          <path d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && <DropdownMenu items={item.dropdown} />}
    </div>
  )
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-surface-page)', minHeight: '100vh', fontFamily: 'var(--font-family-primary)' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: '64px',
        padding: '0 var(--spacing-10)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(230, 226, 219, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', textDecoration: 'none' }}>
          <Logo size="sm" />
          <span style={{ fontFamily: 'var(--font-family-title)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-title)' }}>
            ThreadCub
          </span>
        </Link>

        {/* Centre nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
          {NAV_ITEMS.map(item => <NavItem key={item.label} item={item} />)}
        </div>

        {/* Auth CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <Link href="/auth?mode=signin"
            style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'var(--transition-base)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-title)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'}
          >
            Sign in
          </Link>
          <Link href="/auth?mode=signup">
            <Button size="sm">Sign up</Button>
          </Link>
        </div>

      </nav>

      {/* Page content — offset for fixed nav */}
      <div style={{ paddingTop: '64px' }}>
        {children}
      </div>
      <CookieBanner />

    </div>
  )
}
