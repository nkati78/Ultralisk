import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      if (msg.includes('user-not-found')) setError('No account found with this email');
      else if (msg.includes('invalid-email')) setError('Please enter a valid email');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(220 15% 8%)' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 1.5rem' }}>
        <h1 className="text-3xl font-bold text-white text-center" style={{ marginBottom: '0.5rem' }}>Reset password</h1>
        <p className="text-sm text-gray-400 text-center" style={{ marginBottom: '2rem' }}>
          Enter your email and we'll send you a reset link.
        </p>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
            <p style={{ fontSize: '13px', color: '#f87171' }}>{error}</p>
          </div>
        )}

        {sent ? (
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#10b981', marginBottom: '4px', fontWeight: 600 }}>Check your inbox</p>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>We sent a reset link to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
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
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 700, fontSize: '15px',
                backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--primary-foreground))',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '14px' }}>
          <Link to="/login" style={{ color: 'hsl(var(--accent))', textDecoration: 'none', fontWeight: 600 }}>
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
