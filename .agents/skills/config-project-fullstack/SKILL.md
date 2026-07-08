---
name: config-project-fullstack
description: Scaffolds a fullstack Turborepo monorepo from absolute zero — Next.js frontend (port 3000) plus NestJS backend (port 4000, @nestjs/config, CORS enabled). Use when initializing, bootstrapping, criando, ou configurando um novo projeto fullstack. Aceita um namespace npm opcional (@org) para reescrever todos os package.json.
---

# config-project-fullstack

Cria um monorepo fullstack determinístico, do zero, em um único comando.
Toda a lógica vive em [`setup.js`](./setup.js) — este arquivo é só o manual.

## Estado final garantido

```
<project-name>/
├── apps/
│   ├── frontend/           # Next.js (porta 3000)
│   │   ├── src/
│   │   ├── .env            # NEXT_PUBLIC_API_URL=http://localhost:4000
│   │   └── .env.example
│   └── backend/            # NestJS (porta 4000)
│       ├── src/
│       │   ├── app.module.ts  # ConfigModule.forRoot({ isGlobal: true })
│       │   └── main.ts        # app.enableCors(); listen(4000)
│       ├── .env            # PORT=4000
│       └── .env.example
├── packages/               # do template do Turborepo
├── package.json
└── turbo.json
```

- backend lê variáveis de ambiente via `@nestjs/config` (global)
- backend roda em `process.env.PORT ?? 4000` com CORS habilitado
- script `dev` adicionado ao backend (`nest start --watch`)

## Pré-requisitos

- Node.js 18+
- npm
- npx (vem junto com o npm)
- acesso à rede (download de `create-turbo`, `create-next-app`, `@nestjs/cli`)

## Executando

A partir da pasta onde está `.agents/skills/config-project-fullstack/`:

```bash
# Nome padrão "projeto-exemplo"
node .agents/skills/config-project-fullstack/setup.js

# Com nome customizado
node .agents/skills/config-project-fullstack/setup.js minha-app

# Com nome + namespace npm (reescreve todos os package.json no fim)
node .agents/skills/config-project-fullstack/setup.js minha-app --namespace @minha-org

# Sobrescrever um diretório existente
node .agents/skills/config-project-fullstack/setup.js minha-app --force
```

Argumentos:

| Argumento            | Default              | Descrição                                                              |
|----------------------|----------------------|------------------------------------------------------------------------|
| `<project-name>`     | `projeto-exemplo`    | Nome da pasta criada no cwd. Só letras, números, `.`, `-`, `_`.        |
| `--namespace <@org>` | `null`               | Reescreve `name` de todos os `package.json` para `@org/<base>` ao fim. |
| `--force`            | `false`              | Remove a pasta de destino se ela já existir.                           |
| `--help`             | —                    | Mostra o uso.                                                          |

## Iniciando a aplicação após o setup

```bash
cd <project-name>
npm run dev
```

O Turborepo orquestra ambos os apps em paralelo:

- frontend → http://localhost:3000
- backend  → http://localhost:4000

## Como o setup.js é determinístico

1. **Verificações antes de tocar em qualquer coisa** — node ≥ 18, npm/npx presentes, nome do projeto válido, namespace no formato `@xxx`, pasta de destino livre (ou `--force`), cwd não é `/` ou `$HOME`.
2. **Falha rápido** — qualquer erro de subprocesso aborta o script (`stdio: inherit`, sem swallowing); diretório em estado inconsistente fica visível para correção manual.
3. **Ordem fixa de passos** — segue o passo-a-passo na ordem exata, sem ramificações condicionais escondidas.
4. **Arquivos sobrescritos por conteúdo literal** — `app.module.ts`, `main.ts`, `.env*` são escritos por inteiro (não por patch), então o resultado independe do template upstream.
5. **Namespace é o último passo** — só roda depois que tudo está no disco, e altera apenas campos `name` e referências cruzadas em `dependencies/devDependencies/peerDependencies/optionalDependencies`.

## Gotchas

- **`npx @nestjs/cli`, não `npm i -g`** — o passo-a-passo manual instala o `@nestjs/cli` globalmente; o script usa `npx --yes @nestjs/cli` para não poluir o ambiente. Resultado é idêntico.
- **`--namespace` exige `@`** — passar `minha-org` (sem `@`) é rejeitado na validação. Use `@minha-org`.
- **`/bin/rm -rf apps/*` no passo-a-passo** — o script faz o equivalente em Node (`fs.rmSync` em cada entrada de `apps/`), funciona em qualquer SO.
- **Restart se falhar no meio** — se uma das chamadas `npx create-*` falhar (rede, registry timeout), o diretório fica meio-criado. Apague-o (`rm -rf <project-name>`) e rode de novo, ou use `--force`.
- **Namespace renomeia também os `packages/*` do template** — `@repo/ui`, `@repo/eslint-config`, `@repo/typescript-config` viram `@minha-org/ui`, etc. Referências cruzadas (`devDependencies`) são atualizadas na segunda passada do rename.

## Troubleshooting

| Sintoma                                                    | Causa / Correção                                                                |
|------------------------------------------------------------|---------------------------------------------------------------------------------|
| `Erro: Node.js 18+ é obrigatório`                          | Atualize Node. `nvm install 20 && nvm use 20`.                                  |
| `Erro: o diretório "X" já existe`                          | Use outro nome ou `--force`.                                                    |
| `Erro: namespace inválido`                                 | Use o formato `@org-name` (começa com `@`).                                     |
| `npx create-turbo` trava em "Installing dependencies"      | Problema de rede no registry npm. Confirme `npm ping`, depois rode novamente.   |
| Porta 4000 ocupada ao subir o backend                      | Mude `PORT=` no `apps/backend/.env` ou mate o processo (`lsof -i :4000`).       |
| Frontend não consegue chamar o backend                     | CORS já está habilitado; cheque `NEXT_PUBLIC_API_URL` no `apps/frontend/.env`.  |
