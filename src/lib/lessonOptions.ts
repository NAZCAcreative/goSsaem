// 수업 등록(/teacher/lessons/new/details)과 수업 수정(/teacher/lessons/edit)이 같은 값을 써야
// DB에 저장된 level/category/language가 수정 화면에서도 그대로 선택된 상태로 보인다.
export const LESSON_LEVELS = ['누구나', '입문', '초급', '중급', '고급', '비즈니스'];
export const LESSON_CATEGORIES = ['TOPIK', '회화', '비즈니스', '발음 교정', '취미/문화'];
export const LESSON_LANGUAGES = ['한국어', '영어', '일본어', '중국어', '스페인어', '베트남어'];
export const LESSON_SUPPORTED_LANGUAGES = ['한국어', '영어', '일본어', '중국어', '스페인어', '베트남어'];
export const LESSON_DURATIONS = [
  { label: '50분 수업', minutes: 50 },
  { label: '70분 수업', minutes: 70 },
];
