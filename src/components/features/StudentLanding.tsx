'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CirclePlay, Play, Sparkles, Star, Trophy, UserRound, Users, Volume2, X } from 'lucide-react';
import { listFeaturedTeachers, listTeachers, type TeacherCard } from '@/lib/queries/teachers';
import styles from './StudentLanding.module.css';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigationStore } from '@/stores/navigation-store';

const PHRASES = [
  { korean: '안녕하세요', emoji: '👋', meaning: '반갑게 인사할 때' },
  { korean: '대박!', emoji: '🔥', meaning: '놀라움과 감탄을 표현할 때' },
  { korean: '감사합니다', emoji: '💙', meaning: '고마움을 전할 때' },
];
const PREVIEWS = [
  { name: '대화가 즐거워지는 한국어', image: 'kim-jimin', tags: ['일상 회화', '한국 드라마', '입문자 환영'] },
  { name: '자신 있게 말하는 한국어', image: 'han-joowon', tags: ['한국 대중음악', '말하기', '발음'] },
  { name: '한국 생활에 가까워지는 수업', image: 'oh-seoyeon', tags: ['여행 한국어', '일상생활', '한국 문화'] },
  { name: '목표를 향해 한 걸음씩', image: 'seo-minjun', tags: ['한국어능력시험', '문법', '학습 계획'] },
];

