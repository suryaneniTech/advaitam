import type { ReactNode } from 'react';
import { AuthProvider } from '@hostel/hooks/useAuth';
import './globals.css';

export const metadata = {
  title: 'Hostel Attendance & Leave Platform',
  description: 'Secure attendance and leave management for hostels',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
