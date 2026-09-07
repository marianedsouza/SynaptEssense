# SynaptEssence360® — MVP

**Plataforma de Tecnologia Social para o Desenvolvimento Humano Integral**

> Toda transformação começa quando novas conexões são criadas.

Primeira versão funcional do ecossistema SynaptEssence360®. Implementa a **CAMADA 1 — Coleta** (Levantamento Estratégico) com a estrutura administrativa inicial da **CAMADA 3 — Análise**.

## O que está implementado

### Experiência do participante
- Landing screen premium com identidade visual própria e animação de conexões neurais
- Apresentação da metodologia e presença da analista (foto opcional e configurável)
- Recepção → Aviso "Antes de começar" → Consentimento informado (LGPD)
- Identificação (10 campos)
- Questionário dinâmico: **1 pergunta por tela**, telas de transição entre eixos
- Escala Likert de 5 pontos (visual, amigável ao toque)
- Perguntas abertas e módulo de Marca (exibido só quando aplicável)
- Salvamento automático a cada resposta (`✓ Progresso salvo`)
- Retomada de sessão interrompida (localStorage + banco)
- Barra de progresso elegante + contador "Pergunta X de Y"
- Conclusão sem nenhum resultado interpretativo (devolutiva é presencial)

### Painel do analista (login e-mail/senha)
- Visão geral com indicadores (iniciados, em andamento, concluídos, progresso médio)
- Tabela de participantes com busca e filtros
- Dossiê do levantamento: identificação, processo e **todas as respostas por eixo**
- Análise Técnica (anotações privadas com salvamento contínuo)
- Área reservada "Inteligência SynaptEssence360®" (módulo futuro)
- Exportação **PDF** e **Excel** por participante
- Configurações: perfil da analista (nome, título, foto), textos institucionais

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilo | Tailwind CSS 3 (design system próprio) |
| Banco / Auth / Storage | Supabase (PostgreSQL, Auth, Storage) |
| Exportação | jsPDF + ExcelJS |
| Ícones | lucide-react |

## Configuração

### 1. Banco de dados (Supabase)

1. Abra o **SQL Editor** do seu projeto Supabase.
2. Execute o arquivo [`supabase/schema.sql`](supabase/schema.sql) (tabelas, RLS e funções RPC).
3. Execute o arquivo [`supabase/seed.sql`](supabase/seed.sql) (versão v0.1 + 91 perguntas + textos padrão).

> Para regenerar o `seed.sql` após alterar o banco de perguntas: `npm run seed`.

### 2. Usuário administrador

1. No painel do Supabase: **Authentication → Users → Add user**.
2. Crie um usuário com e-mail e senha. Esse será o acesso do analista em `/admin/login`.

> As tabelas `participants` e `analyst_notes` só podem ser lidas por usuários autenticados (RLS). O participante acessa apenas o próprio registro por meio de funções RPC (`create_participant`, `get_participant`, `save_participant_answers`, `complete_participant`).

### 3. Storage (foto da analista)

1. Abra o **SQL Editor** e execute o arquivo [`supabase/storage.sql`](supabase/storage.sql) — cria o bucket público `assets` e as políticas de leitura (anon/autenticado) e upload/exclusão (autenticado).
2. Alternativa manual: em **Storage → New bucket**, crie o bucket `assets` como **público** e, na aba Policies, permita upload/exclusão apenas para usuários autenticados.

### 4. Variáveis de ambiente

O arquivo `.env` já está configurado com seu projeto:

```
VITE_SUPABASE_URL=https://hxvvdjlpxvicczbyltej.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### 5. Rodando localmente

```bash
npm install
npm run dev
```

- Experiência do participante: `http://localhost:5173`
- Painel do analista: `http://localhost:5173/admin`

### 6. Produção

```bash
npm run build
```

O diretório `dist/` pode ser publicado em Vercel, Netlify, Cloudflare Pages ou outro host estático. Configure as duas variáveis `VITE_*` no host.

### 7. Lembretes automáticos por e-mail

O fluxo de comunicação com o participante é feito por um **cron do Vercel** que roda diariamente às 12h UTC (09h no Brasil) chamando `api/send-reminders.ts`:

