'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseClient();
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const code = searchParams.get('code');

      // PKCE code flow
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        router.replace('/dashboard');
        return;
      }

      // Token hash flow (password recovery)
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });

        if (error) {
          router.replace('/auth/reset-password?error=invalid_token');
          return;
        }

        if (type === 'recovery') {
          router.replace('/auth/update-password');
          return;
        }

        router.replace('/dashboard');
        return;
      }

      // Fallback — hash fragment tokens (legacy)
      const hash = window.location.hash.slice(1);
      const p = new URLSearchParams(hash);
      const access_token = p.get('access_token');
      const refresh_token = p.get('refresh_token');
      const hashType = p.get('type');

      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        if (hashType === 'recovery') {
          router.replace('/auth/update-password');
        } else {
          router.replace('/dashboard');
        }
        return;
      }

      router.replace('/auth/reset-password?error=missing_tokens');
    })();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}