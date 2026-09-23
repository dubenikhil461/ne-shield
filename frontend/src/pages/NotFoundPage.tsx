import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <h1 style={{ fontSize: 64, fontWeight: 700, color: '#e5e7eb' }}>404</h1>
      <p className="text-muted" style={{ fontSize: 16 }}>Page not found</p>
      <Link to="/dashboard" className="btn btn-primary mt-4">Go to Dashboard</Link>
    </div>
  );
}
