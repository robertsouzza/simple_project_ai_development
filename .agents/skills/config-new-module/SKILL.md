---
name: config-new-module
description: Cria deterministicamente um novo módulo de negócio. Três modos — (1) workspace (padrão) monta modules/<nome> com package.json, tsconfig, jest, src+test, registra dep nos apps, roda install/build/test (namespace obrigatório); (2) --backend cria um módulo NestJS em apps/backend/src/modules/<nome> com <nome>.module.ts + <nome>.controller.ts (endpoint GET), registra no AppModule e recompila o backend; (3) --frontend cria a rota privada em apps/frontend/src/app/(private)/<nome>/page.tsx e o módulo em apps/frontend/src/app/modules/<nome>/{pages,components}/ e recompila o frontend.
---

# config-new-module

Cria um novo módulo de negócio em um único comando. Toda a lógica vive em
[`setup.js`](./setup.js) — este arquivo é só o manual. Templates para o modo
workspace estão em [`assets/`](./assets/); templates dos modos Nest e Next são
inline no `setup.js`.

A skill tem **três modos** que compartilham parsing/validação mas rodam fluxos
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

## Modo 3 — Frontend Next (`--frontend`)

Estado final garantido:

```
apps/frontend/src/app/
├── (private)/<nome-do-modulo>/
│   └── page.tsx                             # rota privada — renderiza <Nome>Page
└── modules/<nome-do-modulo>/
    ├── pages/
    │   └── <nome-do-modulo>.page.tsx        # página principal — renderiza <Nome>Component
    └── components/
        └── <nome-do-modulo>.component.tsx   # componente principal (stub)
```

Além disso:

- O frontend é recompilado com `npm run build` para validar que tudo compila.
- Após o `npm run dev`, a rota `http://localhost:3000/<nome-do-modulo>` (dentro
  do grupo `(private)`) renderiza o componente stub.

Nesse modo `--namespace` é **ignorado** — o módulo Next é apenas código dentro
do frontend, não um pacote npm.

`--backend` e `--frontend` são **mutuamente exclusivos** por invocação. Para
um mesmo módulo aparecer nos dois lados, rode a skill uma vez para cada.

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

# Modo frontend Next
node .agents/skills/config-new-module/setup.js <nome-do-modulo> --frontend

