---
name: config-new-module
description: Cria deterministicamente um novo módulo de negócio dentro de modules/, com estrutura pré-definida (jest.config.ts, tsconfig.json, package.json, index.ts, index.test.ts). Registra a dependência nos apps frontend e backend, garante ts-node no root e modules/* nos workspaces, e roda install, build e testes. O namespace npm (@org) é obrigatório.
---

# config-new-module

Cria um novo módulo de negócio dentro de `modules/`, do zero, em um único comando.
Toda a lógica vive em [`setup.js`](./setup.js) — este arquivo é só o manual.
Os templates que serão copiados literalmente para o módulo estão em [`assets/`](./assets/).

## Estado final garantido

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

## Pré-requisitos

- Node.js 18+
- npm
- Monorepo já criado por [`config-project-fullstack`](../config-project-fullstack/SKILL.md) (ou equivalente)
- Rodar a partir da **raiz do monorepo** (onde está o `package.json` raiz)

## Executando

A partir da raiz do monorepo:

```bash
# Formato geral
node .agents/skills/config-new-module/setup.js <nome-do-modulo> --namespace @scope

# Exemplos
node .agents/skills/config-new-module/setup.js pagamento --namespace @meu-projeto
node .agents/skills/config-new-module/setup.js relatorio --namespace @meu-projeto --force
```

Argumentos:

| Argumento             | Obrigatório | Descrição                                                                     |
|-----------------------|-------------|-------------------------------------------------------------------------------|
| `<nome-do-modulo>`    | sim         | Nome da pasta em `modules/`. Kebab-case (letras minúsculas, números, hífen).  |
| `--namespace <@org>`  | **sim**     | Namespace npm do pacote (ex.: `@meu-projeto`). Sem ele o script aborta.       |
| `--force`             | não         | Remove o diretório de destino se ele já existir e estiver não-vazio.          |
| `--help`              | não         | Mostra o uso.                                                                  |

## Como o setup.js é determinístico

1. **Verificações antes de tocar em qualquer coisa** — node ≥ 18, npm presente, nome válido, namespace obrigatório e no formato `@xxx`, `package.json` raiz existe, todos os assets presentes.
2. **Falha rápido** — qualquer erro de subprocesso aborta o script (`stdio: inherit`, sem swallowing); o estado inconsistente fica visível para correção manual.
3. **Ordem fixa de passos** — sempre executa: garantir `modules/` → criar `modules/<nome>` → copiar assets → adicionar deps nos apps → ajustar root → install → build → test.
4. **Arquivos copiados por conteúdo literal** — os cinco arquivos vêm de `assets/` com placeholders `__NAMESPACE__` e `__MODULE_NAME__` substituídos; nada é gerado dinamicamente.
5. **Ajustes idempotentes** — adicionar dependência já existente, `ts-node` já na versão certa ou `modules/*` já nos workspaces não gera diff nem re-escrita desnecessária.

## Gotchas

- **`--namespace` é obrigatório** — se você esquecer, o script sai com código 1 antes de criar qualquer arquivo. Isso é intencional: sem namespace o `name` do pacote seria inválido.
- **Nome do módulo deve ser kebab-case** — `pagamento`, `credit-card` OK; `Pagamento`, `credit_card`, `credit card` são rejeitados.
- **Pasta já existente** — se `modules/<nome>` já tem arquivos e você **não** passa `--force`, o script aborta. Isso evita sobrescrever trabalho.
- **`ts-node` no root, não no módulo** — o script grava `ts-node@^10.9.2` em `devDependencies` do `package.json` raiz porque o Jest precisa dele para carregar `jest.config.ts`. O módulo também traz `ts-node` no seu próprio `devDependencies` (para builds isolados), mas o do root é o que garante o funcionamento do Jest.
- **Separação `src/` e `test/`** — o `tsconfig.json` compila só `src/`, então testes ficam fora do build de produção sem precisar de `exclude` manual. Testes importam código com caminho relativo (`../src/index`), não pelo nome do pacote.
- **`npm run build` roda o Turborepo inteiro** — se frontend ou backend já estavam quebrados antes desta skill, o build falha e o script aborta. Corrija o build antes de rodar.
- **Rodar sempre da raiz do monorepo** — o script usa `process.cwd()` como raiz do projeto. Se você rodar de dentro de outra pasta, ele não encontrará o `package.json` raiz.

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
