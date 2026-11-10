'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CalendarClock,
  Users,
  Sprout,
  Laptop,
  ClipboardCheck,
  Search,
  Video,
  PlayCircle,
  Menu,
  X,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import styles from './TeacherLanding.module.css';

export function TeacherLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettlementModalOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.page}>
      {/* 1. Header (must have data-landing-header to be visible) */}
      <header className={styles.headerWrap} data-landing-header>
        <div className={styles.header}>
          {/* Brand Logo */}
          <Link href="/teacher" className={styles.brand} aria-label="Go Ssaem 선생님 홈">
            <Image
              src="/img/teacher/teacher-logo.png"
              alt="Go Ssaem"
              width={150}
              height={36}
              className={styles.brandImg}
              priority
              unoptimized
            />
          </Link>

          {/* Navigation Links */}
          <nav className={styles.nav} aria-label="선생님 메뉴">
            <button
              type="button"
              onClick={() => scrollToSection('why-gossaem')}
              className={styles.navLink}
            >
              왜 Go Ssaem인가요?
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className={styles.navLink}
            >
              이용 방법
            </button>
            <button
              type="button"
              onClick={() => setSettlementModalOpen(true)}
              className={styles.navLink}
            >
              정산 안내
            </button>
          </nav>

          {/* Actions */}
          <div className={styles.headerActions}>
            <Link href="/login?next=%2Fteacher%2Fhome" className={styles.loginBtn}>
              로그인
            </Link>
            <Link href="/signup/teacher" className={styles.primaryCta}>
              <span>선생님 등록하기</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <button
              type="button"
              className={styles.menuToggle}
              aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <button
              type="button"
              onClick={() => scrollToSection('why-gossaem')}
              className={styles.navLink}
            >
              왜 Go Ssaem인가요?
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className={styles.navLink}
            >
              이용 방법
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setSettlementModalOpen(true);
              }}
              className={styles.navLink}
            >
              정산 안내
            </button>
            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <Link
                href="/login?next=%2Fteacher%2Fhome"
                className="flex-1 text-center py-2.5 rounded-lg border border-[#2e3a8c] text-[#121d64] font-bold text-sm"
              >
                로그인
              </Link>
              <Link
                href="/signup/teacher"
                className="flex-1 text-center py-2.5 rounded-lg bg-[#f55940] text-white font-bold text-sm"
              >
                선생님 등록하기
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className={styles.heroSection}>
          <div className={`${styles.container} ${styles.heroGrid}`}>
            {/* Left copy */}
            <div className={styles.heroLeft}>
              <div className={styles.heroDoodle}>
                <span className={styles.heroDoodleText}>Teach Korean, Share Korean Culture</span>
                <Image
                  src="/img/teacher/spark-orange.png"
                  alt=""
                  width={20}
                  height={18}
                  className={styles.sparkIcon}
                  aria-hidden="true"
                  unoptimized
                />
              </div>

              <h1 className={styles.heroHeadline}>
                한국어로
                <br />
                <span className={styles.highlightWrap}>세상과 소통하는</span>
                <br />
                선생님이 되어주세요.
              </h1>

              <p className={styles.heroDesc}>
                Go Ssaem은 한국어를 배우고 싶은
                <br />
                전 세계 학습자와 선생님을 연결하는
                <br />
                신뢰 기반의 온라인 교육 플랫폼입니다.
              </p>

              <div className={styles.heroBtnRow}>
                <Link href="/signup/teacher" className={styles.heroPrimaryBtn}>
                  <span>선생님 등록하기</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToSection('why-gossaem')}
                  className={styles.heroIntroBtn}
                >
                  <PlayCircle size={17} aria-hidden="true" className="text-[#121d64]" />
                  <span>Go Ssaem 소개</span>
                </button>
              </div>
            </div>

            {/* Right tutor illustration */}
            <div className={styles.heroRight}>
              <Image
                src="/img/teacher/teacher-hero-tutor.png"
                alt="Korean Tutor - 전 세계 학생들과 소통하는 Go Ssaem 선생님"
                width={555}
                height={382}
                className={styles.heroTutorImg}
                priority
                unoptimized
              />
            </div>
          </div>
        </section>

        {/* 3. 4 Core Values Section */}
        <section id="why-gossaem" className={styles.valuesSection}>
          <div className={styles.container}>
            <div className={styles.valuesCardWrap}>
              <div className={styles.valuesGrid}>
                {/* 1. 신뢰할 수 있는 환경 */}
                <div className={styles.valueItem}>
                  <div className={`${styles.valueIcon} ${styles.iconCoral}`}>
                    <ShieldCheck size={24} strokeWidth={2.2} />
                  </div>
                  <h2 className={styles.valueTitle}>신뢰할 수 있는 환경</h2>
                  <p className={styles.valueDesc}>
                    투명한 운영과{'\n'}명확한 가이드
                  </p>
                </div>

                {/* 2. 유연한 수업 운영 */}
                <div className={styles.valueItem}>
                  <div className={`${styles.valueIcon} ${styles.iconNavy}`}>
                    <CalendarClock size={24} strokeWidth={2.2} />
                  </div>
                  <h2 className={styles.valueTitle}>유연한 수업 운영</h2>
                  <p className={styles.valueDesc}>
                    원하는 시간에{'\n'}온라인으로 수업 진행
                  </p>
                </div>

                {/* 3. 다양한 학습자와의 만남 */}
                <div className={styles.valueItem}>
                  <div className={`${styles.valueIcon} ${styles.iconOrange}`}>
                    <Users size={24} strokeWidth={2.2} />
                  </div>
                  <h2 className={styles.valueTitle}>다양한 학습자와의 만남</h2>
                  <p className={styles.valueDesc}>
                    전 세계의 한국어 학습자와{'\n'}언어와 문화를 나누는 경험
                  </p>
                </div>

                {/* 4. 지속적인 성장 지원 */}
                <div className={styles.valueItem}>
                  <div className={`${styles.valueIcon} ${styles.iconGreen}`}>
                    <Sprout size={24} strokeWidth={2.2} />
                  </div>
                  <h2 className={styles.valueTitle}>지속적인 성장 지원</h2>
                  <p className={styles.valueDesc}>
                    수업에 필요한 자료와{'\n'}교육 콘텐츠 제공
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Registration Process Section */}
        <section id="how-it-works" className={styles.stepsSection}>
          <div className={`${styles.container} ${styles.stepsGrid}`}>
            {/* Left intro */}
            <div className={styles.stepsLeft}>
              <Image
                src="/img/teacher/spark-orange-left.png"
                alt=""
                width={22}
                height={22}
                className={styles.stepsSpark}
                aria-hidden="true"
                unoptimized
              />
              <h2 className={styles.stepsTitle}>
                지금, Go Ssaem에서
                <br />
                선생님으로 시작하세요.
              </h2>
              <p className={styles.stepsSubtitle}>
                간단한 절차로
                <br />
                전 세계 학생들과
                <br />
                한국어 수업을 시작할 수 있습니다.
              </p>
            </div>

            {/* Right steps */}
            <div className={styles.stepsRight}>
              <span className={styles.stepsPill}>선생님 등록 절차</span>

              <div className={styles.stepsRow}>
                {/* Step 1: 회원가입 */}
                <div className={styles.stepNode}>
                  <div className={styles.stepIconWrap}>
                    <Laptop size={24} className="text-[#3b4c9e]" strokeWidth={2} />
                  </div>
                  <h3 className={styles.stepLabel}>회원가입</h3>
                </div>

                <div className={styles.stepArrow} aria-hidden="true">
                  <ChevronRight size={18} />
                </div>

                {/* Step 2: 프로필 등록 */}
                <div className={`${styles.stepNode} ${styles.stepNodeActive}`}>
                  <div className={styles.stepIconWrap}>
                    <ClipboardCheck size={24} className="text-[#f55940]" strokeWidth={2} />
                  </div>
                  <h3 className={styles.stepLabel}>프로필 등록</h3>
                  <p className={styles.stepSubLabel}>(소개·경력·수업 정보)</p>
                </div>

                <div className={styles.stepArrow} aria-hidden="true">
                  <ChevronRight size={18} />
                </div>

                {/* Step 3: 운영팀 검토 및 승인 */}
                <div className={styles.stepNode}>
                  <div className={styles.stepIconWrap}>
                    <Search size={24} className="text-[#3b4c9e]" strokeWidth={2} />
                  </div>
                  <h3 className={styles.stepLabel}>
                    운영팀 검토
                    <br />및 승인
                  </h3>
                </div>

                <div className={styles.stepArrow} aria-hidden="true">
                  <ChevronRight size={18} />
                </div>

                {/* Step 4: 수업 시작 */}
                <div className={styles.stepNode}>
                  <div className={styles.stepIconWrap}>
                    <Video size={24} className="text-[#3b4c9e]" strokeWidth={2} />
                  </div>
                  <h3 className={styles.stepLabel}>수업 시작</h3>
                  <p className={styles.stepSubLabel}>(온라인 수업 진행)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Bottom Banner */}
        <section className={styles.bannerSection}>
          <div className={styles.container}>
            <div className={styles.bannerWrap}>
              <Image
                src="/img/teacher/teacher-bottom-banner-card.png"
                alt="당신의 한국어가, 누군가의 새로운 경험이 됩니다. 선생님 등록하기"
                width={895}
                height={165}
                className={styles.bannerFullImg}
                priority
                unoptimized
              />
              <Link
                href="/signup/teacher"
                className={styles.bannerBtnOverlay}
                aria-label="선생님 등록하기"
              />
            </div>
          </div>
        </section>
      </main>

      {/* 6. Settlement Guidance Modal */}
      {settlementModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settlement-modal-title"
          onClick={() => setSettlementModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalCloseBtn}
              aria-label="닫기"
              onClick={() => setSettlementModalOpen(false)}
            >
              <X size={20} />
            </button>
            <h2 id="settlement-modal-title" className={styles.modalTitle}>
              Go Ssaem 정산 및 수익 안내
            </h2>
            <div className={styles.modalList}>
              <div className={styles.modalItem}>
                <h3 className={styles.modalItemTitle}>1. 주간 정기 정산</h3>
                <p className={styles.modalItemDesc}>
                  매주 완료된 수업에 대한 수익이 정기 정산 기준일에 맞춰 투명하고 정확하게 집계되어 정산 잔액에 자동 반영됩니다.
                </p>
              </div>
              <div className={styles.modalItem}>
                <h3 className={styles.modalItemTitle}>2. 안심 에스크로 결제</h3>
                <p className={styles.modalItemDesc}>
                  수업 예약 시 결제된 학생 수강료는 Go Ssaem의 안전 결제 에스크로 계좌에 보관되며, 수업 완료 시 안전하게 전환됩니다.
                </p>
              </div>
              <div className={styles.modalItem}>
                <h3 className={styles.modalItemTitle}>3. 편리한 출금 신청</h3>
                <p className={styles.modalItemDesc}>
                  선생님 마이페이지 대시보드에서 정산 내역을 실시간으로 확인하고 등록된 계좌로 간편하게 출금 신청할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSettlementModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-secondary text-white text-sm font-bold"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Footer */}
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-secondary">Go Ssaem</span>
            <span>· 전 세계 한국어 학습자와 선생님을 잇는 플랫폼</span>
          </div>

          <div className={styles.footerLinks}>
            <Link href="/student" className={styles.footerStudentLink}>
              <span>한국어를 배우고 싶으신가요? 학생 페이지로</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
