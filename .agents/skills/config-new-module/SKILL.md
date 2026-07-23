---
name: config-new-module
description: Cria deterministicamente um novo módulo de negócio. Dois modos — (1) workspace (padrão) monta modules/<nome> com package.json, tsconfig, jest, src+test, registra dep nos apps, roda install/build/test (namespace obrigatório); (2) --backend cria um módulo NestJS em apps/backend/src/modules/<nome> com <nome>.module.ts + <nome>.controller.ts (endpoint GET), registra no AppModule e recompila o backend.
---

# config-new-module

Cria um novo módulo de negócio em um único comando. Toda a lógica vive em
[`setup.js`](./setup.js) — este arquivo é só o manual. Templates para o modo
workspace estão em [`assets/`](./assets/); templates do modo Nest são inline no
`setup.js`.

A skill tem **dois modos** que compartilham parsing/validação mas rodam fluxos
independentes:

## Modo 1 — Workspace (padrão)

Estado final garantido:

```
modules/<nome-do-modulo>/
├── src/
│   └── index.ts         # export inicial de exemplo (getModuleName)
├── test/
│   └── index.test.ts    # teste inicial passando
├── jest.config.ts       # preset ts-jest, roots: ['<rootDir>/test']
├── tsconfig.json        # rootDir: src, outDir: dist
└── package.json         # name = <namespace>/<nome-do-modulo>, scripts build+test
```

Além disso, no monorepo raiz:

- `apps/frontend/package.json` recebe `"<namespace>/<nome-do-modulo>": "*"` em `dependencies`
- `apps/backend/package.json` recebe `"<namespace>/<nome-do-modulo>": "*"` em `dependencies`
- `package.json` raiz garante `ts-node@^10.9.2` em `devDependencies`
- `package.json` raiz garante `modules/*` na lista de `workspaces`

Ao final, o script executa `npm install`, `npm run build` e os testes do módulo criado.

## Modo 2 — Backend Nest (`--backend`)

Estado final garantido:

```
apps/backend/src/modules/<nome-do-modulo>/
├── <nome-do-modulo>.module.ts       # @Module com o controller registrado
└── <nome-do-modulo>.controller.ts   # @Controller('<nome>') com @Get() findAll
```

Além disso:

- `apps/backend/src/app.module.ts` recebe o `import { <Nome>Module }` e a entrada
  correspondente no array `imports: [ ... ]` do decorator `@Module`.
- O backend é recompilado com `npm run build` para validar que tudo compila.
- Após o `npm run dev`, o endpoint `GET http://localhost:4000/<nome-do-modulo>`
  responde com `{ "message": "<Nome> endpoint" }` (nome em PascalCase).

Nesse modo `--namespace` é **ignorado** — o módulo Nest não é um pacote npm,
só uma pasta de código dentro do backend.

## Pré-requisitos

- Node.js 18+
- npm
- Monorepo já criado por [`config-project-fullstack`](../config-project-fullstack/SKILL.md) (ou equivalente)
- Rodar a partir da **raiz do monorepo** (onde está o `package.json` raiz)

## Executando

A partir da raiz do monorepo:

```bash
# Modo workspace (padrão)
node .agents/skills/config-new-module/setup.js <nome-do-modulo> --namespace @scope

# Modo backend Nest
node .agents/skills/config-new-module/setup.js <nome-do-modulo> --backend

# Exemplos
node .agents/skills/config-new-module/setup.js pagamento --namespace @meu-projeto
node .agents/skills/config-new-module/setup.js relatorio --namespace @meu-projeto --force
node .agents/skills/config-new-module/setup.js hello --backend
node .agents/skills/config-new-module/setup.js hello --backend --force
```

Argumentos:

| Argumento             | Obrigatoriedade                     | Descrição                                                                     |
|-----------------------|-------------------------------------|-------------------------------------------------------------------------------|
| `<nome-do-modulo>`    | sempre                              | Nome da pasta. Kebab-case (letras minúsculas, números, hífen).                |
| `--namespace <@org>`  | **sim** no modo workspace (padrão)  | Namespace npm do pacote (ex.: `@meu-projeto`). Ignorado se `--backend`.       |
| `--backend` (`-b`)    | não                                 | Ativa o modo backend Nest (destino em `apps/backend/src/modules/`).           |
| `--force` (`-f`)      | não                                 | Remove o diretório de destino se ele já existir e estiver não-vazio.          |
| `--help` (`-h`)       | não                                 | Mostra o uso.                                                                  |

## Como o setup.js é determinístico

