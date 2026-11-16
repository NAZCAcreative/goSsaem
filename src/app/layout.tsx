import type { Metadata, Viewport } from 'next';
import './globals.css';
import './teacher-theme.css';
import { Providers } from './providers';
import { BottomNavigation } from '@/components/shared/BottomNavigation';
import { TopNavigation } from '@/components/shared/TopNavigation';
import { ChatFab } from '@/components/shared/ChatFab';
import { ToastHost } from '@/components/shared/Toast';
import { Suspense } from 'react';
import { AccountRoleGuard } from '@/components/shared/AccountRoleGuard';
import { AudienceTheme } from '@/components/shared/AudienceTheme';
import { AccountRestrictionNotice } from '@/components/shared/AccountRestrictionNotice';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', interactiveWidget: 'resizes-content' };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || 'http://localhost:3000'),
  title: 'GoSsaem | Learn Korean',
  description: 'Korean language education platform for global learners',
  openGraph: { title: 'GoSsaem | Learn Korean', description: '나에게 맞는 한국어 선생님을 만나보세요.', type: 'website', images: ['/img/gossaem_logo01.png'] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-design="gossaem" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.design=localStorage.getItem('gossaem-design-mode')==='classic'?'classic':'gossaem'}catch(e){};try{var p=location.pathname,n=new URLSearchParams(location.search).get('next')||'';document.documentElement.dataset.audience=p==='/teacher'||p.startsWith('/teacher/')||p==='/signup/teacher'||(p==='/login'&&(n==='/teacher'||n.startsWith('/teacher/')))?'teacher':'student'}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <Providers>
          <Suspense fallback={null}><AudienceTheme /><AccountRoleGuard /></Suspense>
          <TopNavigation />
          <AccountRestrictionNotice />
          {children}
          <BottomNavigation />
          <ChatFab />
          <ToastHost />
        </Providers>
      </body>
    </html>
  );
}
