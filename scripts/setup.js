#!/usr/bin/env node

/**
 * 🚀 Script de Setup - Tabela de Pontos
 * Configuração automática do ambiente de desenvolvimento
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

console.log('🏆 Tabela de Pontos - Setup Inicial\n');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step} ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Verificar Node.js
logStep('1️⃣', 'Verificando Node.js...');
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    logError(`Node.js ${nodeVersion} detectado. Versão 18+ é necessária.`);
    process.exit(1);
  }
  
  logSuccess(`Node.js ${nodeVersion} detectado`);
} catch (error) {
  logError('Erro ao verificar versão do Node.js');
  process.exit(1);
}

// Verificar npm
logStep('2️⃣', 'Verificando npm...');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  logSuccess(`npm ${npmVersion} detectado`);
} catch (error) {
  logError('npm não encontrado. Instale o Node.js com npm.');
  process.exit(1);
}

// Instalar dependências
logStep('3️⃣', 'Instalando dependências...');
try {
  execSync('npm install', { stdio: 'inherit' });
  logSuccess('Dependências instaladas com sucesso');
} catch (error) {
  logError('Erro ao instalar dependências');
  process.exit(1);
}

// Criar arquivo .env
logStep('4️⃣', 'Configurando variáveis de ambiente...');
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (!fs.existsSync(envPath)) {
  try {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      logSuccess('Arquivo .env criado a partir do exemplo');
    } else {
      // Criar .env básico
      const envContent = `# 🚀 Tabela de Pontos - Variáveis de Ambiente
# Configure estas variáveis conforme necessário

# Configurações do Servidor
PORT=3000
NODE_ENV=development

# MongoDB Atlas (configure sua string de conexão)
MONGODB_URI=mongodb+srv://seu_usuario:sua_senha@cluster.mongodb.net/tabela-pontos

# JWT (gere uma chave secreta forte)
JWT_SECRET=${crypto.randomBytes(64).toString('hex')}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Segurança
SESSION_SECRET=${crypto.randomBytes(32).toString('hex')}
CORS_ORIGIN=http://localhost:3000

# Logs
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false

# Features
ENABLE_WEBSOCKET=true
ENABLE_ANALYTICS=true
`;
      fs.writeFileSync(envPath, envContent);
      logSuccess('Arquivo .env criado com configurações básicas');
    }
  } catch (error) {
    logError('Erro ao criar arquivo .env');
    logWarning('Crie manualmente o arquivo .env baseado no env.example');
  }
} else {
  logInfo('Arquivo .env já existe');
}

// Criar diretórios necessários
logStep('5️⃣', 'Criando diretórios necessários...');
const dirs = [
  'logs',
  'uploads',
  'temp'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      logSuccess(`Diretório ${dir} criado`);
    } catch (error) {
      logWarning(`Erro ao criar diretório ${dir}`);
    }
  }
});

// Verificar arquivos de dados
logStep('6️⃣', 'Verificando arquivos de dados...');
const dataDir = path.join(__dirname, '..', 'data');
const dataFiles = ['criancas.json', 'pontos.json', 'historico.json'];

dataFiles.forEach(file => {
  const filePath = path.join(dataDir, file);
  const examplePath = path.join(dataDir, `${file}.example`);
  
  if (!fs.existsSync(filePath) && fs.existsSync(examplePath)) {
    try {
      fs.copyFileSync(examplePath, filePath);
      logSuccess(`Arquivo ${file} criado a partir do exemplo`);
    } catch (error) {
      logWarning(`Erro ao criar ${file}`);
    }
  }
});

// Verificar configuração do Git
logStep('7️⃣', 'Verificando configuração do Git...');
try {
  execSync('git --version', { stdio: 'ignore' });
  logSuccess('Git detectado');
  
  // Verificar se é um repositório Git
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    logSuccess('Repositório Git configurado');
  } catch (error) {
    logWarning('Não é um repositório Git. Execute: git init');
  }
} catch (error) {
  logWarning('Git não encontrado. Instale o Git para controle de versão.');
}

// Verificar vulnerabilidades
logStep('8️⃣', 'Verificando vulnerabilidades...');
try {
  execSync('npm audit --audit-level=moderate', { stdio: 'inherit' });
  logSuccess('Auditoria de segurança concluída');
} catch (error) {
  logWarning('Vulnerabilidades encontradas. Execute: npm audit fix');
}

// Testar build
logStep('9️⃣', 'Testando build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  logSuccess('Build testado com sucesso');
} catch (error) {
  logWarning('Erro no build. Verifique as configurações.');
}

// Resumo final
logStep('🎉', 'Setup concluído!');
logSuccess('Projeto configurado com sucesso');
logInfo('\n📋 Próximos passos:');
logInfo('1. Configure as variáveis de ambiente no arquivo .env');
logInfo('2. Configure sua string de conexão MongoDB Atlas');
logInfo('3. Execute: npm run dev');
logInfo('4. Acesse: http://localhost:3000');

logInfo('\n🔗 Links úteis:');
logInfo('- README: https://github.com/JailtonGN/Tabela-de-Pontos#readme');
logInfo('- Contribuindo: https://github.com/JailtonGN/Tabela-de-Pontos/blob/main/CONTRIBUTING.md');
logInfo('- Segurança: https://github.com/JailtonGN/Tabela-de-Pontos/blob/main/SECURITY.md');

logInfo('\n🚀 Para iniciar o servidor:');
logInfo('npm run dev');

console.log('\n' + '='.repeat(50));
log('🏆 Tabela de Pontos - Setup Concluído!', 'bright');
console.log('='.repeat(50)); 