# Exemplos
node .agents/skills/config-new-module/setup.js pagamento --namespace @meu-projeto
node .agents/skills/config-new-module/setup.js relatorio --namespace @meu-projeto --force
node .agents/skills/config-new-module/setup.js hello --backend
node .agents/skills/config-new-module/setup.js hello --backend --force
node .agents/skills/config-new-module/setup.js hello --frontend
node .agents/skills/config-new-module/setup.js hello --frontend --force
```

Argumentos:

| Argumento             | Obrigatoriedade                     | Descrição                                                                                  |
|-----------------------|-------------------------------------|--------------------------------------------------------------------------------------------|
| `<nome-do-modulo>`    | sempre                              | Nome da pasta. Kebab-case (letras minúsculas, números, hífen).                             |
| `--namespace <@org>`  | **sim** no modo workspace (padrão)  | Namespace npm do pacote (ex.: `@meu-projeto`). Ignorado se `--backend` ou `--frontend`.    |
| `--backend` (`-b`)    | não                                 | Ativa o modo backend Nest (destino em `apps/backend/src/modules/`).                        |
| `--frontend` (`-F`)   | não                                 | Ativa o modo frontend Next (rota privada + `apps/frontend/src/app/modules/`).              |
| `--force` (`-f`)      | não                                 | Remove o diretório de destino se ele já existir e estiver não-vazio.                       |
| `--help` (`-h`)       | não                                 | Mostra o uso.                                                                              |

`--backend` e `--frontend` não podem ser usados juntos.

## Como o setup.js é determinístico

1. **Verificações antes de tocar em qualquer coisa** — node ≥ 18, npm presente, nome válido, `package.json` raiz existe; no modo workspace também exige namespace `@xxx` e todos os assets. No modo `--backend` exige `apps/backend/src/app.module.ts`. No modo `--frontend` exige `apps/frontend/src/app/`.
2. **Falha rápido** — qualquer erro de subprocesso aborta o script (`stdio: inherit`, sem swallowing); o estado inconsistente fica visível para correção manual.
3. **Ordem fixa de passos**
   - Workspace: garantir `modules/` → criar `modules/<nome>` → copiar assets → adicionar deps nos apps → ajustar root → install → build → test.
   - Backend: validar destino → escrever `<nome>.module.ts` e `<nome>.controller.ts` → registrar em `app.module.ts` → recompilar backend.
   - Frontend: validar destino → criar `(private)/<nome>/page.tsx` + `modules/<nome>/pages/<nome>.page.tsx` + `modules/<nome>/components/<nome>.component.tsx` → recompilar frontend.
4. **Arquivos escritos por conteúdo literal** — no workspace, cinco arquivos vêm de `assets/` com placeholders `__NAMESPACE__` e `__MODULE_NAME__` substituídos; no backend, `module.ts` e `controller.ts` são strings literais com interpolação do nome kebab e PascalCase; no frontend, os três `.tsx` também são strings literais com o mesmo esquema de interpolação. Nada é gerado dinamicamente.
5. **Ajustes idempotentes** — dependência já existente, `ts-node` já na versão certa, `modules/*` já nos workspaces ou `import { <Nome>Module }` já em `app.module.ts` não geram diff nem re-escrita desnecessária.

## Gotchas

- **`--namespace` é obrigatório** — se você esquecer, o script sai com código 1 antes de criar qualquer arquivo. Isso é intencional: sem namespace o `name` do pacote seria inválido.
- **Nome do módulo deve ser kebab-case** — `pagamento`, `credit-card` OK; `Pagamento`, `credit_card`, `credit card` são rejeitados.
- **Pasta já existente** — se `modules/<nome>` já tem arquivos e você **não** passa `--force`, o script aborta. Isso evita sobrescrever trabalho.
- **`ts-node` no root, não no módulo** — o script grava `ts-node@^10.9.2` em `devDependencies` do `package.json` raiz porque o Jest precisa dele para carregar `jest.config.ts`. O módulo também traz `ts-node` no seu próprio `devDependencies` (para builds isolados), mas o do root é o que garante o funcionamento do Jest.
- **Separação `src/` e `test/`** — o `tsconfig.json` compila só `src/`, então testes ficam fora do build de produção sem precisar de `exclude` manual. Testes importam código com caminho relativo (`../src/index`), não pelo nome do pacote.
- **`npm run build` roda o Turborepo inteiro** — se frontend ou backend já estavam quebrados antes desta skill, o build falha e o script aborta. Corrija o build antes de rodar.
- **Rodar sempre da raiz do monorepo** — o script usa `process.cwd()` como raiz do projeto. Se você rodar de dentro de outra pasta, ele não encontrará o `package.json` raiz.
- **`--backend` / `--frontend` NÃO criam pacote workspace** — os três modos são independentes por invocação, e `--backend` + `--frontend` juntos são rejeitados. Se quiser as três coisas para o mesmo nome, rode a skill três vezes: uma sem flag (workspace), uma com `--backend` (Nest) e uma com `--frontend` (Next).
- **Registro em `app.module.ts` é por regex** — o script procura o último `import` do arquivo pra inserir o novo, e o bloco `imports: [...]` do decorator `@Module` pra adicionar a classe. Se você alterar muito a formatação padrão do `app.module.ts`, a regex pode não casar mais.
- **Endpoint padrão do modo backend** — `GET /<nome>` retorna `{ message: '<Nome> endpoint' }` (nome em PascalCase). Edite `apps/backend/src/modules/<nome>/<nome>.controller.ts` para trocar por rotas reais.
- **Página padrão do modo frontend** — o componente stub renderiza `<div><Nome> Component</div>`. Edite `apps/frontend/src/app/modules/<nome>/components/<nome>.component.tsx` para trocar pelo conteúdo real. A rota fica sob o grupo `(private)`, então respeita o layout dessa área.
- **Alias `@/` do frontend** — o `page.tsx` gerado importa via `@/app/modules/<nome>/pages/<nome>.page`. Se o `tsconfig.json` do frontend não tiver esse alias ou o `baseUrl` correto, o import quebra. O template segue o padrão do módulo `reports` que já existe no projeto.

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
| `Erro: apps/frontend/ não encontrado`                          | O modo `--frontend` requer um frontend Next já criado (`apps/frontend/`).               |
| `Erro: apps/frontend/src/app não encontrado`                   | O modo `--frontend` espera o App Router do Next em `src/app/`. Crie ou restaure essa pasta. |
| `Erro: --backend e --frontend são mutuamente exclusivos`       | Escolha um modo por invocação. Se quiser os dois, rode a skill duas vezes.              |
| Import quebrado no `page.tsx` gerado no frontend               | Confirme o alias `@/*` apontando para `src/*` no `tsconfig.json` do frontend.           |
