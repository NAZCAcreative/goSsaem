const registeredMessage = '이미 가입된 이메일입니다. 기존 계정으로 로그인해주세요. 구글로 가입했다면 로그인 화면에서 ‘Google로 계속하기’를 선택해주세요.';

/** Translate known server errors without exposing raw technical details to users. */
export function errorMessage(error: unknown, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요. 문제가 계속되면 고객센터에 문의해주세요.'): string {
  const details = error && typeof error === 'object' ? error as { code?: string; message?: string; status?: number } : {};
  const message = (typeof error === 'string' ? error : details.message || '').replace(/&#(?:x20|32);|&nbsp;/gi, ' ').trim();
  const code = details.code || '';
  if (['user_already_exists', 'email_exists'].includes(code) || /user already registered|email already (?:exists|registered)/i.test(message)) return registeredMessage;
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return '이메일 또는 비밀번호가 올바르지 않습니다. 입력 내용을 확인해주세요. 구글로 가입했다면 ‘Google로 계속하기’를 이용해주세요.';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return '이메일 인증이 아직 완료되지 않았습니다. 가입할 때 받은 인증 메일의 링크를 누른 후 다시 로그인해주세요. 메일이 보이지 않으면 스팸함도 확인해주세요.';
  if (code === 'weak_password' || /password should be at least/i.test(message)) return '비밀번호가 보안 조건을 충족하지 않습니다. 8자 이상으로 입력하고 영문 대문자·소문자, 숫자, 특수문자를 섞어 설정해주세요.';
  if (code === 'email_address_invalid' || (code === 'validation_failed' && /email/i.test(message)) || /invalid email|email address (?:.* )?invalid/i.test(message)) return '이메일 주소 형식이 올바르지 않습니다. 주소와 도메인에 오타가 없는지 확인해주세요.';
  if (['over_email_send_rate_limit', 'over_request_rate_limit'].includes(code) || details.status === 429 || /rate limit|too many requests|for security purposes.*seconds/i.test(message)) return '요청이 잠시 몰려 이용이 제한되었습니다. 잠시 기다린 뒤 다시 시도해주세요.';
  if (code === 'signup_disabled') return '현재 회원가입을 일시적으로 받지 않고 있습니다. 잠시 후 다시 확인하거나 고객센터에 문의해주세요.';
  if (code === 'user_banned') return '이용이 제한된 계정입니다. 자세한 내용은 고객센터에 문의해주세요.';
  if (['session_expired', 'session_not_found', 'refresh_token_not_found', 'refresh_token_already_used'].includes(code) || /jwt expired|refresh token.*(?:invalid|not found)|not authenticated/i.test(message)) return '로그인 정보가 만료되었거나 확인되지 않습니다. 다시 로그인한 뒤 이용해주세요.';
  if (/failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(message)) return '서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.';
  if (/timeout|timed out/i.test(message)) return '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
  // Preserve deliberately written Korean guidance; unknown server messages use a safe fallback.
  return /[가-힣]/.test(message) ? message : fallback;
}
