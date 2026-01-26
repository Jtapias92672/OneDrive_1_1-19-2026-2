/**
 * FORGE Platform UI - Login Page
 * @epic 10e - Auth + Admin
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Shield, Loader2 } from 'lucide-react';

type LoginStep = 'credentials' | 'mfa';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [mfaCode, setMfaCode] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));

    // For demo, check if MFA is "required"
    if (credentials.email.includes('mfa')) {
      setStep('mfa');
      setIsLoading(false);
      return;
    }

    // Simulate successful login
    if (credentials.email && credentials.password) {
      router.push('/dashboard');
    } else {
      setError('Invalid email or password');
    }
    setIsLoading(false);
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    await new Promise(r => setTimeout(r, 1000));

    if (mfaCode.length === 6) {
      router.push('/dashboard');
    } else {
      setError('Invalid verification code');
    }
    setIsLoading(false);
  };

  const handleSsoLogin = (provider: string) => {
    console.log('SSO login with:', provider);
    // Would redirect to OAuth provider
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-white">FORGE</h1>
          <p className="text-slate-400 mt-2">Contract-Driven Agent Reliability</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'credentials' ? (
            <>
              <h2 className="text-xl font-semibold mb-6">Sign in to your account</h2>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Credentials Form */}
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={credentials.rememberMe}
                      onChange={(e) => setCredentials({ ...credentials, rememberMe: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Remember me</span>
                  </label>
                  <a href="#" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* SSO Options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSsoLogin('google')}
                  className="flex items-center justify-center gap-2 py-2.5 border rounded-lg hover:bg-muted transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
                <button
                  onClick={() => handleSsoLogin('github')}
                  className="flex items-center justify-center gap-2 py-2.5 border rounded-lg hover:bg-muted transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              </div>

              {/* SAML Link */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => handleSsoLogin('saml')}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign in with SSO (SAML)
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">Two-factor authentication</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter the 6-digit code from your authenticator app
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-2xl tracking-[0.5em] py-4 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || mfaCode.length !== 6}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="w-full py-2.5 text-muted-foreground hover:text-foreground"
                >
                  Back to login
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          © 2025 ArcFoundry. All rights reserved.
        </p>
      </div>
    </div>
  );
}
