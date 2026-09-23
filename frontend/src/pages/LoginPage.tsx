import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertCircle, Lock, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand-header">
          <div style={{ display: 'inline-flex', padding: 12, borderRadius: 12, backgroundColor: '#F0FDFA', color: '#0F766E', marginBottom: 12 }}>
            <ShieldAlert size={36} />
          </div>
          <div className="login-badge">GOVERNMENT OF INDIA • NDMA</div>
          <h1 className="login-title">NE-SHIELD</h1>
          <p className="login-subtitle">Landslide Early Warning & Operational Command Center</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} /> Official Email
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@ndma.gov.in"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} /> Password / Passcode
            </label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 12, padding: '10px 16px', fontSize: 14 }} disabled={loading}>
            {loading ? 'Authenticating Secure Session...' : 'Authorize & Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#94A3B8' }}>
          Restricted Access: Authorized State & National Emergency Response Personnel Only.
        </div>
      </div>
    </div>
  );
}

