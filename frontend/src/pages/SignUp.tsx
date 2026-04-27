import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function SignUp() {
  const [mode, setMode] = useState<'choose' | 'email'>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { demoLogin, isDemo } = useAuth();

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isDemo) { demoLogin(); navigate('/'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      if (msg.includes('email-already-in-use')) setError('An account with this email already exists');
      else if (msg.includes('invalid-email')) setError('Please enter a valid email');
      else if (msg.includes('weak-password')) setError('Password must be at least 6 characters');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    if (isDemo) { demoLogin(); navigate('/'); return; }
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (!msg.includes('popup-closed')) setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(220 15% 8%)' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 1.5rem' }}>
        <h1 className="text-3xl font-bold text-white text-center" style={{ marginBottom: '2rem' }}>Sign up</h1>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
            <p style={{ fontSize: '13px', color: '#f87171' }}>{error}</p>
          </div>
        )}

        {mode === 'choose' ? (
          <>
            <button
              onClick={handleGoogle}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 600, fontSize: '15px',
                backgroundColor: '#ffffff', color: '#1f1f1f', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign in with Google
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                onClick={() => setMode('email')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'hsl(var(--accent))', fontWeight: 600 }}
              >
                Sign up with email
              </button>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleEmail}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="block text-sm text-gray-300" style={{ marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field"
                  style={{ width: '100%', padding: '12px 14px', fontSize: '15px' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="block text-sm text-gray-300" style={{ marginBottom: '6px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-field"
                    style={{ width: '100%', padding: '12px 14px', paddingRight: '42px', fontSize: '15px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9ca3af' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 700, fontSize: '15px',
                  backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--primary-foreground))',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                onClick={() => { setMode('choose'); setError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'hsl(var(--accent))', fontWeight: 600 }}
              >
                Sign up another way
              </button>
            </div>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px', color: '#9ca3af' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'hsl(var(--accent))', textDecoration: 'none', fontWeight: 600 }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
