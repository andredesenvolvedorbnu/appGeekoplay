import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OFFICIAL_ORIGIN = 'https://geekoplay.com';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const errorDescription = url.searchParams.get('error_description');

  if (errorDescription) {
    const loginUrl = new URL('/login', OFFICIAL_ORIGIN);
    loginUrl.searchParams.set('error_description', errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL('/login', OFFICIAL_ORIGIN);
    loginUrl.searchParams.set('error_description', 'Não foi possível concluir o login. Tente novamente.');
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    const loginUrl = new URL('/login', OFFICIAL_ORIGIN);
    loginUrl.searchParams.set('error_description', 'Não foi possível criar sua sessão. Tente novamente.');
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  return NextResponse.redirect(new URL(profile?.role === 'admin' ? '/admin' : '/', OFFICIAL_ORIGIN));
}
