import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import '../../styles/layout.css';

export default function AppLayout() {
  const location = useLocation();
  const isMapPage = location.pathname === '/map';

  return (
    <div className="app-layout" style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div className="app-main" style={{ overflow: 'hidden', height: '100%' }}>
        {!isMapPage && <Header />}
        <main
          className={isMapPage ? 'app-content-map' : 'app-content'}
          style={isMapPage ? { flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' } : undefined}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
