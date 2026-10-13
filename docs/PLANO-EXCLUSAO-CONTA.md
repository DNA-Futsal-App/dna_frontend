# Planejamento da exclusão de conta na interface

Data: 12/10/2026. Revisão: implementação com cancelamento confirmado durante o login, conforme decisão do usuário.

## 1. Objetivo e contrato confirmado

Disponibilizar a solicitação de exclusão em Meu perfil e oferecer cancelamento somente após uma tentativa de login válida durante os 10 dias. O usuário confirma antes de cancelar e entrar; ao recusar, permanece na tela de login com a exclusão agendada. Não existe link ou página separada de cancelamento.

Fontes locais consultadas:

- [Documentação do backend](../../DNA-Futsal-Backend/docs/account-deletion.md).
- [Contrato OpenAPI](../../DNA-Futsal-Backend/docs/openapi.yaml).
- [Serviço de exclusão](../../DNA-Futsal-Backend/src/main/java/br/com/dnafutsal/backend/identity/application/AccountDeletionService.java).
- [Serviço de autenticação](../../DNA-Futsal-Backend/src/main/java/br/com/dnafutsal/backend/identity/application/AuthenticationService.java).

O contrato está confirmado no código local; a disponibilidade da versão correspondente em produção precisa ser conferida antes da publicação.

| Operação | Backend | Autenticação e corpo | Sucesso |
| --- | --- | --- | --- |
| Solicitar exclusão | `POST /api/v1/auth/account-deletion` | Bearer da sessão; `{ currentPassword }` | `202` com `status: PENDING_DELETION`, `requestedAt`, `scheduledFor` e `message` |
| Cancelar exclusão | `POST /api/v1/auth/account-deletion/cancel` | Sem Bearer; `{ login, currentPassword }` | `204`, sem criar sessão |

Regras que determinam a interface:

- O acesso é bloqueado e as sessões são revogadas imediatamente após o agendamento.
- O prazo é de exatamente 240 horas. A interface deve usar `scheduledFor`, sem calcular a data somando dez dias ao relógio do dispositivo.
- O cancelamento precisa chegar antes de `scheduledFor`. No instante do vencimento, o backend já recusa o cancelamento.
- Durante o prazo, as inscrições permanecem armazenadas e o processamento de vídeos fica suspenso. O cancelamento reativa a conta e permite a retomada dos trabalhos pendentes.
- A remoção abrange inscrições de todas as edições, dados pessoais, preferências e mídias armazenadas pelo serviço. Votos e registros necessários à apuração são preservados; existem referências técnicas e esportivas retidas.
- Arquivos em serviços de terceiros não são apagados por esse fluxo. Não prometer remoção completa de backups, e-mails entregues ou todos os vínculos históricos.
- A limpeza é assíncrona e pode terminar depois da data agendada. Comunicar a data como prazo de cancelamento e agendamento da exclusão, sem prometer conclusão de todos os arquivos naquele instante.
- Uma tentativa de login não cancela a exclusão por si só: retorna `403 / ACCOUNT_PENDING_DELETION` após validar a senha e o prazo. Apenas a confirmação do usuário permite cancelar, fazer novo login e entrar na página inicial. Recuperação de senha e confirmação de e-mail não cancelam a exclusão.

## 2. Experiência proposta

### 2.1. Acesso em Meu perfil

Adicionar um cartão “Excluir conta” no final da área de ações da conta, depois de “Encerrar sessão”, na [página de perfil](../app/(authenticated)/app/perfil/page.tsx).

- Usar os padrões atuais de superfície, borda, espaçamento e ícone do projeto, com destaque coral na ação destrutiva.
- Texto curto: “Agende a exclusão da sua conta. Seu acesso será bloqueado imediatamente e você terá 10 dias para cancelar.”
- Botão inicial: “Excluir minha conta”. Ele apenas abre a confirmação.
- Manter o cartão fora do formulário de edição de perfil e visível em celular e desktop.
- Desabilitar ações conflitantes enquanto houver salvamento, logout ou solicitação de exclusão em andamento.

### 2.2. Confirmação acessível

