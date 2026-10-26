import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Libflow',
  description: 'Real-time library occupancy, scan activity, and bag check operations.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;
}
