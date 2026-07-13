#!/usr/bin/env node
/**
 * config-new-module — scaffolder determinístico de módulo de negócio
 *
 * Cria um novo módulo dentro de modules/<nome> com estrutura pré-definida,
 * registra a dependência nos apps frontend e backend, garante as entradas
 * necessárias no package.json raiz e roda install, build e testes.
 *
 * Uso:
 *   node setup.js <nome-do-modulo> --namespace @scope [--force]
 *
 * Exemplo:
 *   node setup.js pagamento --namespace @meu-projeto
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

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--namespace' || a === '-n') {
    namespace = argv[++i];
  } else if (a === '--force' || a === '-f') {
    force = true;
  } else if (a === '--help' || a === '-h') {
    console.log(
      'Uso: node setup.js <nome-do-modulo> --namespace @scope [--force]'
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
