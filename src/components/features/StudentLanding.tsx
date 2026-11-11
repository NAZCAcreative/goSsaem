'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, CirclePlay, Menu, Play, Sparkles, Star, Trophy, UserRound, Users, Volume2, X } from 'lucide-react';
import { listFeaturedTeachers, listTeachers, type TeacherCard } from '@/lib/queries/teachers';
import styles from './StudentLanding.module.css';

const PHRASES = [
  { korean: '안녕하세요', emoji: '👋', roman: 'annyeonghaseyo', meaning: 'Hello' },
  { korean: '대박!', emoji: '🔥', roman: 'daebak', meaning: 'That’s awesome! / Amazing!' },
  { korean: '감사합니다', emoji: '💙', roman: 'gamsahamnida', meaning: 'Thank you' },
];
const PREVIEWS = [
  { name: 'Find your conversation partner', image: 'kim-jimin', tags: ['Conversation', 'K-Drama', 'Beginner Friendly'] },
  { name: 'Speak with confidence', image: 'han-joowon', tags: ['K-Pop', 'Speaking', 'Pronunciation'] },
  { name: 'Make Korea feel like home', image: 'oh-seoyeon', tags: ['Travel Korean', 'Daily Life', 'Culture'] },
  { name: 'Reach your next milestone', image: 'seo-minjun', tags: ['TOPIK', 'Grammar', 'Study Plan'] },
];

