import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';

export default function Layout(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* Top Navigation */}
      <TopNav />

      {/* Main Content Area - Full width, edge-to-edge */}
      <main className="flex-1 overflow-auto pt-14">
        <div className="h-full px-4 md:px-6 py-4 md:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
