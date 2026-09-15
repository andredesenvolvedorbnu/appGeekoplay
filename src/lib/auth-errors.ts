export function traduzirErroAuth(message?: string | null) {
  const texto = (message || '').toLowerCase();

  if (!texto) return 'Não foi possível concluir esta ação. Tente novamente.';
  if (texto.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (texto.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (texto.includes('user already registered') || texto.includes('already been registered')) return 'Este e-mail já está cadastrado.';
  if (texto.includes('database error saving new user')) return 'Não foi possível concluir o cadastro. Tente novamente.';
  if (texto.includes('password should be at least') || texto.includes('password is too short')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (texto.includes('signup is disabled')) return 'Novos cadastros estão temporariamente indisponíveis.';
  if (texto.includes('email rate limit exceeded') || texto.includes('rate limit')) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (texto.includes('unsupported provider') || texto.includes('provider is not enabled')) return 'Este método de acesso ainda não está disponível.';
  if (texto.includes('network') || texto.includes('fetch')) return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';

  return 'Não foi possível concluir esta ação. Tente novamente.';
}
