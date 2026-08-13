# DNA Futsal — front-end

Aplicação web mobile-first construída com Next.js 16, React 19, TypeScript e Tailwind CSS 4. O front consome a API Java do DNA Futsal por uma camada BFF (Backend for Frontend), mantendo access token e refresh token em cookies `HttpOnly`.

## O que está pronto

- Landing page e experiência responsiva para celular, tablet e desktop.
- Cadastro com nome, e-mail, telefone e senha obrigatórios.
- Preferências opcionais dependentes: categoria → divisão → time.
- Login por e-mail ou telefone.
- Confirmação e reenvio de e-mail.
- Solicitação e confirmação de redefinição de senha.
- Renovação automática da sessão com refresh token rotativo.
- Dashboard personalizado com próximo jogo, posição, último resultado e notícias.
- Telas separadas para jogos futuros e encerrados.
- Classificação, artilharia, notícias e detalhes de uma notícia.
- Perfil editável somente com a senha atual.
- PWA instalável por meio do manifesto do aplicativo.
- Estados de carregamento, vazio, indisponibilidade e sessão expirada.

## Requisitos

- Node.js 20.9 ou superior (recomendado: Node.js 22 LTS).
- Backend DNA Futsal disponível localmente ou em uma URL HTTPS.

## Executar

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000`.

No `.env.local`, informe a URL interna do backend:

```dotenv
DNA_API_URL=http://localhost:8080
```

Para uma inspeção visual sem o backend, ative temporariamente:

```dotenv
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

O modo demonstração é isolado e fica desativado por padrão.

## Configuração conjunta com o backend

No backend Java, configure a URL pública do front para que os links enviados por e-mail apontem para as telas corretas:

```dotenv
FRONTEND_BASE_URL=https://app.seudominio.com.br
CORS_ALLOWED_ORIGINS=https://app.seudominio.com.br
```

Os links já esperados são:

- `/confirmar-email?token=...`
- `/redefinir-senha?token=...`

## Segurança da sessão

O navegador não recebe tokens no `localStorage`. O BFF do Next guarda os tokens em cookies `HttpOnly`, `Secure` em produção e `SameSite=Lax`. Quando o access token expira, a camada BFF usa o refresh token uma única vez, atualiza os cookies e repete a consulta. O logout revoga a sessão no backend e limpa os cookies locais.

## Scripts

```bash
npm run dev        # desenvolvimento
npm run typecheck  # validação TypeScript
npm run lint       # análise estática
npm run build      # build de produção
npm start          # servidor de produção
```

## Estrutura principal

```text
app/
  (auth)/                 fluxos públicos de identidade
  (authenticated)/app/    telas autenticadas
  api/                    BFF e proteção dos tokens
components/               interface e componentes do domínio
lib/                      tipos, cliente, sessão e fixtures de QA
public/                   logo otimizado
docs/                     identidade visual
```

Consulte [docs/PALETA-DE-CORES.md](docs/PALETA-DE-CORES.md) para os tokens e as regras de uso da identidade.
