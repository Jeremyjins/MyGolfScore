// Companions page loader and action with Supabase Auth
import type { Route } from '../routes/+types/_layout.companions';
import { requireAuth } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import { data } from 'react-router';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;

  const { data: companions } = await supabase.rpc('get_companions_with_stats', {
    p_user_id: userId,
  });

  return data({ companions: companions ?? [] }, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;
  const formData = await request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'create': {
      const name = formData.get('name') as string;

      if (!name || name.trim() === '') {
        return data({ error: '동반자 이름을 입력하세요.' }, { headers });
      }

      const { error } = await supabase.from('companions').insert({
        user_id: userId,
        name: name.trim(),
      });

      if (error) {
        return data({ error: '동반자 등록에 실패했습니다.' }, { headers });
      }

      return data({ success: true }, { headers });
    }

    case 'delete': {
      const id = formData.get('id') as string;
      await supabase.from('companions').delete().eq('id', id);
      return data({ success: true }, { headers });
    }
  }

  return data({ error: 'Unknown action' }, { headers });
}
