'use client'
import { Button, Input, AuthCard } from 'threadcub-design-system'

export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Component Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Button Test</h2>
        <Button onClick={() => alert('Button clicked!')}>
          Test Button
        </Button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Input Test</h2>
        <Input 
          label="Test Input" 
          placeholder="Type here..."
          onChange={(e) => console.log('Input changed:', e.target.value)}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>AuthCard Test</h2>
        <AuthCard>
          <p>Test content inside AuthCard</p>
        </AuthCard>
      </div>
    </div>
  )
}