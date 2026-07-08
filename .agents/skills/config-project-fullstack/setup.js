#!/usr/bin/env node
/**
 * config-project-fullstack — scaffolder determinístico
 *
 * Cria um monorepo Turborepo com:
 *   - apps/frontend  Next.js  (porta 3000)
 *   - apps/backend   NestJS   (porta 4000, @nestjs/config, CORS)
 *
 * Uso:
 *   node setup.js [project-name] [--namespace @scope] [--force]
 *
 * Exemplos:
 *   node setup.js
 *   node setup.js minha-app
 *   node setup.js minha-app --namespace @minha-org
 */

'use strict';

const { execSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Parsing de argumentos
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
let projectName = 'projeto-exemplo';
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
      'Uso: node setup.js [project-name] [--namespace @scope] [--force]'
    );
    process.exit(0);
  } else if (!a.startsWith('-')) {
    projectName = a;
  } else {
    console.error(`Argumento desconhecido: ${a}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Validação dos argumentos
// ---------------------------------------------------------------------------
if (!/^[a-z0-9][a-z0-9._-]*$/i.test(projectName)) {
  console.error(
    `Erro: nome de projeto inválido "${projectName}". ` +
      `Use apenas letras, números, ponto, hífen ou underscore.`
  );
  process.exit(1);
}

if (namespace !== null) {
  if (!/^@[a-z0-9][a-z0-9._-]*$/i.test(namespace)) {
    console.error(
      `Erro: namespace inválido "${namespace}". ` +
        `Deve começar com @ (ex.: @minha-org).`
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
  const where = opts.cwd ? `  (em ${path.relative(process.cwd(), opts.cwd) || '.'})` : '';
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

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`    + ${path.relative(process.cwd(), filePath)}`);
}

function updateJson(filePath, mutator) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  mutator(data);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Verificações de segurança (pré-execução)
// ---------------------------------------------------------------------------
header('Verificando pré-requisitos');
const nodeVer = checkBin('node');
const npmVer = checkBin('npm');
const npxVer = checkBin('npx');
console.log(`    node ${nodeVer} | npm ${npmVer} | npx ${npxVer}`);

const nodeMajor = parseInt(nodeVer.replace(/^v/, '').split('.')[0], 10);
if (Number.isNaN(nodeMajor) || nodeMajor < 18) {
  console.error(`Erro: Node.js 18+ é obrigatório (encontrado ${nodeVer}).`);
  process.exit(1);
}

const cwd = process.cwd();
const projectPath = path.join(cwd, projectName);

if (fs.existsSync(projectPath)) {
  if (!force) {
    console.error(
      `Erro: o diretório "${projectPath}" já existe.\n` +
        `       Use --force para sobrescrever ou escolha outro nome.`
    );
    process.exit(1);
  }
  console.log(`    ! removendo diretório existente: ${projectPath}`);
  fs.rmSync(projectPath, { recursive: true, force: true });
}

// Sanity check: não permitir rodar em /, /home, etc.
const forbiddenCwd = ['/', process.env.HOME || '/home'];
if (forbiddenCwd.includes(cwd)) {
  console.error(`Erro: execução proibida em "${cwd}". Use uma pasta dedicada.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Passo 1: criar Turborepo
// ---------------------------------------------------------------------------
header(`Criando Turborepo "${projectName}"`);
run(`npx --yes create-turbo@latest ${projectName} -m npm`, { cwd });

if (!fs.existsSync(path.join(projectPath, 'package.json'))) {
  console.error('Erro: create-turbo não produziu package.json no destino.');
  process.exit(1);
}

const appsDir = path.join(projectPath, 'apps');
if (!fs.existsSync(appsDir)) {
  console.error(`Erro: diretório "apps" não foi criado pelo create-turbo.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Passo 2: limpar apps padrão
// ---------------------------------------------------------------------------
header('Limpando apps padrão');
for (const entry of fs.readdirSync(appsDir)) {
  const full = path.join(appsDir, entry);
  fs.rmSync(full, { recursive: true, force: true });
  console.log(`    - apps/${entry}`);
}

// ---------------------------------------------------------------------------
// Passo 3: criar frontend Next.js
// ---------------------------------------------------------------------------
header('Criando frontend (Next.js)');
run('npx --yes create-next-app@latest frontend --yes --src-dir', { cwd: appsDir });

const frontendDir = path.join(appsDir, 'frontend');
if (!fs.existsSync(path.join(frontendDir, 'package.json'))) {
  console.error('Erro: create-next-app não gerou package.json do frontend.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Passo 4: criar backend NestJS
// Observação: usamos npx para evitar instalação global de @nestjs/cli.
// Flags: -g (skip git), -p npm (gerenciador de pacotes)
// ---------------------------------------------------------------------------
header('Criando backend (NestJS)');
run('npx --yes @nestjs/cli new backend -g -p npm', { cwd: appsDir });

const backendDir = path.join(appsDir, 'backend');
if (!fs.existsSync(path.join(backendDir, 'package.json'))) {
  console.error('Erro: @nestjs/cli não gerou package.json do backend.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Passo 5: instalar @nestjs/config no backend
// ---------------------------------------------------------------------------
header('Instalando @nestjs/config no backend');
run('npm install @nestjs/config', { cwd: backendDir });

// ---------------------------------------------------------------------------
// Passo 6: sobrescrever apps/backend/src/app.module.ts
// ---------------------------------------------------------------------------
header('Configurando ConfigModule global');
writeFile(
  path.join(backendDir, 'src', 'app.module.ts'),
  `import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`
);

// ---------------------------------------------------------------------------
// Passo 7: sobrescrever apps/backend/src/main.ts (porta 4000 + CORS)
// ---------------------------------------------------------------------------
header('Configurando porta 4000 e CORS');
writeFile(
  path.join(backendDir, 'src', 'main.ts'),
  `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
`
);

// ---------------------------------------------------------------------------
// Passo 8: adicionar script "dev" no package.json do backend
// ---------------------------------------------------------------------------
header('Adicionando script "dev" no backend');
updateJson(path.join(backendDir, 'package.json'), (pkg) => {
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.dev = 'nest start --watch';
});

// ---------------------------------------------------------------------------
// Passo 9: criar arquivos .env e .env.example
// ---------------------------------------------------------------------------
header('Criando arquivos .env');
const frontendEnv = 'NEXT_PUBLIC_API_URL=http://localhost:4000\n';
writeFile(path.join(frontendDir, '.env.example'), frontendEnv);
writeFile(path.join(frontendDir, '.env'), frontendEnv);

const backendEnv = 'PORT=4000\n';
writeFile(path.join(backendDir, '.env.example'), backendEnv);
writeFile(path.join(backendDir, '.env'), backendEnv);

// ---------------------------------------------------------------------------
// Passo 10 (opcional): renomear namespace de todos os pacotes
// ---------------------------------------------------------------------------
if (namespace) {
  header(`Reescrevendo namespaces para "${namespace}"`);
  renameNamespaces(projectPath, namespace);
}

// ---------------------------------------------------------------------------
// Resumo final
// ---------------------------------------------------------------------------
console.log(`\n✓ Projeto criado em: ${projectPath}`);
console.log(`\nPróximos passos:`);
console.log(`  cd ${projectName}`);
console.log(`  npm run dev`);
console.log(`  # frontend → http://localhost:3000`);
console.log(`  # backend  → http://localhost:4000`);

// ---------------------------------------------------------------------------
// Helpers de namespace
// ---------------------------------------------------------------------------
function renameNamespaces(root, ns) {
  const pkgFiles = findPackageJsons(root);
  const renames = new Map();

  // Primeira passada: renomear os nomes dos pacotes
  for (const file of pkgFiles) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!pkg.name) continue;
    const baseName = pkg.name.includes('/')
      ? pkg.name.split('/').slice(1).join('/')
      : pkg.name;
    const newName = `${ns}/${baseName}`;
    if (newName === pkg.name) continue;
    renames.set(pkg.name, newName);
    pkg.name = newName;
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`    ~ ${[...renames.keys()].pop()} → ${newName}`);
  }

  // Segunda passada: atualizar referências em dependências
  const depFields = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];
  for (const file of pkgFiles) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    let dirty = false;
    for (const field of depFields) {
      if (!pkg[field]) continue;
      const updated = {};
      for (const [name, version] of Object.entries(pkg[field])) {
        if (renames.has(name)) {
          updated[renames.get(name)] = version;
          dirty = true;
        } else {
          updated[name] = version;
        }
      }
      pkg[field] = updated;
    }
    if (dirty) {
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
    }
  }
}

function findPackageJsons(root) {
  const skip = new Set([
    'node_modules',
    '.git',
    '.next',
    '.turbo',
    'dist',
    'build',
    '.cache',
  ]);
  const results = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name === 'package.json') results.push(full);
    }
  })(root);
  return results;
}