Criar um componente de confirmação específico, preferencialmente com `dialog` nativo e `showModal()`, seguindo o visual do projeto, sem adicionar biblioteca apenas para esse fluxo.

Conteúdo:

1. Título: “Agendar exclusão da conta?”
2. Explicação do bloqueio imediato e do prazo de 10 dias para desistir.
3. Resumo dos dados e inscrições removidos, incluindo mídias próprias; aviso de que votos e registros de apuração serão preservados.
4. Orientação: “Para desistir dentro dos 10 dias, faça login novamente e confirme o cancelamento antes de entrar.”
5. Campo “Senha atual”, com `type=password`, `autocomplete=current-password`, obrigatório e máximo de 72 caracteres. Não remover espaços nem transformar a senha.
6. Checkbox obrigatório: “Entendi o bloqueio imediato e o prazo para cancelar.” O aceite é local; enviar à API apenas os campos do contrato.
7. Ações “Voltar” e “Agendar exclusão”. Durante a chamada: “Agendando...”.

Não exigir digitação de uma frase adicional: senha e aceite já compõem a confirmação proposta. O formulário de exclusão não deve reutilizar o campo de senha do formulário de edição.

Acessibilidade e comportamento:

- Título e descrição associados ao diálogo; foco inicial em “Voltar”, navegação por teclado contida no modal e retorno do foco ao botão que o abriu.
- Escape fecha antes do envio; clique no fundo não confirma nem descarta acidentalmente dados.
- Durante o envio, impedir fechamento e submissões duplicadas; usar estado visual e trava síncrona para evitar cliques rápidos antes de uma nova renderização.
- Avisos de erro com `role=alert`, processamento com `role=status`/`aria-busy`, ícones decorativos ocultos para leitores de tela.
- Senha mantida somente na memória do formulário e apagada ao fechar, concluir ou receber erro de credencial.
- No celular, permitir rolagem interna e manter campos e ações acessíveis com o teclado virtual aberto.

### 2.3. Confirmação pública do agendamento

Criar `/exclusao-conta`, fora do layout autenticado. Após `202`, limpar a sessão no BFF e fazer navegação completa com `window.location.replace`, desmontando os contextos autenticados.

Apresentação:

- Título: “Exclusão agendada”.
- “Seu acesso foi bloqueado. A exclusão está agendada para [data e hora]. Você pode cancelar antes desse horário.”
- Mostrar data e hora no fuso do navegador, identificando o fuso. O helper atual de datas usa São Paulo fixo; criar formatação específica para este prazo.
- Informar que a confirmação será enviada por e-mail, sem afirmar que a entrega já ocorreu.
- Ação: “Ir para entrar”. O cancelamento será oferecido durante o login, após validar as credenciais e o prazo.

Transportar somente a data retornada pela API em `sessionStorage`, com chave própria e leitura validada. Preservar a data no recarregamento enquanto estiver no prazo; apagar após login bem-sucedido. Não incluir senha, tokens, login ou dados pessoais na URL. Falha no armazenamento não pode impedir a saída da área autenticada.

No acesso direto sem aviso válido, apresentar instruções gerais e orientar a consultar a data no e-mail. Não inventar data nem afirmar que aquela conta possui uma solicitação: não existe consulta pública de status no contrato atual. Metadados locais nunca autorizam cancelamento ou servem como prova de situação atual.

### 2.4. Cancelamento confirmado durante o login

A [tela de entrada](../app/(auth)/entrar/page.tsx) mantém apenas o formulário normal de login. Credenciais válidas de uma conta pendente e dentro do prazo produzem `ACCOUNT_PENDING_DELETION`; só esse código abre o diálogo.

- Mostrar que continuar cancelará a exclusão e levará à página inicial.
- “Sim, cancelar exclusão e entrar”: enviar as credenciais e `confirmAccountDeletionCancellation: true` ao BFF de login. O BFF revalida o login, cancela sem Bearer revogado, faz novo login e emite novos cookies.
- “Não, manter exclusão e voltar” ou Escape: apagar as credenciais em memória, fechar o diálogo, manter o login visível e não fazer chamada de cancelamento.
- Desabilitar repetição e fechamento durante a confirmação. Não armazenar credenciais em cookies, URL ou Web Storage.
- Após sucesso, apagar aviso local e ir para `/app`, inclusive para usuários com convite pendente; o login normal preserva seu fluxo atual de convites.
- Caso o cancelamento tenha sido confirmado pela API mas o login seguinte falhe, informar que a exclusão já foi cancelada e solicitar novo login.
- `ACCOUNT_UNAVAILABLE` continua genérico e não abre confirmação. O backend verifica senha antes de revelar a pendência e compara o prazo com seu próprio relógio.