export function StudentLanding() {
  const user = useAuthStore(s => s.user);
  const ready = useAuthStore(s => s.isHydrated);
  const items = useNavigationStore(s => s.getItems)('student').filter(item => item.isActive);
  const [playing, setPlaying] = useState(false);
  const [teachers, setTeachers] = useState<TeacherCard[]>([]);
  const [speechMessage, setSpeechMessage] = useState('');
  const [quizOpen, setQuizOpen] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const quizRef = useRef<HTMLDialogElement>(null);
  const quizTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    async function loadTeachers() {
      try {
        const featured = await listFeaturedTeachers(4).catch(() => []);
        const items = featured.length ? featured : await listTeachers();
        if (active) setTeachers(items.slice(0, 4));
      } catch { /* Course previews remain available when the directory cannot load. */ }
    }
    void loadTeachers();
    return () => { active = false; if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    if (quizOpen) quizRef.current?.showModal();
    else if (quizRef.current?.open) quizRef.current.close();
  }, [quizOpen]);

  function speak(text: string) {
    if (!('speechSynthesis' in window)) { setSpeechMessage('이 브라우저에서는 음성 재생을 지원하지 않습니다. 소개 영상으로 한국어를 들어보세요.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.85;
    utterance.onerror = (event) => { if (event.error !== 'interrupted' && event.error !== 'canceled') setSpeechMessage('이 기기에서는 한국어 음성을 재생할 수 없습니다. 소개 영상을 이용해주세요.'); };
    setSpeechMessage(`발음 듣기: ${text}`);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className={styles.page} lang="ko">
      <div className={styles.heroBackdrop}>
        <header className={styles.header} data-landing-header>
          <Link href="/student" className={styles.brand} aria-label="고쌤 학생 홈"><Image src="/img/gossaem_logo02.png" alt="고쌤" width={2172} height={724} priority /></Link>
          <nav className={styles.navigation} aria-label="학생 상단 메뉴">
            {items.map(item => <Link key={item.id} href={user && item.href === '/student' ? '/student/home' : item.href}>{item.label}</Link>)}
          </nav>
          <div className={styles.headerActions}>
            {ready && (user ? <Link href={user.role === 'teacher' ? '/teacher/home' : '/student/home'} className={styles.primary}>내 학습 공간 <ArrowRight size={18} /></Link> : <><Link href="/login?role=student&next=%2Fstudent%2Fhome" className={styles.login}>로그인</Link><Link href="/signup/student" className={styles.primary}>회원가입 <ArrowRight size={18} /></Link></>)}
          </div>
        </header>
        <div className={styles.mobileScenery} aria-hidden="true" />
        <section className={styles.hero} id="explore" aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <h1 id="landing-title">한국어로 말하고,<br /><em>한국을 만나요.</em><span className={styles.doodle} aria-hidden="true">⌁</span></h1>
            <p>일상 대화부터 드라마, 음악, 여행까지.<br />영상과 선생님과의 대화로 <mark>살아 있는 한국어</mark>를 배워보세요.</p>
            <div className={styles.heroActions}><Link className={styles.primary} href="/signup/student">한국어 배우기 <ArrowRight size={22} /></Link><Link className={styles.secondary} href="/student/search">선생님 찾기 <UserRound size={21} /></Link></div>
            <div className={styles.stats} aria-label="한국어를 배우는 방법"><div><Users /><span><strong>1:1</strong>맞춤 수업</span></div><div><CirclePlay /><span><strong>생활 한국어</strong>일상 속 표현</span></div><div><Star /><span><strong>나의 속도로</strong>차근차근 배우기</span></div></div>
          </div>
          <div className={styles.videoWrap}>
            <div className={styles.video}>
              {playing ? <iframe src="https://www.youtube-nocookie.com/embed/9wG_Y4pL5Zc?autoplay=1&rel=0&playsinline=1" title="고쌤 한국어 소개 영상" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <button className={styles.videoPoster} onClick={() => setPlaying(true)} aria-label="한국어 소개 영상 재생">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/generated/landing-video-cover.png" alt="인사하는 한국어 선생님 일러스트 · 인공지능 생성 이미지" />
                <span className={styles.videoBrand}><CirclePlay size={27} /><span><strong>고쌤</strong><small>한국어 한마디로 넓어지는 세상</small></span></span>
                <span className={styles.play}><Play fill="currentColor" size={33} /></span>
                <span className={styles.videoCaption}><CirclePlay size={20} /> 소개 영상 보기</span>
              </button>}
            </div>
            <a className={styles.youtubeLink} href="https://youtu.be/9wG_Y4pL5Zc" target="_blank" rel="noopener noreferrer">유튜브에서 보기 <ArrowRight size={13} /></a>
          </div>
          <div className={styles.phrases} aria-label="처음 배우는 한국어">
            {PHRASES.map((phrase, index) => <div key={phrase.korean} className={`${styles.phrase} ${styles[`phrase${index}`]}`}><h2 lang="ko">{phrase.korean} <span>{phrase.emoji}</span></h2><strong>{phrase.meaning}</strong><button onClick={() => speak(phrase.korean)} aria-label={`${phrase.korean} 발음 듣기`}><Volume2 size={19} /></button></div>)}
            <p className={styles.speechStatus} role="status">{speechMessage}</p>
          </div>
        </section>
      </div>
      <section className={styles.teachers} id="teachers" aria-labelledby="teachers-title">
        <div className={styles.teacherIntro}><h2 id="teachers-title">함께 배우는<br />한국어 선생님<span aria-hidden="true">〟</span></h2><p>나의 관심사와 목표에 맞는 선생님과 한국어를 즐겁게 배워보세요.</p><Link href="/student/search" className={styles.pillLink}>모든 선생님 보기 <ArrowRight size={17} /></Link></div>
        <div className={styles.teacherGrid}>
          {(teachers.length ? teachers : PREVIEWS).map((item, index) => {
            const teacher = 'id' in item ? item : null;
            const preview = PREVIEWS[index];
            return <Link href={teacher ? `/teachers/${teacher.id}` : '/student/search'} className={styles.teacherCard} key={teacher?.id || preview.image}>
              <div className={styles.portrait}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={teacher?.avatarUrl || `/img/generated/teachers/${preview.image}.png`} alt={teacher ? `${teacher.name} 한국어 선생님` : '한국어 선생님 예시 이미지'} loading="lazy" onError={event => { const fallback = `/img/generated/teachers/${preview.image}.png`; if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback; }} />
                {teacher?.isVerified && <span className={styles.badge}>✓ 인증 완료</span>}
                {(!teacher || teacher.avatarIsGenerated || !teacher.avatarUrl) && <span className={styles.imageLabel}>인공지능 이미지</span>}
                <span className={styles.cardArrow}><ArrowRight size={17} /></span>
              </div>
              <div className={styles.teacherInfo}><h3>{teacher ? `${teacher.name} 선생님` : preview.name}</h3>{teacher ? <p className={styles.rating}><Star size={15} fill="currentColor" /> <b>{teacher.ratingCount ? teacher.ratingAvg.toFixed(1) : '신규'}</b><span>{teacher.ratingCount ? `(후기 ${teacher.ratingCount.toLocaleString()}개)` : '첫 만남을 기다려요'}</span></p> : <p className={styles.previewLabel}>나에게 맞는 선생님을 찾아보세요</p>}<div className={styles.tags}>{(teacher?.specialties.length ? teacher.specialties : preview.tags).slice(0, 3).map(tag => <span key={tag}>{tag.replace(/TOPIK/gi, '한국어능력시험').replace(/K-Pop/gi, '한국 대중음악').replace(/K-Drama/gi, '한국 드라마')}</span>)}</div></div>
            </Link>;
          })}
        </div>
      </section>
      <section className={styles.bottomRow} aria-label="매일 조금씩 배우는 한국어">
        <div className={styles.challenge}>
          <div className={styles.challengeTitle}><Trophy aria-hidden="true" /><h2>하루 1분<br /><em>한국어 퀴즈</em></h2></div>
          <div className={styles.challengeCta}><h3>어떤 상황에서 쓰는 말일까요?</h3><p>짧은 퀴즈로 한국어 표현을 익혀보세요.</p><button ref={quizTrigger} className={styles.primary} onClick={() => { setAnswer(null); setQuizOpen(true); }}>퀴즈 풀어보기 <ArrowRight size={19} /></button></div>
          <div className={styles.quizPreview} aria-hidden="true"><div><b>이거 뭐예요?</b><Image src="/img/generated/seoul-walk.png" alt="" width={160} height={95} /></div><ul><li>①　물건의 이름을 물을 때 <Check size={14} /></li><li>②　상대의 위치를 물을 때</li><li>③　가격을 물을 때</li></ul></div>
        </div>
        <aside className={styles.community} id="community"><span className={styles.quoteMark} aria-hidden="true">“</span><div><h2>한국어 한마디로,<br />새로운 만남이 시작돼요.</h2><p>대화를 나누고 문화를 알아가며 함께 배우는 즐거움을 느껴보세요.</p><Link href="/signup/student">함께 배우기 <ArrowRight size={16} /></Link></div><Sparkles className={styles.communityStar} aria-hidden="true" /></aside>
      </section>
      <footer className={styles.footer}><span>한국어로 만나요. 새로운 이야기가 시작됩니다.</span><Link href="/support">고객센터 <ArrowRight size={14} /></Link></footer>
      <dialog ref={quizRef} className={styles.quizDialog} onCancel={() => setQuizOpen(false)} onClose={() => { setQuizOpen(false); quizTrigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) setQuizOpen(false); }} aria-label="하루 1분 한국어 퀴즈">
        <button className={styles.closeQuiz} aria-label="퀴즈 닫기" onClick={() => setQuizOpen(false)}><X /></button><Trophy className={styles.quizTrophy} /><p className={styles.quizEyebrow}>하루 1분 한국어 퀴즈</p><h2 lang="ko">이거 뭐예요?</h2><p>이 표현은 어떤 상황에서 사용할까요?</p><div className={styles.quizOptions}>{['물건의 이름을 물을 때', '상대의 위치를 물을 때', '가격을 물을 때'].map((option, index) => <button key={option} onClick={() => setAnswer(index)} className={answer === index ? (index === 0 ? styles.correct : styles.incorrect) : ''}>{index + 1}<span>{option}</span>{answer === index && (index === 0 ? <Check /> : <X />)}</button>)}</div><p className={styles.quizFeedback} role="status">{answer === null ? '상황에 맞는 답을 골라보세요.' : answer === 0 ? '정답이에요! 모르는 물건의 이름을 물을 때 쓰는 표현입니다.' : '다시 생각해보세요. 눈앞의 물건이 무엇인지 궁금할 때 쓰는 말이에요.'}</p>{answer === 0 && <Link className={styles.primary} href="/signup/student">계속 배우기 <ArrowRight size={18} /></Link>}
      </dialog>
    </main>
  );
}
