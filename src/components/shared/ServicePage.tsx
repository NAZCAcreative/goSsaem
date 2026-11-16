import Link from "next/link";
import type { ReactNode } from "react";

export const fieldClass =
  "mt-2 min-h-12 w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface";
export const actionClass =
  "inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-50";
export function ServicePage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-container-margin pb-32 pt-8 text-on-surface">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-3 leading-relaxed text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      {children}
      <nav
        aria-label="서비스 안내"
        className="flex flex-wrap gap-x-5 gap-y-2 border-t border-outline-variant/30 pt-6 text-sm text-primary"
      >
        <Link className="inline-flex min-h-11 items-center" href="/guide">
          이용 안내
        </Link>
        <Link
          className="inline-flex min-h-11 items-center"
          href="/policies/terms"
        >
          이용약관
        </Link>
        <Link
          className="inline-flex min-h-11 items-center"
          href="/policies/privacy"
        >
          개인정보
        </Link>
        <Link
          className="inline-flex min-h-11 items-center"
          href="/policies/refunds"
        >
          취소·환불
        </Link>
        <Link className="inline-flex min-h-11 items-center" href="/support">
          고객센터
        </Link>
      </nav>
    </main>
  );
}
