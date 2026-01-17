// Companions page loader and action
import type { Route } from '../routes/+types/_layout.companions';
import { getSupabase, getEnvFromContext } from '~/lib/supabase.server';
import { requireAuth } from '~/lib/auth.server';

export async function loader({ request, context }: Route.LoaderArgs) {
  const session = requireAuth(request);

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  const { data: companions } = await supabase.rpc('get_companions_with_stats', {
    p_user_id: session.userId,
  });

  return { companions: companions ?? [] };
}

export async function action({ request, context }: Route.ActionArgs) {
  const session = requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  const env = getEnvFromContext(context);
  const supabase = getSupabase(env);

  switch (intent) {
    case 'create': {
      const name = formData.get('name') as string;

      if (!name || name.trim() === '') {
        return { error: '동반자 이름을 입력하세요.' };
      }

      const { error } = await supabase.from('companions').insert({
        user_id: session.userId,
        name: name.trim(),
      });

      if (error) {
        return { error: '동반자 등록에 실패했습니다.' };
      }

      return { success: true };
    }

    case 'delete': {
      const id = formData.get('id') as string;
      await supabase.from('companions').delete().eq('id', id);
      return { success: true };
    }
  }

  return { error: 'Unknown action' };
}