## 3. Integração técnica e sessão

### 3.1. Rotas propostas no BFF

- `POST /api/auth/account-deletion` → endpoint autenticado de agendamento.
- `POST /api/auth/login` → orquestra cancelamento apenas com confirmação explícita e resposta específica de pendência; não criar rota pública separada de cancelamento no frontend.
- Validar JSON e campos obrigatórios na entrada; devolver erro de validação para JSON malformado, sem expor detalhes internos.
- Tipar os corpos e a resposta `AccountDeletionResponse` em módulo próprio.
- Retornar `Cache-Control: no-store` nas respostas desse fluxo.
- Tratar modo demonstração explicitamente: ação indisponível, sem simular exclusão real nem chamar o backend usando uma conta de demonstração.

### 3.2. Ajuste obrigatório no tratamento de 401

O [proxy autenticado atual](../lib/backend.ts) tenta renovar a sessão para qualquer `401` e pode limpar cookies. O endpoint novo usa `401 / INVALID_CREDENTIALS` também para senha atual incorreta. Usar o proxy sem adaptação repetiria tentativas de senha e poderia deslogar uma sessão válida.

Planejar uma política específica para esta chamada, preservando os padrões das demais rotas:

1. Identificar `401` de negócio pelo código `INVALID_CREDENTIALS`, inspecionando a resposta sem consumir o corpo que será encaminhado.
2. Nesse caso, devolver o erro ao modal sem renovar, repetir a chamada ou apagar a sessão.
3. Para falha real de autenticação do token, permitir no máximo uma renovação e uma repetição, como no fluxo atual.
4. Se a renovação falhar, retornar erro de sessão e encerrar a sessão inválida. A UI deve tratar isso explicitamente: o cliente atual não redireciona automaticamente para rotas `/api/auth/*`.
5. Em `202`, aplicar a limpeza de `dna_access`, `dna_refresh` e `dna_demo` na resposta final, inclusive quando houve renovação durante a operação. Não deixar cookies recém-renovados na resposta de sucesso.
6. Em `400`, erro de senha, `409`, `429` ou indisponibilidade, não mostrar sucesso nem encerrar uma sessão válida por causa da solicitação malsucedida.

Reutilizar [clearSessionCookies](../lib/backend.ts) no servidor. Não chamar logout como condição adicional de sucesso: o backend já revogou as sessões no agendamento.

### 3.3. Chamadas concorrentes e dados locais

- Suspender o polling autenticado do [AppShell](../components/app-shell.tsx) durante o envio; cancelar/ignorar respostas pendentes que poderiam redirecionar por sessão expirada após a revogação e ocultar a confirmação.
- Retomar as consultas se a solicitação falhar e a sessão ainda for válida. Após sucesso, concluir a navegação pública mesmo se a limpeza de armazenamento falhar.
- Remover apenas as chaves relacionadas à conta, como `dna:award-processing` e `dna:award-notice`, por funções de [award-processing](../lib/award-processing.ts). Não usar `localStorage.clear()`.
- Notificar outras abas, por canal de sessão, para desmontar a interface autenticada após agendamento. Não compartilhar credenciais ou dados pessoais pelo canal.
- Verificar navegação de histórico e restauração de página para que voltar à área autenticada revalide a sessão e não reapresente dados antigos como utilizáveis.

### 3.4. Falha de rede e tempo limite

O backend pode aguardar processamento de vídeo antes de agendar; o BFF atualmente usa 12 segundos para essas chamadas. Definir um timeout específico compatível com a hospedagem, usando medições em homologação, sem alterar todos os endpoints.

