'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Users, Scissors,
  UserCog, LogOut, Menu, X, Bell
} from 'lucide-react';
import { useState } from 'react';
import { createSupabaseClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useNotificationContext } from './NotificationProvider';

const navItems = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'   },
  { href: '/appointments',  icon: Calendar,         label: 'Randevular'  },
  { href: '/staff',         icon: UserCog,          label: 'Personel'    },
  { href: '/services',      icon: Scissors,         label: 'Hizmetler'   },
  { href: '/customers',     icon: Users,            label: 'Müşteriler'  },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createSupabaseClient();
  const [open, setOpen] = useState(false);
  const { pendingCount } = useNotificationContext();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <>
      {/* Mobil hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 rounded-lg border border-gray-700"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-gray-950 border-r border-gray-800
        flex flex-col z-40 transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💈</span>
              <div>
                <p className="text-white font-bold text-sm">Sahil Kuaför</p>
                <p className="text-gray-500 text-xs">Admin Paneli</p>
              </div>
            </div>
            {/* Bildirim zili */}
            <div className="relative">
              <Bell size={18} className={pendingCount > 0 ? 'text-red-400 animate-[wiggle_1s_ease-in-out_infinite]' : 'text-gray-600'} />
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-lg shadow-red-500/40 animate-bounce">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pending randevu uyarı bandı */}
        {pendingCount > 0 && (
          <Link
            href="/appointments?filter=pending"
            onClick={() => setOpen(false)}
            className="mx-3 mt-3 flex items-center gap-2.5 px-3 py-2.5 bg-red-600/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-600/20 transition-all group"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-semibold flex-1">
              {pendingCount} randevu onay bekliyor
            </span>
            <span className="text-xs text-red-500 group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const isAppointments = href === '/appointments';
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150 relative
                  ${active
                    ? 'bg-red-700/20 text-red-400 border border-red-700/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                <Icon size={18} />
                {label}
                {/* Badge randevular menüsünde */}
                {isAppointments && pendingCount > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                       text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>
      </aside>
    </>
  );
}
