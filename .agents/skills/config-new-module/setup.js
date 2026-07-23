#!/usr/bin/env node
/**
 * config-new-module — scaffolder determinístico de módulo de negócio
 *
 * Dois modos:
 *
 * 1) Workspace (padrão) — cria modules/<nome> com estrutura de pacote npm,
 *    registra dependência nos apps, ajusta root, roda install/build/test.
 *
 * 2) Backend Nest (--backend) — cria apps/backend/src/modules/<nome> com
 *    <nome>.module.ts + <nome>.controller.ts (endpoint GET), registra o
 *    módulo em AppModule e recompila o backend. Namespace é ignorado.
 *
 * Uso:
 *   node setup.js <nome-do-modulo> --namespace @scope [--force]
 *   node setup.js <nome-do-modulo> --backend [--force]
 *
 * Exemplos:
 *   node setup.js pagamento --namespace @meu-projeto
 *   node setup.js hello --backend
 */

'use strict';

const { execSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Parsing de argumentos
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
let moduleName = null;
let namespace = null;
let force = false;
let backend = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--namespace' || a === '-n') {
    namespace = argv[++i];
  } else if (a === '--force' || a === '-f') {
    force = true;
  } else if (a === '--backend' || a === '-b') {
    backend = true;
  } else if (a === '--help' || a === '-h') {
    console.log(
      'Uso: node setup.js <nome-do-modulo> --namespace @scope [--force]\n' +
        '   ou: node setup.js <nome-do-modulo> --backend [--force]'
    );
    process.exit(0);
  } else if (!a.startsWith('-')) {
    if (moduleName !== null) {
      console.error(`Erro: argumento posicional extra: "${a}"`);
      process.exit(1);
    }
    moduleName = a;
  } else {
    console.error(`Argumento desconhecido: ${a}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Validação dos argumentos
// ---------------------------------------------------------------------------
if (!moduleName) {
  console.error('Erro: informe o nome do módulo.');
  console.error('Uso: node setup.js <nome-do-modulo> --namespace @scope');
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(moduleName)) {
  console.error(
    `Erro: nome de módulo inválido "${moduleName}". ` +
      `Use kebab-case (letras minúsculas, números e hífen).`
  );
  process.exit(1);
}

// Namespace só é exigido no modo workspace (padrão).
// No modo --backend ele não faz sentido e é ignorado se passado.
if (!backend) {
  if (!namespace) {
    console.error(
      'Erro: --namespace é obrigatório (ex.: --namespace @meu-projeto).'
    );
    process.exit(1);
  }

  if (!/^@[a-z0-9][a-z0-9._-]*$/i.test(namespace)) {
    console.error(
      `Erro: namespace inválido "${namespace}". ` +
        `Deve começar com @ (ex.: @meu-projeto).`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function header(msg) {
  console.log(`\n==> ${msg}`);
}

function run(cmd, opts = {}) {
  const where = opts.cwd
    ? `  (em ${path.relative(process.cwd(), opts.cwd) || '.'})`
    : '';
  console.log(`    $ ${cmd}${where}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function checkBin(bin) {
  const r = spawnSync(bin, ['--version'], { stdio: 'pipe' });
  if (r.status !== 0) {
    console.error(`Erro: dependência "${bin}" não encontrada no PATH.`);
    process.exit(1);
  }
  return r.stdout.toString().trim();
}

function writeFileEnsure(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`    + ${path.relative(process.cwd(), filePath)}`);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Pré-requisitos
// ---------------------------------------------------------------------------
header('Verificando pré-requisitos');
const nodeVer = checkBin('node');
const npmVer = checkBin('npm');
console.log(`    node ${nodeVer} | npm ${npmVer}`);

const nodeMajor = parseInt(nodeVer.replace(/^v/, '').split('.')[0], 10);
if (Number.isNaN(nodeMajor) || nodeMajor < 18) {
  console.error(`Erro: Node.js 18+ é obrigatório (encontrado ${nodeVer}).`);
  process.exit(1);
}

const cwd = process.cwd();
const rootPkgPath = path.join(cwd, 'package.json');
if (!fs.existsSync(rootPkgPath)) {
  console.error(
    `Erro: package.json não encontrado em ${cwd}. ` +
      `Rode a partir da raiz do monorepo.`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Dispatch: modo --backend cai fora aqui; o resto do arquivo é o fluxo
// workspace original (não alterado).
// ---------------------------------------------------------------------------
if (backend) {
  runBackendMode();
  process.exit(0);
}

const assetsDir = path.join(__dirname, 'assets');
const requiredAssets = [
  'jest.config.ts',
  'tsconfig.json',
  'package.json',
  'src/index.ts',
  'test/index.test.ts',
];
for (const f of requiredAssets) {
  if (!fs.existsSync(path.join(assetsDir, f))) {
    console.error(`Erro: asset "${f}" não encontrado em ${assetsDir}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Passo 1: garantir pasta modules/
// ---------------------------------------------------------------------------
const modulesDir = path.join(cwd, 'modules');
if (!fs.existsSync(modulesDir)) {
  header('Criando pasta modules/');
  fs.mkdirSync(modulesDir, { recursive: true });
  console.log('    + modules/');
} else {
  console.log('\n==> Pasta modules/ já existe — reaproveitando');
}

// ---------------------------------------------------------------------------
// Passo 2: criar pasta do módulo
// ---------------------------------------------------------------------------
const moduleDir = path.join(modulesDir, moduleName);
if (fs.existsSync(moduleDir)) {
  const entries = fs.readdirSync(moduleDir);
  if (entries.length > 0 && !force) {
    console.error(
      `Erro: modules/${moduleName} já existe e não está vazio. ` +
        `Use --force para sobrescrever.`
    );
    process.exit(1);
  }
  if (force) {
    console.log(`    ! removendo conteúdo existente: modules/${moduleName}`);
    fs.rmSync(moduleDir, { recursive: true, force: true });
  }
}

header(`Criando módulo modules/${moduleName}`);
fs.mkdirSync(moduleDir, { recursive: true });

// ---------------------------------------------------------------------------
// Passo 3: copiar assets (com substituição de placeholders)
// ---------------------------------------------------------------------------
header('Copiando arquivos-template');
const replacements = {
  __NAMESPACE__: namespace,
  __MODULE_NAME__: moduleName,
};

function renderTemplate(content) {
  return content.replace(
    /__NAMESPACE__|__MODULE_NAME__/g,
    (m) => replacements[m]
  );
}

for (const f of requiredAssets) {
  const src = path.join(assetsDir, f);
  const dst = path.join(moduleDir, f);
  const raw = fs.readFileSync(src, 'utf8');
  writeFileEnsure(dst, renderTemplate(raw));
}

// ---------------------------------------------------------------------------
// Passo 4: registrar dependência nos apps
// ---------------------------------------------------------------------------
const depName = `${namespace}/${moduleName}`;
const depSpec = '*';

function addDependency(appPkgPath, name, spec) {
  if (!fs.existsSync(appPkgPath)) {
    console.log(
      `    ! ${path.relative(cwd, appPkgPath)} não existe — pulando`
    );
    return;
  }
  const pkg = readJson(appPkgPath);
  pkg.dependencies = pkg.dependencies || {};
  if (pkg.dependencies[name] === spec) {
    console.log(
      `    = ${path.relative(cwd, appPkgPath)}: já contém ${name}@${spec}`
    );
    return;
  }
  pkg.dependencies[name] = spec;
  writeJson(appPkgPath, pkg);
  console.log(
    `    ~ ${path.relative(cwd, appPkgPath)}: adicionado ${name}@${spec}`
  );
}

header('Registrando dependência nos apps');
addDependency(
  path.join(cwd, 'apps', 'frontend', 'package.json'),
  depName,
  depSpec
);
addDependency(
  path.join(cwd, 'apps', 'backend', 'package.json'),
  depName,
  depSpec
);

// ---------------------------------------------------------------------------
// Passo 5: garantir entradas no package.json raiz
// ---------------------------------------------------------------------------
header('Ajustando package.json raiz');
const rootPkg = readJson(rootPkgPath);
let rootDirty = false;

rootPkg.devDependencies = rootPkg.devDependencies || {};
if (rootPkg.devDependencies['ts-node'] !== '^10.9.2') {
  rootPkg.devDependencies['ts-node'] = '^10.9.2';
  rootDirty = true;
  console.log('    ~ devDependencies: ts-node ^10.9.2');
}

rootPkg.workspaces = rootPkg.workspaces || [];
if (!rootPkg.workspaces.includes('modules/*')) {
  rootPkg.workspaces.push('modules/*');
  rootDirty = true;
  console.log('    ~ workspaces: + modules/*');
}

if (rootDirty) {
  writeJson(rootPkgPath, rootPkg);
} else {
  console.log('    = nada a alterar');
}

// ---------------------------------------------------------------------------
// Passo 6: npm install
// ---------------------------------------------------------------------------
header('Executando npm install');
run('npm install', { cwd });

// ---------------------------------------------------------------------------
// Passo 7: npm run build
// ---------------------------------------------------------------------------
header('Executando npm run build');
run('npm run build', { cwd });

// ---------------------------------------------------------------------------
// Passo 8: rodar testes do módulo
// ---------------------------------------------------------------------------
header(`Rodando testes de ${depName}`);
run(`npm test -w ${depName}`, { cwd });

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------
console.log(`\n✓ Módulo "${depName}" criado em modules/${moduleName}/`);
console.log(`  Registrado como dependência em apps/frontend e apps/backend.`);

// ===========================================================================
// Modo --backend: cria módulo Nest em apps/backend/src/modules/<nome>/
// ===========================================================================
function runBackendMode() {
  const backendDir = path.join(cwd, 'apps', 'backend');
  const backendSrc = path.join(backendDir, 'src');
  const appModulePath = path.join(backendSrc, 'app.module.ts');
  const targetDir = path.join(backendSrc, 'modules', moduleName);

  if (!fs.existsSync(backendDir)) {
    console.error(`Erro: apps/backend/ não encontrado em ${cwd}.`);
    process.exit(1);
  }
  if (!fs.existsSync(appModulePath)) {
    console.error(`Erro: ${path.relative(cwd, appModulePath)} não encontrado.`);
    process.exit(1);
  }

  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0 && !force) {
      console.error(
        `Erro: ${path.relative(cwd, targetDir)} já existe e não está vazio. ` +
          `Use --force para sobrescrever.`
      );
      process.exit(1);
    }
    if (force) {
      console.log(
        `    ! removendo conteúdo existente: ${path.relative(cwd, targetDir)}`
      );
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  }

  const pascal = toPascalCase(moduleName);
  const moduleClass = `${pascal}Module`;
  const controllerClass = `${pascal}Controller`;

  header(`Criando módulo Nest apps/backend/src/modules/${moduleName}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const moduleTs = `import { Module } from '@nestjs/common';
import { ${controllerClass} } from './${moduleName}.controller';

@Module({
  controllers: [${controllerClass}],
})
export class ${moduleClass} {}
`;

  const controllerTs = `import { Controller, Get } from '@nestjs/common';

@Controller('${moduleName}')
export class ${controllerClass} {
  @Get('/')
  get${pascal}() {
    return { message: '${pascal} endpoint' };
  }
}
`;

  writeFileEnsure(path.join(targetDir, `${moduleName}.module.ts`), moduleTs);
  writeFileEnsure(
    path.join(targetDir, `${moduleName}.controller.ts`),
    controllerTs
  );

  header('Registrando módulo em app.module.ts');
  registerInAppModule(appModulePath, moduleClass, moduleName);

  header('Recompilando backend');
  run('npm run build', { cwd: backendDir });

  console.log(`\n✓ Módulo Nest "${moduleClass}" criado.`);
  console.log(
    `  Endpoint disponível ao subir o backend: GET http://localhost:4000/${moduleName}`
  );
}

function toPascalCase(kebab) {
  return kebab
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

function registerInAppModule(appModulePath, moduleClass, moduleName) {
  const importLine =
    `import { ${moduleClass} } from './modules/${moduleName}/${moduleName}.module';`;

  let content = fs.readFileSync(appModulePath, 'utf8');

  if (content.includes(importLine)) {
    console.log(`    = ${moduleClass} já registrado — nada a fazer`);
    return;
  }

  // 1) Insere o import logo após o último import existente.
  const importMatches = [...content.matchAll(/^import .*?;$/gm)];
  if (importMatches.length === 0) {
    console.error('Erro: nenhum import encontrado em app.module.ts.');
    process.exit(1);
  }
  const last = importMatches[importMatches.length - 1];
  const insertAt = last.index + last[0].length;
  content = content.slice(0, insertAt) + '\n' + importLine + content.slice(insertAt);

  // 2) Adiciona o modClass dentro do bloco imports: [...] do @Module.
  const importsBlock = /(imports:\s*\[)([\s\S]*?)(\n\s*\])/;
  const m = content.match(importsBlock);
  if (!m) {
    console.error(
      'Erro: bloco "imports: [...]" não encontrado no decorator @Module.'
    );
    process.exit(1);
  }
  const [full, open, inner, close] = m;
  const trimmed = inner.replace(/\s+$/, '');
  const needsComma = trimmed.length > 0 && !trimmed.endsWith(',');
  const newInner = inner + (needsComma ? ',' : '') + `\n    ${moduleClass},`;
  content = content.replace(full, open + newInner + close);

  fs.writeFileSync(appModulePath, content);
  console.log(
    `    ~ ${path.relative(cwd, appModulePath)}: registrado ${moduleClass}`
  );
}
