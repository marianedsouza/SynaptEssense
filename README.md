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

1. Em **Storage → New bucket**, crie o bucket `assets` (público).
2. Na aba Policies: permita upload/exclusão apenas para usuários autenticados.

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
│   ├── export.ts         # PDF + Excel
│   ├── settings.ts       # Textos configuráveis
│   └── types.ts
├── pages/
│   ├── participant/   # Landing → … → Conclusão
│   └── admin/         # Login, Visão geral, Dossiê, Configurações
└── App.tsx            # Rotas
supabase/
├── schema.sql         # Tabelas, RLS, RPCs
└── seed.sql           # Perguntas + configurações (gerado)
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
