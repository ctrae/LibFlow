'use client';

import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Live sessions', path: '/live-sessions', icon: Users },
  { label: 'Bag checks', path: '/bag-checks', icon: ClipboardCheck },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Overrides', path: '/overrides', icon: Settings2 },
] as const;

export function StaffSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  return (
    <aside className="fixed bottom-0 left-0 top-[73px] z-40 hidden w-64 flex-col border-r border-[#b86a4f]/30 bg-[#9a4f38] px-4 py-5 shadow-[8px_0_24px_rgba(61,40,31,0.08)] lg:flex">
      <nav className="space-y-2" aria-label="Staff navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => router.push(item.path)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#fffaf2] text-[#4a3025] shadow-sm'
                  : 'text-[#f7eadc] hover:translate-x-1 hover:bg-[#b86a4f]/60 hover:text-white'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isActive ? 'bg-[#ead8c1] text-primary' : 'bg-white/10 text-[#fffaf2]'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </button>
          );
        })}

        {profile?.user_type === 'Head Librarian' && (
          <button
            type="button"
            onClick={() => router.push('/admin/users')}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
              pathname === '/admin/users'
                ? 'bg-[#fffaf2] text-[#4a3025] shadow-sm'
                : 'text-[#f7eadc] hover:translate-x-1 hover:bg-[#b86a4f]/60 hover:text-white'
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                pathname === '/admin/users' ? 'bg-[#ead8c1] text-primary' : 'bg-white/10 text-[#fffaf2]'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
            </span>
            Staff approvals
          </button>
        )}
      </nav>

      <div className="mt-auto border-t border-[#f7eadc]/20 pt-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-semibold text-[#fffaf2]">
            {profile?.full_name || profile?.email}
          </p>
          <p className="mt-0.5 text-xs text-[#ead8c1]">{profile?.user_type}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="flex w-full items-center gap-3 rounded-xl border border-[#f7eadc]/20 px-3 py-2.5 text-sm font-semibold text-[#fffaf2] transition hover:bg-[#fffaf2] hover:text-[#5b2924]"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