1. **Verificações antes de tocar em qualquer coisa** — node ≥ 18, npm presente, nome válido, `package.json` raiz existe; no modo workspace também exige namespace `@xxx` e todos os assets. No modo `--backend` exige `apps/backend/src/app.module.ts`.
2. **Falha rápido** — qualquer erro de subprocesso aborta o script (`stdio: inherit`, sem swallowing); o estado inconsistente fica visível para correção manual.
3. **Ordem fixa de passos**
   - Workspace: garantir `modules/` → criar `modules/<nome>` → copiar assets → adicionar deps nos apps → ajustar root → install → build → test.
   - Backend: validar destino → escrever `<nome>.module.ts` e `<nome>.controller.ts` → registrar em `app.module.ts` → recompilar backend.
4. **Arquivos escritos por conteúdo literal** — no workspace, cinco arquivos vêm de `assets/` com placeholders `__NAMESPACE__` e `__MODULE_NAME__` substituídos; no backend, module.ts e controller.ts são strings literais com interpolação do nome kebab e PascalCase. Nada é gerado dinamicamente.
5. **Ajustes idempotentes** — dependência já existente, `ts-node` já na versão certa, `modules/*` já nos workspaces ou `import { <Nome>Module }` já em `app.module.ts` não geram diff nem re-escrita desnecessária.

## Gotchas

- **`--namespace` é obrigatório** — se você esquecer, o script sai com código 1 antes de criar qualquer arquivo. Isso é intencional: sem namespace o `name` do pacote seria inválido.
- **Nome do módulo deve ser kebab-case** — `pagamento`, `credit-card` OK; `Pagamento`, `credit_card`, `credit card` são rejeitados.
- **Pasta já existente** — se `modules/<nome>` já tem arquivos e você **não** passa `--force`, o script aborta. Isso evita sobrescrever trabalho.
- **`ts-node` no root, não no módulo** — o script grava `ts-node@^10.9.2` em `devDependencies` do `package.json` raiz porque o Jest precisa dele para carregar `jest.config.ts`. O módulo também traz `ts-node` no seu próprio `devDependencies` (para builds isolados), mas o do root é o que garante o funcionamento do Jest.
- **Separação `src/` e `test/`** — o `tsconfig.json` compila só `src/`, então testes ficam fora do build de produção sem precisar de `exclude` manual. Testes importam código com caminho relativo (`../src/index`), não pelo nome do pacote.
- **`npm run build` roda o Turborepo inteiro** — se frontend ou backend já estavam quebrados antes desta skill, o build falha e o script aborta. Corrija o build antes de rodar.
- **Rodar sempre da raiz do monorepo** — o script usa `process.cwd()` como raiz do projeto. Se você rodar de dentro de outra pasta, ele não encontrará o `package.json` raiz.
- **`--backend` NÃO cria pacote workspace** — os dois modos são mutuamente exclusivos por invocação. Se quiser as duas coisas para o mesmo nome, rode a skill duas vezes: uma sem `--backend` (workspace) e outra com `--backend` (Nest module).
- **Registro em `app.module.ts` é por regex** — o script procura o último `import` do arquivo pra inserir o novo, e o bloco `imports: [...]` do decorator `@Module` pra adicionar a classe. Se você alterar muito a formatação padrão do `app.module.ts`, a regex pode não casar mais.
- **Endpoint padrão do modo backend** — `GET /<nome>` retorna `{ message: 'Módulo <nome> ativo.' }`. Edite `apps/backend/src/modules/<nome>/<nome>.controller.ts` para trocar por rotas reais.

## Troubleshooting

| Sintoma                                                        | Causa / Correção                                                                       |
|----------------------------------------------------------------|----------------------------------------------------------------------------------------|
| `Erro: --namespace é obrigatório`                              | Passe `--namespace @sua-org` na linha de comando.                                       |
| `Erro: namespace inválido`                                     | Use o formato `@org-name` (começa com `@`, kebab-case).                                 |
| `Erro: nome de módulo inválido`                                | Use kebab-case: `pagamento`, `credit-card`, `nota-fiscal`.                              |
| `Erro: modules/<nome> já existe e não está vazio`              | Escolha outro nome ou use `--force`.                                                    |
| `Erro: package.json não encontrado em <cwd>`                   | Rode a partir da raiz do monorepo (onde está o `package.json` raiz).                    |
| `npm test -w @org/mod` diz "no workspaces found"               | Confirme que o `name` do módulo em `modules/<nome>/package.json` bate com o namespace.  |
| Jest não carrega `jest.config.ts`                              | Confirme que `ts-node` está em `devDependencies` do root (o script faz isso).           |
| `Erro: apps/backend/ não encontrado`                           | O modo `--backend` requer um backend Nest já criado (`apps/backend/`).                  |
| `Erro: bloco "imports: [...]" não encontrado`                  | O `app.module.ts` foi reformatado a ponto da regex não casar mais. Restaure o layout do decorator `@Module({ imports: [ ... ] })`. |
