// Login page loader and action
import { redirect } from 'react-router';
import type { Route } from '../routes/+types/login';
import { getSession, createSessionCookie, verifyPin, hashPin } from '~/lib/auth.server';
import { getSupabase, getEnvFromContext, getDefaultUserId } from '~/lib/supabase.server';
import {
  checkRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  formatLockoutMessage,
} from '~/lib/rate-limit.server';

export async function loader({ request }: Route.LoaderArgs) {
  const session = getSession(request);

  if (session) {
    throw redirect('/home');
  }

  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const pin = formData.get('pin') as string;
  const rememberMe = formData.get('rememberMe') === 'true';

  if (!pin || pin.length !== 4) {
    return { error: 'PIN은 4자리여야 합니다.' };
  }

  try {
    const env = getEnvFromContext(context);
    const supabase = getSupabase(env);

    // 사용자 조회 (rate limiting 필드 포함)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, pin_hash, login_attempts, lockout_level, locked_until, is_locked')
      .single();

    if (error || !profile) {
      // 프로필이 없으면 기본 사용자 생성 (초기 설정)
      const userId = getDefaultUserId(env);
      const initialPinHash = await hashPin('0000'); // 초기 PIN: 0000

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name: '진대성',
          pin_hash: initialPinHash,
          login_attempts: 0,
          lockout_level: 0,
          is_locked: false,
        })
        .select()
        .single();

      if (insertError || !newProfile) {
        return { error: '사용자를 찾을 수 없습니다.' };
      }

      // 새 사용자는 rate limit 체크 없이 바로 PIN 검증
      const isValid = await verifyPin(pin, newProfile.pin_hash);
      if (!isValid) {
        await recordFailedLogin(supabase, newProfile.id);
        return { error: 'PIN이 올바르지 않습니다. 초기 PIN은 0000입니다.' };
      }

      await recordSuccessfulLogin(supabase, newProfile.id);
      return redirect('/home', {
        headers: {
          'Set-Cookie': createSessionCookie(newProfile.id, newProfile.name, rememberMe),
        },
      });
    }

    // Rate limit 체크
    const rateLimitStatus = await checkRateLimit(supabase, profile.id);
    if (!rateLimitStatus.allowed) {
      return { error: formatLockoutMessage(rateLimitStatus) };
    }

    // PIN 검증
    const isValid = await verifyPin(pin, profile.pin_hash);
    if (!isValid) {
      // 실패 기록
      const failResult = await recordFailedLogin(supabase, profile.id);
      return { error: formatLockoutMessage(failResult) };
    }

    // 성공: 로그인 상태 리셋
    await recordSuccessfulLogin(supabase, profile.id);

    // 세션 쿠키 생성 및 리다이렉트
    return redirect('/home', {
      headers: {
        'Set-Cookie': createSessionCookie(profile.id, profile.name, rememberMe),
      },
    });
  } catch (e) {
    console.error('Login error:', e);
    return { error: '로그인 중 오류가 발생했습니다.' };
  }
}
