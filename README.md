# ProtecLiter SaaS

Plataforma SaaS para detecção, priorização e remoção automatizada de conteúdos digitais protegidos/distribuídos ilegalmente.

## Stack Tecnológico

- **Backend**: Node.js + TypeScript + NestJS
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Search**: ElasticSearch
- **Storage**: S3 (MinIO para dev local)

## Estrutura do Projeto

```
protecliter/
├── apps/                    # Aplicações/serviços
│   ├── api-gateway/         # API Gateway principal
│   ├── auth-service/        # Autenticação e IAM
│   ├── crawler-service/     # Orquestrador de crawling
│   ├── detection-service/   # ML classifier
│   ├── case-service/        # Gestão de casos
│   ├── takedown-service/    # Orquestrador de remoções
│   ├── backoffice-web/      # React - Painel analistas
│   └── client-portal/       # React - Portal cliente
├── packages/                # Pacotes compartilhados
│   ├── shared-types/        # TypeScript types
│   ├── database/            # Prisma schema
│   └── logger/              # Winston logger
└── infrastructure/          # IaC e configs
```

## Quick Start

```bash
# Instalar dependências
pnpm install

# Subir infraestrutura local
docker-compose up -d

# Gerar cliente Prisma
pnpm db:generate

# Executar migrations
pnpm db:migrate

# Iniciar dev servers
pnpm dev
```

## Desenvolvimento

```bash
# Rodar testes
pnpm test

# Lint
pnpm lint

# Formatar código
pnpm format

# Prisma Studio (visualizar DB)
pnpm db:studio
```

## Licença

Proprietário - Todos os direitos reservados.
