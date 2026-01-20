// Courses page loader and action with Supabase Auth
import type { Route } from '../routes/+types/_layout.courses';
import { requireAuth } from '~/lib/auth.server';
import { getEnvFromContext } from '~/lib/supabase.server';
import { data } from 'react-router';
import type { Course, HoleInfo, Json } from '~/types';

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = getEnvFromContext(context);
  const { session, supabase, headers } = await requireAuth(request, env);
  const userId = session.user.id;

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('name');

  // Transform the Supabase data to match our Course type
  const typedCourses: Course[] = (courses ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    name: c.name,
    holes: c.holes as unknown as HoleInfo[],
    is_favorite: c.is_favorite ?? false,
    created_at: c.created_at ?? '',
    updated_at: c.updated_at ?? '',
  }));

  return data({ courses: typedCourses }, { headers });
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
      const holes = JSON.parse(formData.get('holes') as string) as HoleInfo[];

      if (!name || name.trim() === '') {
        return data({ error: '코스 이름을 입력하세요.' }, { headers });
      }

      const { error } = await supabase.from('courses').insert({
        user_id: userId,
        name: name.trim(),
        holes: holes as unknown as Json,
      });

      if (error) {
        return data({ error: '코스 등록에 실패했습니다.' }, { headers });
      }

      return data({ success: true }, { headers });
    }

    case 'delete': {
      const id = formData.get('id') as string;
      await supabase.from('courses').delete().eq('id', id);
      return data({ success: true }, { headers });
    }

    case 'toggleFavorite': {
      const id = formData.get('id') as string;
      const isFavorite = formData.get('isFavorite') === 'true';

      await supabase
        .from('courses')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);

      return data({ success: true }, { headers });
    }
  }

  return data({ error: 'Unknown action' }, { headers });
}
