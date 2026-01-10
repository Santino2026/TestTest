import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';

export default function Layout(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* Top Navigation */}
      <TopNav />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pt-14">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
