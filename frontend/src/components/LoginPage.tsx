import { Button, Input, Switch, Text } from '@cloudflare/kumo'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import { BrandMark } from './BrandMark'

export function LoginPage() {
  const { login } = useAuth()
  const { isDark, setMode } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Sign in failed. Try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-kumo-canvas px-4 py-10">
      <div className="absolute top-4 right-4">
        <Switch
          variant="neutral"
          size="sm"
          label="Dark"
          checked={isDark}
          onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
        />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <BrandMark variant="full" className="max-w-[320px]" />
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-5 rounded-lg border border-kumo-line bg-kumo-elevated p-8"
        >
          <div>
            <Text as="h1" variant="heading" size="lg">
              Welcome back
            </Text>
            <Text
              as="p"
              variant="secondary"
              size="sm"
              DANGEROUS_className="mt-1"
            >
              Sign in to your farm workspace
            </Text>
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={submitting}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={submitting}
          />

          {error ? (
            <Text
              as="p"
              variant="secondary"
              size="sm"
              DANGEROUS_className="text-kumo-danger"
              role="alert"
            >
              {error}
            </Text>
          ) : null}

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
