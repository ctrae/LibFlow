'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Accessibility,
  BookOpenText,
  Check,
  Eye,
  LockKeyhole,
  Mail,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { LibraryUserProfile } from '@/hooks/useAuth';

type StaffSettingsPanelProps = {
  profile: LibraryUserProfile | null;
  onClose: () => void;
};

export function StaffSettingsPanel({ profile, onClose }: StaffSettingsPanelProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);

  useEffect(() => {
    setHighContrast(localStorage.getItem('libflow:high-contrast') === 'true');
    setLargeText(localStorage.getItem('libflow:large-text') === 'true');
    setReduceMotion(localStorage.getItem('libflow:reduce-motion') === 'true');
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    const root = document.documentElement;
    root.dataset.highContrast = String(highContrast);
    root.dataset.reduceMotion = String(reduceMotion);
    root.style.fontSize = largeText ? '112.5%' : '';
    localStorage.setItem('libflow:high-contrast', String(highContrast));
    localStorage.setItem('libflow:large-text', String(largeText));
    localStorage.setItem('libflow:reduce-motion', String(reduceMotion));
  }, [highContrast, largeText, preferencesLoaded, reduceMotion]);

  async function handleEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityLoading(true);
    setSecurityError('');
    setSecurityMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      setSecurityMessage('Check your new email inbox for a confirmation link.');
      setEmail('');
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : 'Unable to update your email');
    } finally {
      setSecurityLoading(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityLoading(true);
    setSecurityError('');
    setSecurityMessage('');
    if (newPassword.length < 8) {
      setSecurityError('Use a password with at least 8 characters.');
      setSecurityLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('The passwords do not match.');
      setSecurityLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSecurityMessage('Your password has been updated.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : 'Unable to update your password');
    } finally {
      setSecurityLoading(false);
    }
  }

  const isDarkMode = resolvedTheme === 'dark';

  return (
    <>
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="fixed inset-0 z-[59] cursor-default bg-[#241811]/30"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="fixed bottom-0 right-0 top-0 z-[60] flex w-full max-w-2xl flex-col border-l border-[#decfbc] bg-[#fffaf2] shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#eee2d2] px-7 py-6">
          <div>
            <p className="font-display text-xl font-bold text-[#3d281f]">Settings</p>
            <p className="mt-1 text-sm text-[#765d4c]">Personalize your staff workspace</p>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="rounded-lg p-2 text-[#765d4c] transition hover:bg-[#f3eadb] hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto p-7">
          <section className="rounded-2xl border border-[#eee2d2] bg-white/70 p-6">
            <div className="mb-5 flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-[#3d281f]">Appearance</h2>
            </div>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>
                <span className="block font-medium text-[#3d281f]">Color theme</span>
                <span className="mt-0.5 block text-xs text-[#765d4c]">Choose how Libflow looks</span>
              </span>
              <select
                aria-label="Color theme"
                value={theme || 'system'}
                onChange={(event) => setTheme(event.target.value)}
                className="rounded-lg border border-[#d8c8b2] bg-[#fffaf2] px-3 py-2 text-sm text-[#3d281f] outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <p className="mt-3 flex items-center gap-2 text-xs text-[#765d4c]">
              {isDarkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {isDarkMode ? 'Dark theme is active' : 'Light theme is active'}
            </p>
          </section>

          <section className="rounded-2xl border border-[#eee2d2] bg-white/70 p-6">
            <div className="mb-3 flex items-center gap-2">
              <Accessibility className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-[#3d281f]">Accessibility</h2>
            </div>
            <PreferenceSwitch
              label="Larger text"
              description="Increase text size across the workspace"
              checked={largeText}
              onChange={setLargeText}
              icon={Eye}
            />
            <PreferenceSwitch
              label="Higher contrast"
              description="Strengthen text and border contrast"
              checked={highContrast}
              onChange={setHighContrast}
            />
            <PreferenceSwitch
              label="Reduce motion"
              description="Limit animations and transitions"
              checked={reduceMotion}
              onChange={setReduceMotion}
            />
          </section>

          <section className="rounded-2xl border border-[#eee2d2] bg-white/70 p-6">
            <div className="mb-4 flex items-center gap-2">
              <BookOpenText className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-[#3d281f]">Guides</h2>
            </div>
            <details className="staff-guide group rounded-xl bg-[#f3eadb]/70 px-3 py-3">
              <summary className="staff-guide-summary cursor-pointer list-none text-sm font-medium text-[#3d281f]">
                Staff workspace quick guide
                <span className="float-right text-primary transition group-open:rotate-180">⌄</span>
              </summary>
              <ol className="mt-3 space-y-2 border-t border-[#decfbc] pt-3 text-xs leading-5 text-[#765d4c]">
                <li><strong>Overview:</strong> See visit activity and current occupancy.</li>
                <li><strong>Live sessions:</strong> Find active visits and check remaining time.</li>
                <li><strong>Bag checks:</strong> Review declared baggage and complete handoffs.</li>
                <li><strong>Notifications:</strong> Review active visits, expirations, and completed visits.</li>
                <li><strong>Overrides:</strong> Update a visit status or zone when needed.</li>
              </ol>
            </details>
          </section>

          <section className="rounded-2xl border border-[#eee2d2] bg-white/70 p-6">
            <div className="mb-5 flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-primary" />
              <div>
                <h2 className="font-semibold text-[#3d281f]">Account security</h2>
                <p className="mt-0.5 text-xs text-[#765d4c]">{profile?.email}</p>
              </div>
            </div>

            {securityError && (
              <p role="alert" className="mb-3 rounded-lg bg-[#f9e9e4] p-3 text-xs text-[#9a4638]">
                {securityError}
              </p>
            )}
            {securityMessage && (
              <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                {securityMessage}
              </p>
            )}

            <form onSubmit={handleEmailChange} className="space-y-2 border-b border-[#eee2d2] pb-4">
              <label htmlFor="settings-email" className="flex items-center gap-2 text-sm font-medium text-[#3d281f]">
                <Mail className="h-4 w-4 text-primary" /> Change email
              </label>
              <div className="flex gap-2">
                <input
                  id="settings-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="New email address"
                  className="min-w-0 flex-1 rounded-lg border border-[#d8c8b2] bg-[#fffaf2] px-3 py-2 text-sm text-[#3d281f] outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={securityLoading}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  Update
                </button>
              </div>
              <p className="text-[11px] leading-4 text-[#9b806d]">A confirmation link may be sent to your new address.</p>
            </form>

            <form onSubmit={handlePasswordChange} className="mt-4 space-y-2">
              <label htmlFor="settings-password" className="text-sm font-medium text-[#3d281f]">Change password</label>
              <input
                id="settings-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password (8+ characters)"
                className="w-full rounded-lg border border-[#d8c8b2] bg-[#fffaf2] px-3 py-2 text-sm text-[#3d281f] outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                aria-label="Confirm new password"
                className="w-full rounded-lg border border-[#d8c8b2] bg-[#fffaf2] px-3 py-2 text-sm text-[#3d281f] outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={securityLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#d8c8b2] px-3 py-2 text-sm font-semibold text-[#5b4438] transition hover:bg-[#f3eadb] disabled:opacity-60"
              >
                <Check className="h-4 w-4" /> Update password
              </button>
            </form>
          </section>
        </div>
      </aside>
    </>
  );
}

function PreferenceSwitch({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: typeof Eye;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-[#eee2d2] py-4 first:border-t-0">
      <span className="flex min-w-0 items-start gap-2">
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#9b806d]" />}
        <span>
          <span className="block text-sm font-medium text-[#3d281f]">{label}</span>
          <span className="mt-0.5 block text-xs text-[#765d4c]">{description}</span>
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-[#9a4f38]"
      />
    </label>
  );
}
