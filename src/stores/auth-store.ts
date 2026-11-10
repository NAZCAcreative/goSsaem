import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import { safeAuthNext } from '@/lib/auth-redirect';
import type { Profile, LanguageLevel } from '@/types';

interface RegisterData {
  role: 'student' | 'teacher';
  email: string;
  password: string;
  name: string;
  nativeLanguage: string;
  koreanLevel: LanguageLevel;
}

let authRevision = 0;

function passwordLoginError(error: { code?: string; status?: number }): string {
  switch (error.code) {
    case 'invalid_credentials':
      return '이메일 또는 비밀번호가 올바르지 않습니다. Google로 가입했다면 Google로 계속하기를 이용해주세요.';
    case 'email_not_confirmed':
      return '이메일 인증이 필요합니다. 가입할 때 받은 인증 메일의 링크를 누른 후 다시 로그인해주세요.';
    case 'email_provider_disabled':
      return '현재 이메일 로그인을 사용할 수 없습니다. 고객센터에 문의해주세요.';
    case 'user_banned':
      return '로그인이 제한된 계정입니다. 고객센터에 문의해주세요.';
    case 'over_request_rate_limit':
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
    default:
      if (error.status === 429) return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
      return '로그인 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
  }
}

interface AuthState {
  syncUser: (id: string | null) => Promise<Profile | null>;
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // AuthHydrator가 localStorage 캐시를 실제 Supabase 세션과 대조해 확정하기 전까지 false.
  // 이 값이 true가 되기 전에는 화면들이 "로그인 안 됨(user===null)"과 "아직 확인 중"을 구분할 수 없어
  // 하드 새로고침 시 실제로는 로그인된 사용자인데도 빈 화면(찜 목록/채팅 목록 등)을 잘못 보여주게 된다.
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  loginWithGoogle: (next?: string | null) => Promise<void>;
  register: (data: RegisterData) => Promise<'signed_in' | 'verify_email'>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setHydrated: () => void;
}

async function loadProfile(userId: string): Promise<Profile> {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw new Error(error?.message ?? 'Profile not found');

  return {
    id: data.id,
    role: data.role,
    name: data.name,
    avatarUrl: data.avatar_url ?? undefined,
    nativeLanguage: data.native_language ?? undefined,
    koreanLevel: data.korean_level,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isHydrated: false,

      syncUser: async (id) => {
        const revision = ++authRevision;
        if (!id || get().user?.id !== id) set({ user: null, isAuthenticated: false });
        if (!id) { set({ isHydrated: true }); return null; }
        try {
          const profile = await loadProfile(id);
          if (revision === authRevision) set({ user: profile, isAuthenticated: true, isHydrated: true });
          return profile;
        } catch (error) {
          if (revision === authRevision) set({ user: null, isAuthenticated: false, isHydrated: true });
          throw error;
        }
      },
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (error) throw new Error(passwordLoginError(error));
          if (!data.user) throw new Error('로그인 정보를 확인하지 못했습니다. 다시 로그인해주세요.');

          try {
            const profile = await get().syncUser(data.user.id);
            if (!profile) throw new Error('Profile not found');
            return profile;
          } catch {
            throw new Error('계정 인증은 완료됐지만 회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
          }
        } finally {
          set({ isLoading: false });
        }
      },

      loginWithGoogle: async (next) => {
        if (get().isLoading) return;
        set({ isLoading: true });
        try {
          const redirectTo = new URL('/auth/callback', window.location.origin);
          redirectTo.searchParams.set('next', safeAuthNext(next ?? null));
          const { data, error } = await createClient().auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: redirectTo.toString(), skipBrowserRedirect: true },
          });
          if (error || !data.url) throw new Error('Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
          window.location.assign(data.url);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const supabase = createClient();
          const { data: signUpData, error } = await supabase.auth.signUp({
            email: data.email.trim(),
            password: data.password,
            options: {
              data: {
                name: data.name,
                native_language: data.nativeLanguage,
                korean_level: data.koreanLevel,
                role: data.role,
              },
            },
          });
          if (error || !signUpData.user) throw new Error(error?.message ?? 'Registration failed');

          if (signUpData.user.identities?.length === 0) throw new Error('이미 가입된 이메일입니다. 다른 역할로 가입하려면 다른 이메일을 사용해주세요.');

          if (!signUpData.session) {
            await get().syncUser(null);
            return 'verify_email';
          }
          await get().syncUser(signUpData.user.id);
          return 'signed_in';
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error('로그아웃하지 못했습니다. 다시 시도해주세요.');
        await get().syncUser(null);
      },

      fetchMe: async () => {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          await get().syncUser(null);
          throw new Error(error?.message ?? 'Not authenticated');
        }

        await get().syncUser(data.user.id);
      },

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'vora-auth',
      // 서버 렌더는 항상 user: null로 시작하는데, 클라이언트가 마운트 즉시 localStorage의
      // 캐시된 user를 자동 적용하면 서버/클라이언트 렌더 결과가 달라져 하이드레이션 에러가 난다.
      // 캐시된 사용자 정보는 복원하지 않고 AuthHydrator가 실제 세션으로 프로필을 다시 읽는다.
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
