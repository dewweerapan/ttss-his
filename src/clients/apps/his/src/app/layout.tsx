import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import type { Metadata } from 'next';
import ReactQueryProvider from '@/providers/ReactQueryProvider';

export const metadata: Metadata = {
  title: 'TTSS HIS',
  description: 'Hospital Information System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <ReactQueryProvider>
          <MantineProvider>
            <ModalsProvider>
              <Notifications />
              {children}
            </ModalsProvider>
          </MantineProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
