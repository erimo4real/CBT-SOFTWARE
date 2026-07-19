import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pt-20">
        <Outlet />
      </main>
    </div>
  );
}