Se a resposta se perder, a operação pode ter sido aceita. Mostrar “Não foi possível confirmar o resultado. Confira seu e-mail; se a exclusão foi agendada, você pode cancelá-la pela tela de entrada.” Não afirmar que nada mudou, não calcular prazo local e não repetir automaticamente uma operação com efeito destrutivo. Oferecer navegação para entrada/cancelamento. A ausência de endpoint de consulta impede reconciliar o status com certeza somente pelo frontend.

## 4. Estados e mensagens de erro

| Situação | Comportamento da interface |
| --- | --- |
| Senha ou aceite ausentes | Impedir envio; orientar junto ao campo |
| `400` | Mostrar validação; manter formulário aberto |
| Agendamento: `401 / INVALID_CREDENTIALS` | “Senha atual incorreta.”; limpar senha, focar campo e preservar sessão válida |
| Agendamento: sessão ausente/expirada | Encaminhar para entrada com aviso de sessão, sem afirmar agendamento |
| Cancelamento: `401` | “E-mail/telefone ou senha inválidos.”; manter formulário público |
| Agendamento: `409 / ACCOUNT_UNAVAILABLE` | “A conta não está disponível para esta solicitação.” |
| Cancelamento: `409 / ACCOUNT_DELETION_NOT_CANCELLABLE` | “O prazo terminou ou a conta não possui exclusão que possa ser cancelada.” |
| `429 / ACCOUNT_DELETION_RATE_LIMITED` | Orientar aguardar antes de tentar novamente; não repetir automaticamente |
| Rede, timeout ou `5xx` | Exibir falha/resultado não confirmado; não exibir sucesso |
| `202` no agendamento | Limpar sessão, apresentar data e oferecer cancelamento |
| `204` no cancelamento | Efetuar novo login no BFF e emitir nova sessão; informar resultado parcial se esse login falhar |

O limite documentado é compartilhado por conta entre solicitação e cancelamento: mais de sete tentativas sem sucesso em 15 minutos. Não mostrar contagem ou horário exato de desbloqueio sem informação do servidor. Só usar `Retry-After` se o backend realmente o fornecer e o BFF o encaminhar.

## 5. Mapa de alterações

O mapa abaixo corresponde à implementação. Os itens indicados como novos foram adicionados para este fluxo.

| Área | Alteração planejada |
| --- | --- |
| [Página de perfil](../app/(authenticated)/app/perfil/page.tsx) | Cartão de exclusão, abertura da confirmação e bloqueio de ações conflitantes |
| Novo `components/account-deletion-dialog.tsx` | Modal, senha, aceite, envio e feedback acessível |
| Novo `lib/account-deletion.ts` | Tipos, avisos transitórios e formatação do prazo |
| Novo `app/api/auth/account-deletion/route.ts` | Agendamento autenticado e limpeza de cookies no `202` |
| [Rota de login](../app/api/auth/login/route.ts) | Cancelamento confirmado sem Bearer, seguido de novo login |
| [Backend do BFF](../lib/backend.ts) | Política de `401` e timeout específicos para agendamento |
| Novo `app/(auth)/exclusao-conta/page.tsx` | Confirmação pública e instruções de prazo |
| [Login](../app/(auth)/entrar/page.tsx) | Diálogo de confirmação após tentativa válida de login com exclusão pendente |
| [AppShell](../components/app-shell.tsx) e [cliente HTTP](../lib/client-api.ts) | Coordenação das consultas e redirecionamentos durante encerramento de sessão |
| [Armazenamento de avisos](../lib/award-processing.ts) | Limpeza das chaves da conta |

## 6. Sequência de implementação

1. **Contrato e BFF:** tipos, rotas, distinção dos erros de senha/sessão, refresh e limpeza de cookies.
2. **Área pública:** confirmação de cancelamento durante o login e página pública de agendamento. Disponibilizar esse fluxo antes de habilitar o botão de exclusão.
3. **Perfil:** cartão, diálogo, aceite, senha, estados e integração com as rotas.
4. **Sessão:** polling, respostas concorrentes, avisos, navegação e outras abas.
5. **Verificação:** testes focados, checagem de tipos/lint e roteiro manual em homologação com conta de teste.
6. **Publicação:** confirmar migração V16 e backend atualizado em todas as instâncias; publicar solicitação e cancelamento juntos. A documentação informa incompatibilidade com versões antigas de cache de segurança.

