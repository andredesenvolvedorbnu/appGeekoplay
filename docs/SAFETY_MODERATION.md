# Segurança e moderação de conteúdo — GeekoPlay

## Objetivo
Implementar antes da liberação final de testes um sistema de segurança e moderação para conteúdos públicos e privados da rede social, inspirado em boas práticas de grandes plataformas, sem depender apenas de denúncia manual.

## Escopo mínimo obrigatório
O sistema deve analisar conteúdo textual e, quando possível, mídia enviada pelos usuários em:
- feed/publicações;
- comentários;
- Pulses;
- comunidades;
- mensagens e conteúdos compartilhados;
- perfil (nome, bio, links públicos);
- Mercado Geek;
- coleção;
- eventos e conteúdos sociais associados.

## Categorias de risco a tratar
- discurso de ódio e ataques a grupos protegidos;
- ameaças, incitação à violência e glorificação de violência extrema;
- pornografia e nudez sexual explícita;
- exploração sexual e conteúdo sexual envolvendo menores;
- conteúdo que incentive autolesão ou suicídio;
- terrorismo/extremismo e propaganda de organizações violentas;
- assédio direcionado grave;
- conteúdo que viole direitos humanos ou incentive perseguição, escravidão, tortura, genocídio ou violência contra grupos;
- imagens ou textos ilegais conforme legislação aplicável;
- spam, fraude e golpes quando identificáveis.

## Comportamento esperado
1. Analisar conteúdo antes ou imediatamente após publicação.
2. Classificar risco por categoria/severidade.
3. Para alto risco: bloquear publicação/envio e mostrar mensagem clara em português.
4. Para risco intermediário: reter para revisão administrativa quando necessário.
5. Para baixo risco/ambíguo: permitir, registrar sinalização e possibilitar denúncia.
6. Não exibir ao usuário mensagens técnicas, scores internos ou regras que facilitem burlar o filtro.
7. Registrar decisões de moderação com data, tipo de conteúdo, motivo e estado da revisão.
8. Permitir revisão pelo ADM e restauração quando houver falso positivo.
9. Manter botão de denúncia em áreas públicas mesmo com filtro automático.
10. Reincidência grave deve poder gerar restrição ou suspensão da conta pelo ADM.

## Regras de produto
- O filtro deve ser aplicado no backend/RLS/API quando possível, não apenas escondido na interface.
- Conteúdo bloqueado não deve aparecer no feed enquanto aguarda revisão.
- O usuário deve receber texto em português como: "Este conteúdo não pode ser publicado porque pode violar as Diretrizes da Comunidade do GeekoPlay."
- Criar futuramente uma página pública "Diretrizes da Comunidade" e integrar ao onboarding/ajuda.
- O sistema precisa preservar contexto: menções jornalísticas, educativas ou de denúncia sobre violência/ódio não devem ser tratadas automaticamente como apoio ao conteúdo.
- Para pornografia/nudez e violência gráfica, usar análise de imagem/vídeo quando a infraestrutura estiver disponível; enquanto isso, manter denúncia e revisão administrativa.

## Antes de dizer “Chegou a hora de testar”
Esta camada de segurança deve estar implementada ao menos para textos enviados nas principais superfícies de publicação e com fluxo de denúncia/revisão administrativa funcionando. A cobertura de imagem/vídeo deve ser validada conforme o serviço de moderação escolhido.