export function StudentLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (!('speechSynthesis' in window)) { setSpeechMessage('Audio is unavailable in this browser. Try the video to hear Korean.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.85;
    utterance.onerror = (event) => { if (event.error !== 'interrupted' && event.error !== 'canceled') setSpeechMessage('Korean audio is unavailable on this device. Try the video instead.'); };
    setSpeechMessage(`Listen: ${text}`);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className={styles.page} lang="en">
      <div className={styles.heroBackdrop}>
        <header className={styles.header} data-landing-header>
          <Link href="/student" className={styles.brand} aria-label="GoSsaem home"><Image src="/img/gossaem_logo02.png" alt="GoSsaem" width={2172} height={724} priority /></Link>
          <nav className={`${styles.navigation} ${menuOpen ? styles.navigationOpen : ''}`} aria-label="Main navigation" id="landing-navigation">
            <a href="#explore" onClick={() => setMenuOpen(false)}>Explore <ChevronDown size={15} /></a>
            <a href="#teachers" onClick={() => setMenuOpen(false)}>Teachers</a>
            <Link href="/student/search" onClick={() => setMenuOpen(false)}>Courses <ChevronDown size={15} /></Link>
            <a href="#community" onClick={() => setMenuOpen(false)}>Community</a>
          </nav>
          <div className={styles.headerActions}>
            <Link href="/teacher" className="hidden lg:inline-flex items-center gap-1 rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-bold text-secondary transition-all hover:bg-secondary/20 mr-1">
              <span>👩‍🏫 선생님이신가요?</span>
              <ArrowRight size={13} />
            </Link>
            <Link href="/login?next=%2Fstudent%2Fhome" className={styles.login}>Log in</Link>
            <Link href="/signup/student" className={styles.primary}>Start Free <ArrowRight size={20} /></Link>
          </div>
          <button className={styles.menuButton} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </header>
        <div className={styles.mobileScenery} aria-hidden="true" />
        <section className={styles.hero} id="explore" aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <h1 id="landing-title">Speak Korean.<br /><em>Feel Korea.</em><span className={styles.doodle} aria-hidden="true">⌁</span></h1>
            <p>Learn <mark>real Korean</mark> through culture, video, and live teachers — from everyday conversations to K-dramas, K-pop, travel, and more.</p>
            <div className={styles.heroActions}><Link className={styles.primary} href="/signup/student">Try a Free Lesson <ArrowRight size={22} /></Link><Link className={styles.secondary} href="/student/search">Find My Teacher <UserRound size={21} /></Link></div>
            <div className={styles.stats} aria-label="Ways to learn"><div><Users /><span><strong>1:1</strong>Personal lessons</span></div><div><CirclePlay /><span><strong>Real Korean</strong>Everyday moments</span></div><div><Star /><span><strong>Your pace</strong>Your learning journey</span></div></div>
          </div>
          <div className={styles.videoWrap}>
            <div className={styles.video}>
              {playing ? <iframe src="https://www.youtube-nocookie.com/embed/9wG_Y4pL5Zc?autoplay=1&rel=0&playsinline=1" title="GoSsaem Korean introduction video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <button className={styles.videoPoster} onClick={() => setPlaying(true)} aria-label="Play Korean introduction video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/generated/landing-video-cover.png" alt="Illustrated video cover: a Korean tutor waving hello · AI-generated image" />
                <span className={styles.videoBrand}><CirclePlay size={27} /><span><strong>GoSsaem</strong><small>A little Korean. A whole new world.</small></span></span>
                <span className={styles.play}><Play fill="currentColor" size={33} /></span>
                <span className={styles.videoCaption}><CirclePlay size={20} /> Watch the intro</span>
              </button>}
            </div>
            <a className={styles.youtubeLink} href="https://youtu.be/9wG_Y4pL5Zc" target="_blank" rel="noopener noreferrer">Watch on YouTube <ArrowRight size={13} /></a>
          </div>
          <div className={styles.phrases} aria-label="Your first Korean words">
            {PHRASES.map((phrase, index) => <div key={phrase.korean} className={`${styles.phrase} ${styles[`phrase${index}`]}`}><h2 lang="ko">{phrase.korean} <span>{phrase.emoji}</span></h2><p>({phrase.roman})</p><strong>{phrase.meaning}</strong><button onClick={() => speak(phrase.korean)} aria-label={`Listen to ${phrase.korean}`}><Volume2 size={19} /></button></div>)}
            <p className={styles.speechStatus} role="status">{speechMessage}</p>
          </div>
        </section>
      </div>
      <section className={styles.teachers} id="teachers" aria-labelledby="teachers-title">
        <div className={styles.teacherIntro}><h2 id="teachers-title">Meet Our<br />Korean Teachers<span aria-hidden="true">〟</span></h2><p>Learn with friendly Korean teachers who bring language and culture to life.</p><Link href="/student/search" className={styles.pillLink}>Meet All Teachers <ArrowRight size={17} /></Link></div>
        <div className={styles.teacherGrid}>
          {(teachers.length ? teachers : PREVIEWS).map((item, index) => {
            const teacher = 'id' in item ? item : null;
            const preview = PREVIEWS[index];
            return <Link href={teacher ? `/teachers/${teacher.id}` : '/student/search'} className={styles.teacherCard} key={teacher?.id || preview.image}>
              <div className={styles.portrait}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={teacher?.avatarUrl || `/img/generated/teachers/${preview.image}.png`} alt={teacher ? `${teacher.name}, Korean teacher` : 'Illustrative Korean teacher portrait'} loading="lazy" onError={event => { const fallback = `/img/generated/teachers/${preview.image}.png`; if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback; }} />
                {teacher?.isVerified && <span className={styles.badge}>✓ Verified</span>}
                {(!teacher || teacher.avatarIsGenerated || !teacher.avatarUrl) && <span className={styles.imageLabel}>AI image</span>}
                <span className={styles.cardArrow}><ArrowRight size={17} /></span>
              </div>
              <div className={styles.teacherInfo}><h3>{teacher ? `${teacher.name} 선생님` : preview.name}</h3>{teacher ? <p className={styles.rating}><Star size={15} fill="currentColor" /> <b>{teacher.ratingCount ? teacher.ratingAvg.toFixed(1) : 'New'}</b><span>{teacher.ratingCount ? `(${teacher.ratingCount.toLocaleString()} reviews)` : 'Meet your teacher'}</span></p> : <p className={styles.previewLabel}>Find your perfect teacher</p>}<div className={styles.tags}>{(teacher?.specialties.length ? teacher.specialties : preview.tags).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div></div>
            </Link>;
          })}
        </div>
      </section>
      <section className={styles.bottomRow} aria-label="A little Korean every day">
        <div className={styles.challenge}>
          <div className={styles.challengeTitle}><Trophy aria-hidden="true" /><h2>1-Minute<br />Korean <em>Challenge</em></h2></div>
          <div className={styles.challengeCta}><h3>Can you guess the meaning?</h3><p>A quick, fun Korean quiz in just 1 minute!</p><button ref={quizTrigger} className={styles.primary} onClick={() => { setAnswer(null); setQuizOpen(true); }}>Start the Challenge <ArrowRight size={19} /></button></div>
          <div className={styles.quizPreview} aria-hidden="true"><div><b>이거 뭐예요?</b><Image src="/img/generated/seoul-walk.png" alt="" width={160} height={95} /></div><ul><li>Ⓐ　What is this? <Check size={14} /></li><li>Ⓑ　Where are you?</li><li>Ⓒ　How much is it?</li></ul></div>
        </div>
        <aside className={styles.community} id="community"><span className={styles.quoteMark} aria-hidden="true">“</span><div><h2>A little Korean.<br />A whole new connection.</h2><p>Real conversations, shared culture, and a friendly face to learn with.</p><Link href="/signup/student">Find your people <ArrowRight size={16} /></Link></div><Sparkles className={styles.communityStar} aria-hidden="true" /></aside>
      </section>
      <footer className={styles.footer}><span>한국어로 만나요. Let’s connect in Korean.</span><Link href="/teacher">Are you a teacher? <ArrowRight size={14} /></Link></footer>
      <dialog ref={quizRef} className={styles.quizDialog} onCancel={() => setQuizOpen(false)} onClose={() => { setQuizOpen(false); quizTrigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) setQuizOpen(false); }} aria-label="1-Minute Korean Challenge">
        <button className={styles.closeQuiz} aria-label="Close challenge" onClick={() => setQuizOpen(false)}><X /></button><Trophy className={styles.quizTrophy} /><p className={styles.quizEyebrow}>YOUR 1-MINUTE KOREAN CHALLENGE</p><h2 lang="ko">이거 뭐예요?</h2><p>What does this Korean phrase mean?</p><div className={styles.quizOptions}>{['What is this?', 'Where are you?', 'How much is it?'].map((option, index) => <button key={option} onClick={() => setAnswer(index)} className={answer === index ? (index === 0 ? styles.correct : styles.incorrect) : ''}>{String.fromCharCode(65 + index)}<span>{option}</span>{answer === index && (index === 0 ? <Check /> : <X />)}</button>)}</div><p className={styles.quizFeedback} role="status">{answer === null ? 'A small step toward your next conversation.' : answer === 0 ? '정답! That’s right! “Igeo mwoyeyo?” means “What is this?”' : 'Almost! 이거 means “this.” Give it another try.'}</p>{answer === 0 && <Link className={styles.primary} href="/signup/student">Keep learning <ArrowRight size={18} /></Link>}
      </dialog>
    </main>
  );
}
