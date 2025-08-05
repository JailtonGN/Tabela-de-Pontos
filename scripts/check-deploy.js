#!/usr/bin/env node

/**
 * Script de verificação para deploy no Render
 * Verifica se todas as configurações estão corretas
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO CONFIGURAÇÃO PARA DEPLOY');
console.log('======================================\n');

let allGood = true;

// 1. Verificar package.json
console.log('1. 📦 Verificando package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageJson.scripts.start) {
    console.log('❌ ERRO: Script "start" não encontrado em package.json');
    allGood = false;
  } else {
    console.log('✅ Script start configurado:', packageJson.scripts.start);
  }
  
  if (!packageJson.main) {
    console.log('❌ ERRO: Campo "main" não encontrado em package.json');
    allGood = false;
  } else {
    console.log('✅ Arquivo principal:', packageJson.main);
  }
  
  if (!packageJson.engines || !packageJson.engines.node) {
    console.log('⚠️  AVISO: Versão do Node.js não especificada em engines');
  } else {
    console.log('✅ Versão Node.js:', packageJson.engines.node);
  }
  
} catch (error) {
  console.log('❌ ERRO: Não foi possível ler package.json');
  allGood = false;
}

// 2. Verificar arquivo principal
console.log('\n2. 🚀 Verificando arquivo principal...');
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
} catch (error) {
  packageJson = {};
}
const mainFile = packageJson?.main || 'server.js';
if (fs.existsSync(mainFile)) {
  console.log('✅ Arquivo principal existe:', mainFile);
} else {
  console.log('❌ ERRO: Arquivo principal não encontrado:', mainFile);
  allGood = false;
}

// 3. Verificar render.yaml
console.log('\n3. ⚙️  Verificando render.yaml...');
if (fs.existsSync('render.yaml')) {
  console.log('✅ Arquivo render.yaml encontrado');
  const renderConfig = fs.readFileSync('render.yaml', 'utf8');
  if (renderConfig.includes('tabela-pontos-app')) {
    console.log('✅ Nome do serviço configurado corretamente');
  } else {
    console.log('⚠️  AVISO: Nome do serviço pode não estar correto');
  }
} else {
  console.log('❌ ERRO: Arquivo render.yaml não encontrado');
  allGood = false;
}

// 4. Verificar dependências
console.log('\n4. 📚 Verificando dependências...');
if (fs.existsSync('package-lock.json')) {
  console.log('✅ package-lock.json encontrado');
} else {
  console.log('⚠️  AVISO: package-lock.json não encontrado');
}

if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules encontrado');
} else {
  console.log('⚠️  AVISO: node_modules não encontrado (será instalado no deploy)');
}

// 5. Verificar estrutura de pastas
console.log('\n5. 📁 Verificando estrutura de pastas...');
const requiredDirs = ['public', 'src', 'models'];
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✅ Pasta ${dir} encontrada`);
  } else {
    console.log(`⚠️  AVISO: Pasta ${dir} não encontrada`);
  }
});

// 6. Verificar arquivos estáticos
console.log('\n6. 🌐 Verificando arquivos estáticos...');
if (fs.existsSync('public/index.html')) {
  console.log('✅ index.html encontrado');
} else {
  console.log('❌ ERRO: public/index.html não encontrado');
  allGood = false;
}

if (fs.existsSync('public/script.js')) {
  console.log('✅ script.js encontrado');
} else {
  console.log('❌ ERRO: public/script.js não encontrado');
  allGood = false;
}

// Resultado final
console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('🎉 TUDO PRONTO PARA DEPLOY!');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Configure MongoDB Atlas');
  console.log('2. Acesse: https://dashboard.render.com');
  console.log('3. Conecte seu GitHub');
  console.log('4. Configure as variáveis de ambiente');
  console.log('5. Deploy!');
} else {
  console.log('❌ CORRIJA OS ERROS ACIMA ANTES DO DEPLOY');
}
console.log('='.repeat(50));

process.exit(allGood ? 0 : 1); 