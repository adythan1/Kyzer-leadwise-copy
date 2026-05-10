import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNav from './PublicNav';

const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-background-light">
      <PublicNav />
      <main className="w-full" style={{width:'webkit-fill-available'}}>
        <Outlet />
      </main>
      {/* You can add a footer here if needed */}
    </div>
  );
};

export default PublicLayout;