## 7. Verificações e critérios de aceite

Testes a executar durante a implementação, sem realizar exclusões reais neste planejamento:

- BFF: `202` preserva o corpo e apaga os três cookies, inclusive após refresh; cancelamento não encaminha Authorization nem emite sessão.
- Senha incorreta: uma única tentativa no backend, sem refresh e sem logout da sessão válida.
- Token expirado: no máximo uma renovação; falha da renovação conduz ao login.
- Cobrir validação, `409`, `429`, `5xx`, resposta perdida e JSON malformado.
- UI: abrir/fechar não chama a API; senha e aceite obrigatórios; clique duplo gera uma chamada; senha não aparece em URL ou armazenamento.
- Fluxo completo: perfil → confirmação → `202` → página pública com data correta → login → confirmação de cancelamento → `204` interno → novo login → página inicial.
- Recusar a confirmação retorna ao formulário de entrada sem chamar cancelamento; login normal e conta bloqueada por outro motivo não exibem o diálogo.
- Conta já ativa no cancelamento recebe mensagem compatível com `204`; conta fora do prazo não recebe confirmação falsa.
- O frontend respeita a decisão do servidor mesmo com relógio do dispositivo incorreto. Data exibida corresponde ao instante `scheduledFor` em fusos diferentes.
- Resposta concorrente de polling com `401` não substitui a confirmação de sucesso por aviso de sessão expirada.
- Limpeza e navegação funcionam com armazenamento bloqueado; acesso direto às páginas públicas não mostra agendamento fictício.
- Outra aba e botão Voltar não permitem continuar utilizando a conta bloqueada.
- Diálogo utilizável por teclado, leitor de tela e celular; erros e carregamento anunciados.
- Exclusão e confirmação no login disponíveis na mesma entrega; recuperação por login independe de sessão, dispositivo e aviso armazenado no navegador.
- Executar scripts existentes de tipos e lint, além dos testes focados. Não é necessário refazer os testes de remoção e preservação de votos já pertencentes ao backend.

## 8. Pontos a confirmar antes da entrega

- Versão do backend em produção, migração V16, novo código `ACCOUNT_PENDING_DELETION` no login e ausência de instâncias antigas.
- Tempo de espera real com vídeo em processamento e limite de execução da hospedagem do BFF.
- Revisão da redação sobre dados retidos e mídias externas conforme o comportamento documentado, sem prometer anonimização completa.
- Validação de sessão expirada e renovação com o formato real de erro de autenticação do backend.

Esses pontos orientam a implementação e a homologação; o contrato local já permite iniciar o trabalho sem inventar endpoint, prazo ou payload.

## 9. Implementação e verificação — 13/10/2026

- Implementados o cartão e diálogo de exclusão no perfil, o BFF de agendamento, a limpeza da sessão e a página pública com o prazo da API.
- Implementada a confirmação durante o login, sem link separado de cancelamento. Recusar mantém a exclusão; confirmar cancela no backend, cria nova sessão e leva a `/app`.
- Backend atualizado para identificar `ACCOUNT_PENDING_DELETION` somente após validar senha e prazo. Texto do e-mail alinhado com o novo fluxo.
- Corrigidas as corridas entre respostas de sessão expirada e a confirmação, incluindo o aviso entre abas: a aba de origem permanece na confirmação do agendamento.
- 16 testes focados do frontend passaram em [account-deletion.test.mjs](../scripts/account-deletion.test.mjs).
- 16 testes focados do backend passaram: 5 de API, 7 do serviço de exclusão e 4 do login com exclusão pendente.
- Verificação no navegador com respostas simuladas: recusa e confirmação no login, validação do formulário de exclusão, senha incorreta e redirecionamento com data após agendamento. Nenhuma conta real foi excluída.
- Publicação depende da entrega conjunta do frontend e do backend com o novo código de erro. Migração V16, instâncias atualizadas e limites de execução da hospedagem continuam sendo verificações do ambiente de publicação.
