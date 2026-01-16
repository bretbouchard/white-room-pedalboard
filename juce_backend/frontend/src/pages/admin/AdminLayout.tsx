import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import EventFeed from '@/components/admin/EventFeed';

const AdminLayout: React.FC = () => {
  const loc = useLocation();
  const showFeed = loc.pathname.startsWith('/admin');
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Admin</h2>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/admin/daid" className="text-daw-text-secondary hover:text-daw-text-primary">DAID</Link>
        </div>
      </div>
      {showFeed ? <EventFeed /> : null}
      <Outlet />
    </div>
  );
};

export default AdminLayout;
