'use client'

// app/(dashboard)/settings/api-keys/page.tsx

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '../../../../lib/supabase'
import { PageHeader } from '../../../../components/layout/PageHeader'
import { Button } from '../../../../components/Button'

interface ApiKeyRecord {
  id: string
  key_value: string
  name: string
  created_at: string
  last_used_at: string | null
}

export default function ApiKeysPage() {
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [existingKey, setExistingKey] = useState<ApiKeyRecord | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [copyConfigLabel, setCopyConfigLabel] = useState('Copy')
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    loadKey()
  }, [])

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const loadKey = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const token = await getToken()
      const res = await fetch('/api/api-keys', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setExistingKey(data.key ?? null)
    } catch (err) {
      console.error('Failed to load API key:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateKey = async () => {
    setWorking(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.key_value) {
        setNewKey(data.key_value)
        setExistingKey({ id: '', key_value: data.key_value, name: 'Default', created_at: new Date().toISOString(), last_used_at: null })
      }
    } catch (err) {
      console.error('Failed to generate API key:', err)
    } finally {
      setWorking(false)
    }
  }

  const deleteKey = async () => {
    if (!confirm('Delete your API key? Claude desktop connections using it will stop working.')) return
    setWorking(true)
    try {
      const token = await getToken()
      await fetch('/api/api-keys', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setExistingKey(null)
      setNewKey(null)
    } catch (err) {
      console.error('Failed to delete API key:', err)
    } finally {
      setWorking(false)
    }
  }

  const copyKey = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopyLabel('Copied!')
    setTimeout(() => setCopyLabel('Copy'), 2000)
  }

  const configSnippet = (key: string) => JSON.stringify({
    mcpServers: {
      threadcub: {
        url: 'https://threadcub.com/api/mcp',
        headers: { Authorization: `Bearer ${key}` },
      },
    },
  }, null, 2)

  const copyConfig = () => {
    const key = newKey ?? existingKey?.key_value
    if (!key) return
    navigator.clipboard.writeText(configSnippet(key))
    setCopyConfigLabel('Copied!')
    setTimeout(() => setCopyConfigLabel('Copy'), 2000)
  }

  const displayKey = newKey ?? existingKey?.key_value

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-8)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--color-border-default)', borderTopColor: 'var(--color-primary-500)', animation: 'spin 0.75s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--spacing-8)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', fontFamily: 'var(--font-family-primary)' }}>

      <PageHeader title="API Keys" subtitle="Connect Claude desktop to your ThreadCub account" sticky={false} />

      {/* Key management card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)', backgroundColor: 'var(--color-surface-default)', borderRadius: 'var(--border-radius-base)', border: '1px solid var(--color-border-default)', padding: 'var(--spacing-6)' }}>
        <div>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Generate a permanent API key to connect the ThreadCub MCP server to Claude desktop — no config file editing required.
          </p>
        </div>

        {/* Current key status */}
        {existingKey && !newKey && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', padding: 'var(--spacing-3) var(--spacing-4)', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-border-default)' }}>
            <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', flex: 1 }}>
              tc_••••••••••••••••
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              Created {new Date(existingKey.created_at).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Newly generated key — show once */}
        {newKey && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', padding: 'var(--spacing-4)', backgroundColor: 'var(--color-alert-success-bg)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-accent-green)' }}>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-alert-success-text)' }}>
              Copy this key now — it won&apos;t be shown again.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <code style={{ flex: 1, fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-title)', backgroundColor: 'var(--color-page-bg)', padding: 'var(--spacing-2) var(--spacing-3)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-border-default)', wordBreak: 'break-all' }}>
                {newKey}
              </code>
              <Button variant="secondary" size="sm" onClick={copyKey}>{copyLabel}</Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          {!existingKey ? (
            <Button variant="primary" onClick={generateKey} loading={working}>
              Generate API Key
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={generateKey} loading={working}>
                Regenerate
              </Button>
              <Button variant="danger" onClick={deleteKey} loading={working}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Claude desktop setup instructions */}
      {displayKey && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', backgroundColor: 'var(--color-surface-default)', borderRadius: 'var(--border-radius-base)', border: '1px solid var(--color-border-default)', padding: 'var(--spacing-6)' }}>
          <div>
            <h2 style={{ margin: '0 0 var(--spacing-1)', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-title)' }}>
              Claude Desktop Setup
            </h2>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Add the following to your <code style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-xs)' }}>claude_desktop_config.json</code>:
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <pre style={{ margin: 0, padding: 'var(--spacing-4)', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-border-default)', fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-body)', overflowX: 'auto', lineHeight: '1.6' }}>
              {configSnippet(displayKey)}
            </pre>
            <div style={{ position: 'absolute', top: 'var(--spacing-2)', right: 'var(--spacing-2)' }}>
              <Button variant="secondary" size="sm" onClick={copyConfig}>{copyConfigLabel}</Button>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            After saving, restart Claude desktop and ThreadCub will appear in your MCP tools.
          </p>
        </div>
      )}

    </div>
  )
}
