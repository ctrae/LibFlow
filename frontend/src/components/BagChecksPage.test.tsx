import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BagChecksPage } from '@/components/BagChecksPage';

const mocks = vi.hoisted(() => ({
  getAdminSessions: vi.fn(),
  updateAdminStatus: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'staff-user' },
    profile: {
      user_id: 'staff-user',
      auth_user_id: 'staff-user',
      email: 'staff@mymona.uwi.edu',
      user_type: 'Library Staff',
      full_name: 'Library Staff',
      is_approved: true,
    },
    profileError: null,
    isLoading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/lib/libraryApi', () => ({
  getAdminSessions: mocks.getAdminSessions,
  updateAdminStatus: mocks.updateAdminStatus,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const bagSession = {
  id: 'session-1',
  name: 'Student Example',
  email: 'student@mymona.uwi.edu',
  student_id: '12345678',
  short_code: 'AB12',
  duration_minutes: 60,
  baggage_info: 'Black backpack',
  zone: 'Main section' as const,
  status: 'active' as const,
  created_at: '2026-01-01T10:00:00.000Z',
  expires_at: '2026-01-01T11:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
  extension_requested_minutes: null,
  extension_request_status: null,
  extension_requested_at: null,
  extension_request_resolved_at: null,
};

describe('BagChecksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSessions.mockResolvedValue([
      bagSession,
      { ...bagSession, id: 'session-2', baggage_info: 'No bag declared' },
    ]);
    mocks.updateAdminStatus.mockResolvedValue({ ...bagSession, status: 'exited' });
  });

  it('shows only bag claims and marks a verified handoff complete', async () => {
    render(<BagChecksPage />);

    expect(await screen.findByText('Black backpack')).toBeInTheDocument();
    expect(screen.queryByText('No bag declared')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Verify handoff' }));

    await waitFor(() => {
      expect(mocks.updateAdminStatus).toHaveBeenCalledWith(
        'session-1',
        'Main section',
        'exited',
      );
    });
    expect(await screen.findByText('Verified')).toBeInTheDocument();
  });
});
