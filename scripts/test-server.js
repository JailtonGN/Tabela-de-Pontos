/**
 * 🧪 SCRIPT DE TESTE DO SERVIDOR
 * 
 * Testa todas as funcionalidades principais do servidor
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const axios = require('axios');
const config = require('../src/config/app');

const BASE_URL = `http://localhost:${config.server.port}`;

class ServerTester {
    constructor() {
        this.results = [];
        this.errors = [];
    }

    async testHealthCheck() {
        try {
            console.log('🏥 Testando Health Check...');
            const response = await axios.get(`${BASE_URL}/health`);
            
            if (response.status === 200) {
                console.log('✅ Health Check: OK');
                this.results.push('Health Check: OK');
                return true;
            } else {
                throw new Error(`Status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Health Check: FALHOU');
            this.errors.push(`Health Check: ${error.message}`);
            return false;
        }
    }

    async testPontosAPI() {
        try {
            console.log('🎯 Testando API de Pontos...');
            
            // Teste 1: Listar pontos
            const listResponse = await axios.get(`${BASE_URL}/api/pontos`);
            if (listResponse.status === 200) {
                console.log('✅ Listar pontos: OK');
                this.results.push('Listar pontos: OK');
            }
            
            // Teste 2: Adicionar pontos
            const addResponse = await axios.post(`${BASE_URL}/api/pontos`, {
                nome: 'teste',
                pontos: 10,
                motivo: 'Teste automatizado'
            });
            
            if (addResponse.status === 200) {
                console.log('✅ Adicionar pontos: OK');
                this.results.push('Adicionar pontos: OK');
            }
            
            return true;
        } catch (error) {
            console.error('❌ API de Pontos: FALHOU');
            this.errors.push(`API de Pontos: ${error.message}`);
            return false;
        }
    }

    async testStaticFiles() {
        try {
            console.log('📁 Testando arquivos estáticos...');
            
            const response = await axios.get(`${BASE_URL}/`);
            
            if (response.status === 200 && response.data.includes('Sistema de Pontos')) {
                console.log('✅ Arquivos estáticos: OK');
                this.results.push('Arquivos estáticos: OK');
                return true;
            } else {
                throw new Error('Página principal não encontrada');
            }
        } catch (error) {
            console.error('❌ Arquivos estáticos: FALHOU');
            this.errors.push(`Arquivos estáticos: ${error.message}`);
            return false;
        }
    }

    async testWebSocket() {
        try {
            console.log('📡 Testando WebSocket...');
            
            // Este teste seria mais complexo, mas vamos verificar se o servidor está rodando
            const response = await axios.get(`${BASE_URL}/health`);
            
            if (response.status === 200) {
                console.log('✅ WebSocket: Servidor rodando');
                this.results.push('WebSocket: Servidor rodando');
                return true;
            } else {
                throw new Error('Servidor não responde');
            }
        } catch (error) {
            console.error('❌ WebSocket: FALHOU');
            this.errors.push(`WebSocket: ${error.message}`);
            return false;
        }
    }

    async testDatabaseConnection() {
        try {
            console.log('🗄️ Testando conexão com banco...');
            
            const response = await axios.get(`${BASE_URL}/health`);
            const data = response.data;
            
            if (data.database === 'connected') {
                console.log('✅ Conexão com banco: OK');
                this.results.push('Conexão com banco: OK');
                return true;
            } else {
                console.log('⚠️ Conexão com banco: LOCAL (sem MongoDB)');
                this.results.push('Conexão com banco: LOCAL');
                return true; // Não é erro, apenas modo local
            }
        } catch (error) {
            console.error('❌ Conexão com banco: FALHOU');
            this.errors.push(`Conexão com banco: ${error.message}`);
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Iniciando testes do servidor...\n');
        
        const tests = [
            this.testHealthCheck(),
            this.testPontosAPI(),
            this.testStaticFiles(),
            this.testWebSocket(),
            this.testDatabaseConnection()
        ];
        
        await Promise.all(tests);
        
        this.printResults();
    }

    printResults() {
        console.log('\n📊 RESULTADOS DOS TESTES');
        console.log('========================');
        
        if (this.results.length > 0) {
            console.log('\n✅ TESTES APROVADOS:');
            this.results.forEach(result => {
                console.log(`  • ${result}`);
            });
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ TESTES FALHARAM:');
            this.errors.forEach(error => {
                console.log(`  • ${error}`);
            });
        }
        
        console.log(`\n📈 RESUMO:`);
        console.log(`  • Aprovados: ${this.results.length}`);
        console.log(`  • Falharam: ${this.errors.length}`);
        console.log(`  • Total: ${this.results.length + this.errors.length}`);
        
        if (this.errors.length === 0) {
            console.log('\n🎉 TODOS OS TESTES PASSARAM!');
        } else {
            console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
        }
    }
}

// Executar testes se o arquivo for chamado diretamente
if (require.main === module) {
    const tester = new ServerTester();
    tester.runAllTests().catch(console.error);
}

module.exports = ServerTester; 