- **Pagamento pendente** — quando alguém entra no protocolo, gera a preferência de pagamento e não conclui, recebe um e-mail de chamamento para concluir o pagamento (com plano, valor e link para a área). Considera pagamentos pendentes criados há mais de 30 minutos.
- **Consulta agendada (D-1)** — participantes com sessão `agendada` para **amanhã** recebem um e-mail no dia anterior, com data, horário e orientações.

**1. Banco de dados:**

Execute no SQL Editor do Supabase o arquivo [`supabase/mail-reminders.sql`](supabase/mail-reminders.sql) — adiciona colunas `reminder_sent_at` e `reminder_count` em `payments` e `sessions` para evitar envios duplicados.

**2. Provedor de e-mail (Resend):**

1. Crie uma conta em [resend.com](https://resend.com) e adicione o domínio `synaptessence.com.br`.
2. Gere uma API Key (`re_...`).

**3. Variáveis de ambiente no Vercel** (Settings → Environment Variables):

| Variável | Descrição |
|---|---|
| `CRON_SECRET` | segredo usado pelo cron para autorizar a chamada (qualquer string longa e aleatória) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | chave de serviço do Supabase (Settings → API → service_role) |
| `RESEND_API_KEY` | API Key do Resend |
| `EMAIL_FROM` | remetente, ex.: `contato@synaptessence.com.br` (domínio verificado no Resend) |
| `SITE_URL` | URL pública do site, ex.: `https://synapt-essense.vercel.app` |

> O `vercel.json` já declara o cron `0 12 * * *`. Para testar manualmente: `curl -X POST https://<seu-site>/api/send-reminders -H "Authorization: Bearer <CRON_SECRET>"`. O endpoint exige o `CRON_SECRET` e só envia um e-mail por registro (colunas `reminder_sent_at`/`reminder_count`).

## Arquitetura

```
src/
├── components/        # UI compartilhada (Logo, cards, layouts)
├── context/           # Configurações institucionais
├── lib/
│   ├── questionBank.ts   # Banco de perguntas v0.1 (fonte única no MVP)
│   ├── questionUtils.ts  # Montagem do questionário conforme o tipo
│   ├── axes.ts           # Metadados dos eixos (transições)
│   ├── participants.ts   # Operações RPC do participante
│   ├── admin.ts          # Consultas do painel do analista
│   ├── sessions.ts       # Agendamento de sessões (dossiê/agenda)
│   ├── export.ts         # PDF + Excel
│   ├── settings.ts       # Textos configuráveis
│   └── types.ts
├── pages/
│   ├── participant/   # Landing → … → Conclusão
│   └── admin/         # Login, Visão geral, Dossiê, Configurações
└── App.tsx            # Rotas
api/
├── mercadopago-webhook.ts  # Webhook de pagamentos (Vercel Function)
└── send-reminders.ts       # Cron de lembretes (pagamento pendente + consulta D-1)
supabase/
├── schema.sql         # Tabelas, RLS, RPCs
├── seed.sql           # Perguntas + configurações (gerado)
└── *.sql              # Migrações incrementais (pagamentos, sessões, lembretes)
scripts/
└── generate-seed.mjs  # Gera o seed a partir do questionBank
```

### Como evoluir o questionário

1. Edite `src/lib/questionBank.ts` (cada pergunta tem `axis`, `type`, `module`, `archetype`).
2. `npm run seed` regenera o `seed.sql`.
3. A `questionnaire_version` fica gravada em cada participante — participantes antigos permanecem vinculados à versão que responderam.

## Fluxo de teste (cenário real)

1. Envie o link para o participante.
2. Ele deverá: abrir no celular → entender a metodologia → ver a analista → aceitar o consentimento → responder → sair e voltar sem perder respostas → concluir → **não ver nenhum resultado**.
3. No painel: faça login → localize o participante → abra o dossiê → confira todas as respostas → exporte PDF e Excel.

## Princípios respeitados

- O participante **nunca** recebe resultados interpretativos automáticos.
- Linguagem não clínica em todas as telas e perguntas.
- Nenhuma coleta de dados sensíveis além do necessário.
- RLS: dados do participante não são expostos publicamente; painel restrito a autenticados.
- Nenhuma inferência sobre política, religião, raça ou saúde.

## Módulos previstos para o futuro (arquitetura pronta)

Motor arquetípico, indicadores, correlações, radar comportamental, dashboard analítico, plano estratégico de desenvolvimento, agenda, histórico de sessões, relatórios profissionais e comparação longitudinal.
