# DNA Futsal — Fase 5: homologação e publicação controlada

Este checklist não altera usuários nem dados esportivos. Execute primeiro em ambiente local/homologação. **Não execute deploy apenas porque um build compilou.**

## 1. Pré-requisitos

- Fases 1 a 4 instaladas, testadas e versionadas nos repositórios corretos.
- `git status --short` revisado e confirmação explícita da branch: `git branch --show-current`.
- Backend Flyway V17 aplicado com êxito em homologação; **não executar manualmente `ALTER TABLE` em produção**.
- Scraper apto a consultar `Paulista` e `Paulista Feminino` para a mesma temporada.
- Contas de teste separadas: uma masculina, uma feminina e, se disponível, uma do Torneio União.

## 2. Testes automáticos

Scraper (`dna_scrapper`): `mvn -B test`.

Backend (`dna_backend`): `mvn -B test` com Docker ativo. O teste `UserCompetitionMigrationTest` usa PostgreSQL Testcontainers para verificar o upgrade V16 → V17 e a preservação das contas existentes. A suíte pode pular testes de integração se o Docker estiver desligado: confirme que eles foram **executados**, não apenas ignorados.

Frontend (`dna_frontend`):

```powershell
node --test scripts/sports-preference.test.mjs scripts/sports-navigation.test.mjs scripts/futsal-feminino-smoke.test.mjs
npm run typecheck
npm run build
```

Para verificar a aplicação local com o frontend em execução e backend/scraper acessíveis:

```powershell
$env:DNA_SMOKE_BASE_URL = "http://localhost:3000"
$env:DNA_SMOKE_SEASON = "2026"
node scripts/futsal-feminino-smoke.mjs
```

É um smoke de **somente leitura (GET)**: verifica divisões, categorias, times, títulos separados, IDs de eventos distintos e catálogo padrão masculino. A consulta depende da temporada realmente existente na FPFS. A existência de uma divisão sem categorias não constitui falha; a inexistência de todas as categorias, sim.

Opcional: para testar as rotas esportivas autenticadas, use uma conta de **homologação**, e defina temporariamente `DNA_SMOKE_COOKIE` no seu próprio terminal. Não compartilhe nem grave cookies em arquivos, tickets ou logs. O script não envia o cookie a outras origens. Para uma URL que não seja `localhost`, é obrigatório definir `DNA_SMOKE_ALLOW_REMOTE=1` conscientemente. Após a execução, limpe a variável de ambiente.

## 3. Regressão funcional (navegador)

1. Cadastro masculino novo → confirmação de e-mail → perfil correto.
2. Cadastro feminino novo → divisão → categoria → time → confirmação de e-mail; conferir a persistência em `/api/me`.
3. Editar apenas informações pessoais de conta antiga; confirmar que `eventId` e time não mudaram.
4. Trocar o perfil masculino/feminino e confirmar que categorias antigas não permanecem no formulário.
5. Em Jogos, Tabela e Artilharia, explorar feminino e conferir o evento retornado; repetir para masculino.
6. Home acompanhando o mesmo evento selecionado em Explorar competição.
7. Meu Time permanece vinculado à equipe persistida, mesmo quando se explora outra competição.
8. “Minha categoria” retorna à preferência do perfil sem sobrescrevê-la.
9. Trocar rapidamente entre masculino/feminino e confirmar que respostas HTTP atrasadas não misturam catálogos.
10. Na branch que contém o Torneio União, validar chave, fase, classificação e mata-mata; não presumir que o suporte ao União da outra branch está na `master`.
11. Login/logout, prêmio e inscrições continuam funcionando.

## 4. Banco e publicação

- Fazer backup `pg_dump` **antes** de aplicar qualquer migração e provar que o arquivo pode ser restaurado num banco isolado.
- Verificar a tabela `flyway_schema_history`: a versão 17 não pode estar aplicada com checksum divergente.
- Revisar SQL V17: coluna opcional, sem `UPDATE` em massa dos usuários existentes.
- Registrar SHA de imagem de backend, scraper e frontend e o commit Git implantado; não publicar tags mutáveis sem rastreabilidade.
- Implantar primeiro scraper compatível, depois backend com migração, depois frontend; validar respostas/health-check entre cada etapa.
- Em produção, conferir que há uma única origem de dados esportivos por evento e monitorar 4xx/5xx, latência, falhas de scraping e uso de memória.
- Somente prosseguir se os cenários 1–11 estiverem aprovados na versão candidata ao deploy.

## 5. Plano de reversão

- Em caso de falha de funcionalidade, reverter o frontend para a imagem anterior, preservando a instância do banco.
- Em falha persistente, reverter o backend para uma imagem comprovadamente compatível com a coluna opcional de V17.
- **Não apagar a coluna V17 automaticamente.** Migrações Flyway já executadas não devem ser editadas nem revertidas por `DROP COLUMN` sem um plano de dados separado.
- Conservar evidências (logs, checksums, commit SHA) para investigar o erro antes de retentar publicação.
