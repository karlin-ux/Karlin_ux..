import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

declare global {
  interface Window {
    google?: any;
  }
}

type Props = {
  onCredential: (credential: string) => Promise<void> | void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  disabled?: boolean;
};

let gisScriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gis="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gis = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

export default function GoogleSignInButton({ onCredential, text = 'continue_with', disabled }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [clientId, setClientId] = useState<string>((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function resolveClientId() {
      if (clientId) return clientId;
      try {
        const r = await api.get('/auth/config/');
        const id = r?.data?.google_client_id || '';
        if (mounted) setClientId(id);
        return id;
      } catch {
        return '';
      }
    }
    (async () => {
      const id = await resolveClientId();
      if (!mounted) return;
      if (!id) {
        setError('');
        return;
      }
      try {
        await loadGisScript();
        if (!mounted) return;
        setReady(true);
      } catch {
        if (mounted) setError('Google sign-in is unavailable.');
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready || !clientId || !containerRef.current || !window.google?.accounts?.id) return;
    try {
      containerRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          const credential = response?.credential;
          if (!credential || loading || disabled) return;
          setError('');
          setLoading(true);
          try {
            await onCredential(credential);
          } catch (e: any) {
            setError(e?.response?.data?.detail || 'Google sign-in failed.');
          } finally {
            setLoading(false);
          }
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text,
        width: 320,
        logo_alignment: 'left',
      });
    } catch {
      setError('Google sign-in could not be initialized.');
    }
  }, [ready, clientId, text, disabled]);

  if (!clientId) return null;

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="flex justify-center [&>div]:w-full [&>div]:flex [&>div]:justify-center" aria-busy={loading} />
      {error && <p className="text-xs text-[var(--error)] text-center">{error}</p>}
    </div>
  );
}
