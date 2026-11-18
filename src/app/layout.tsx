import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { BottomNavigation } from '@/components/shared/BottomNavigation';
import { TopNavigation } from '@/components/shared/TopNavigation';
import { ChatFab } from '@/components/shared/ChatFab';
import { ToastHost } from '@/components/shared/Toast';
import { AlertDialogHost } from '@/components/shared/AlertDialog';
import { TeacherWorkspaceFrame } from '@/components/shared/TeacherWorkspaceFrame';
import { AccountRestrictionNotice } from '@/components/shared/AccountRestrictionNotice';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', interactiveWidget: 'resizes-content' };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || 'http://localhost:3000'),
  title: 'GoSsaem | Learn Korean',
  description: 'Korean language education platform for global learners',
  openGraph: {title:'GoSsaem | Learn Korean',description:'나에게 맞는 한국어 쌤을 만나보세요.',type:'website',images:['/img/gossaem_logo02.png']},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-design="gossaem" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.design=localStorage.getItem('gossaem-design-mode')==='classic'?'classic':'gossaem'}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <Providers>
          <TopNavigation />
          <AccountRestrictionNotice />
          <TeacherWorkspaceFrame>{children}</TeacherWorkspaceFrame>
          <BottomNavigation />
          <ChatFab />
          <ToastHost />
        </Providers>
        <AlertDialogHost />
      </body>
    </html>
  );
}
