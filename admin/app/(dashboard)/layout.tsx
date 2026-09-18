import Sidebar from '../../components/layout/Sidebar';
import NotificationProvider from '../../components/layout/NotificationProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
        <Sidebar />
        {/* Main content — sidebar genişliği kadar sol boşluk */}
        <main className="flex-1 lg:ml-64 overflow-y-auto">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
}
