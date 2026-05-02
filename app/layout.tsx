import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Review Network Dashboard',
  description: 'Operations dashboard for review network management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
