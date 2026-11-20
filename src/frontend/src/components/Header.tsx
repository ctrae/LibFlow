'use client';

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  LogOut,
  MapPin,
  RefreshCw,
  Settings,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getAdminSessions, LibrarySession } from '@/lib/libraryApi';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { StaffSettingsPanel } from '@/components/StaffSettingsPanel';

type OpenPanel = 'settings' | 'profile' | 'notifications' | null;

export function Header() {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [sessions, setSessions] = useState<LibrarySession[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationRefresh, setNotificationRefresh] = useState(0);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (openPanel !== 'notifications') return;

    let active = true;
    async function loadNotifications() {
      setNotificationsLoading(true);
      setNotificationsError('');
      try {
        const latestSessions = await getAdminSessions();
        if (active) setSessions(latestSessions);
      } catch (error) {
        if (active) {
          setNotificationsError(
            error instanceof Error ? error.message : 'Unable to load recent library activity',
          );
        }
      } finally {
        if (active) setNotificationsLoading(false);
      }
    }

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [notificationRefresh, openPanel]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenPanel(null);
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      toast({
        title: 'Unable to sign out',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  }

  const activeSessions = sessions.filter((session) => session.status === 'active');
  const pastSessions = sessions.filter((session) => session.status !== 'active');
  const notificationCount = sessions.filter((session) => session.status === 'active' || session.status === 'expired').length;
  const displayName = profile?.full_name || profile?.email || 'Staff account';

  function navigate(path: string) {
    setOpenPanel(null);
    router.push(path);
  }

  return (
    <header className="glass-card sticky top-0 z-50 border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-secondary-foreground">
            LibFlow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            aria-expanded={openPanel === 'notifications'}
            onClick={() => setOpenPanel(openPanel === 'notifications' ? null : 'notifications')}
            className="relative"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            aria-expanded={openPanel === 'settings'}
            onClick={() => setOpenPanel(openPanel === 'settings' ? null : 'settings')}
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Profile"
            aria-expanded={openPanel === 'profile'}
            onClick={() => setOpenPanel(openPanel === 'profile' ? null : 'profile')}
            className="rounded-full"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ead8c1] text-sm font-bold text-[#5b2924]">
              {displayName.trim().charAt(0).toUpperCase()}
            </span>
          </Button>
        </div>
      </div>

      {openPanel === 'settings' && portalTarget && createPortal(
        <StaffSettingsPanel profile={profile} onClose={() => setOpenPanel(null)} />,
        portalTarget,
      )}

      {openPanel === 'profile' && (
        <div className="absolute right-5 top-[calc(100%+0.5rem)] z-[60] w-72 rounded-2xl border border-[#decfbc] bg-[#fffaf2] p-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#eee2d2] pb-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ead8c1] font-display text-lg font-bold text-[#5b2924]">
              {displayName.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#3d281f]">{displayName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-[#765d4c]">
                <UserRound className="h-3 w-3" />
                {profile?.user_type || 'Staff'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#9a4638] transition hover:bg-[#f9e9e4]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}

      {openPanel === 'notifications' && portalTarget && createPortal((
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpenPanel(null)}
            className="fixed inset-0 z-[59] bg-[#241811]/30"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Library activity notifications"
            className="fixed bottom-0 right-0 top-0 z-[60] flex w-full max-w-xl flex-col border-l border-[#decfbc] bg-[#fffaf2] shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-[#eee2d2] px-7 py-6">
              <div>
                <p className="font-display text-xl font-bold text-[#3d281f]">Notifications</p>
                <p className="mt-1 text-sm text-[#765d4c]">Current and recent library activity</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Refresh notifications"
                  onClick={() => setNotificationRefresh((current) => current + 1)}
                  className="rounded-lg p-2 text-[#765d4c] transition hover:bg-[#f3eadb] hover:text-primary"
                >
                  <RefreshCw className={`h-4 w-4 ${notificationsLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setOpenPanel(null)}
                  className="rounded-lg p-2 text-[#765d4c] transition hover:bg-[#f3eadb] hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {notificationsError && (
              <div role="alert" className="mx-5 mt-4 rounded-xl border border-[#e2bcae] bg-[#f9e9e4] p-3 text-sm text-[#9a4638]">
                {notificationsError}
              </div>
            )}

            <div className="flex-1 space-y-8 overflow-y-auto p-7">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800">Active visits</p>
                  <p className="mt-1 font-display text-2xl font-bold text-emerald-900">{activeSessions.length}</p>
                </div>
                <div className="rounded-xl border border-[#eee2d2] bg-white/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#765d4c]">Recent events</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[#3d281f]">{pastSessions.length}</p>
                </div>
              </div>
              {notificationsLoading && sessions.length > 0 && (
                <p className="flex items-center gap-2 text-xs text-[#9b806d]">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Updating activity…
                </p>
              )}
              {notificationsLoading && sessions.length === 0 ? (
                <div className="space-y-3 py-2" aria-label="Loading notifications">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="animate-pulse rounded-xl border border-[#eee2d2] bg-white/70 p-4">
                      <div className="h-3 w-2/5 rounded bg-[#ead8c1]" />
                      <div className="mt-3 h-2 w-4/5 rounded bg-[#f3eadb]" />
                      <div className="mt-2 h-2 w-1/2 rounded bg-[#f3eadb]" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <NotificationGroup
                    title="Happening now"
                    subtitle="Students currently checked in"
                    emptyMessage="You're all caught up. No active visits right now."
                    sessions={activeSessions}
                  />
                  <NotificationGroup
                    title="Recent activity"
                    subtitle="Completed visits and time-limit alerts"
                    emptyMessage="No earlier activity to show yet."
                    sessions={pastSessions}
                  />
                </>
              )}
              {notificationsError && (
                <button
                  type="button"
                  onClick={() => setNotificationRefresh((current) => current + 1)}
                  className="w-full rounded-xl border border-[#decfbc] bg-white/70 px-4 py-3 text-sm font-semibold text-[#765d4c] hover:bg-[#f3eadb]"
                >
                  Try loading activity again
                </button>
              )}
            </div>

            <div className="border-t border-[#eee2d2] p-6">
              <button
                type="button"
                onClick={() => navigate('/live-sessions')}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                View all sessions
              </button>
            </div>
          </aside>
        </>
      ), portalTarget)}
    </header>
  );
}

function NotificationGroup({
  title,
  subtitle,
  emptyMessage,
  sessions,
}: {
  title: string;
  subtitle: string;
  emptyMessage: string;
  sessions: LibrarySession[];
}) {
  const latestSessions = [...sessions]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 20);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#765d4c]">{title}</h2>
          <p className="mt-1 text-[11px] text-[#9b806d]">{subtitle}</p>
        </div>
        {sessions.length > 0 && (
          <span className="rounded-full bg-[#ead8c1] px-2 py-0.5 text-xs font-semibold text-[#5b4438]">
            {sessions.length}
          </span>
        )}
      </div>
      {latestSessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#decfbc] bg-white/50 px-4 py-5 text-center text-xs leading-5 text-[#9b806d]">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-1">
          {latestSessions.map((session) => {
            const isActive = session.status === 'active';
            const Icon = isActive ? Clock3 : session.status === 'expired' ? AlertTriangle : CheckCircle2;
            const label = isActive ? 'Visit active' : session.status === 'expired' ? 'Time limit reached' : 'Visit completed';
            return (
              <article key={session.id} className="flex gap-4 rounded-xl border border-[#eee2d2] bg-white/70 p-4">
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-emerald-50 text-emerald-700' : session.status === 'expired' ? 'bg-[#f9e9e4] text-primary' : 'bg-[#f3eadb] text-[#765d4c]'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[#3d281f]">{session.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isActive ? 'bg-emerald-50 text-emerald-700' : session.status === 'expired' ? 'bg-[#f9e9e4] text-primary' : 'bg-[#f3eadb] text-[#765d4c]'}`}>
                        {isActive ? 'Active' : session.status === 'expired' ? 'Expired' : 'Completed'}
                    </span>
                  </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#765d4c]">
                      {session.status === 'expired' ? <ShieldAlert className="h-3.5 w-3.5 text-primary" /> : <MapPin className="h-3.5 w-3.5 text-[#9b806d]" />}
                      {label}{session.zone ? ` · ${session.zone}` : ''}
                    </p>
                    {session.baggage_info !== 'No bag declared' && (
                      <p className="mt-1 truncate text-xs text-[#9b806d]">Bag: {session.baggage_info}</p>
                    )}
                    <p className="mt-2 text-[11px] font-medium text-[#9b806d]">
                      {isActive ? 'Checked in' : 'Updated'}{' '}
                      {formatActivityTime(isActive ? session.created_at : session.updated_at || session.created_at)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? `today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}
