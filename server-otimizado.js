/**
 * 🚀 SERVIDOR OTIMIZADO - TABELA DE PONTOS
 * 
 * Versão reestruturada e otimizada do servidor principal
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

// Configurações
const config = require('./src/config/app');
const security = require('./src/middleware/security');

// Importar models
const { Pontos, Historico, Crianca, Atividade, Log, Lembrete } = require('./models/Pontos');

// Importar utilitários
const ResponseHelper = require('./utils/response-helper');
const Validators = require('./validators');

// Criar aplicação Express
const app = express();
const server = http.createServer(app);

// Configurar WebSocket
const io = new Server(server, {
    cors: config.websocket.cors,
    pingTimeout: config.websocket.pingTimeout,
    pingInterval: config.websocket.pingInterval
});

/**
 * 🔌 CONEXÃO COM MONGODB
 */
const connectDB = async () => {
    try {
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('🗄️ MongoDB Atlas conectado com sucesso!');
        console.log('🌐 Cluster:', config.database.uri.split('@')[1].split('/')[0]);
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error.message);
        console.log('💡 Dica: Configure IP 0.0.0.0/0 no MongoDB Atlas');
        throw error; // Falhar se não conseguir conectar ao MongoDB
    }
};

/**
 * 🔧 CONFIGURAÇÃO DE MIDDLEWARE
 */
const setupMiddleware = () => {
    // Middleware de segurança
    app.use(security.helmetConfig);
    app.use(security.corsConfig);
    app.use(security.securityHeaders);
    app.use(security.requestLogger);
    app.use(security.validateJSON);
    
    // Body parser
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
    
    // Servir arquivos estáticos
    app.use(express.static(path.join(__dirname, 'public')));
    
    // Rate limiting para API
    app.use('/api', security.apiRateLimiter);
    app.use('/api/auth/login', security.loginRateLimiter);
};

/**
 * 🌐 CONFIGURAÇÃO DE ROTAS
 */
const setupRoutes = () => {
    // Rota principal
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
    
    // Rota de login
    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    });
    
    // API Routes
    app.use('/api/pontos', require('./src/routes/pontos'));
    app.use('/api/criancas', require('./src/routes/criancas'));
    app.use('/api/historico', require('./src/routes/historico'));
    app.use('/api/auth', require('./src/routes/auth'));
    app.use('/api/login', require('./src/routes/login'));
    
    // Rota de health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    });
    
    // Rota 404
    app.use('*', (req, res) => {
        res.status(404).json({
            success: false,
            error: 'Rota não encontrada'
        });
    });
};

/**
 * 📡 CONFIGURAÇÃO DE WEBSOCKET
 */
const setupWebSocket = () => {
    io.on('connection', (socket) => {
        console.log('📱 Cliente conectado:', socket.id);
        
        // Solicitar dados atuais
        socket.on('solicitar-dados', async () => {
            try {
                const pontos = await obterPontosAtuais();
                socket.emit('dados-atuais', pontos);
            } catch (error) {
                console.error('❌ Erro ao enviar dados atuais:', error);
                socket.emit('erro', { 
                    message: 'Erro ao carregar dados do MongoDB',
                    error: error.message 
                });
            }
        });
        
        // Sincronizar pontos
        socket.on('pontos-alterados', (dados) => {
            console.log('🔄 Sincronizando alteração:', dados);
            socket.broadcast.emit('atualizar-pontos', dados);
        });
        
        // Sincronizar histórico
        socket.on('historico-alterado', (dados) => {
            console.log('📋 Sincronizando histórico:', dados);
            socket.broadcast.emit('atualizar-historico', dados);
        });
        
        // Notificações
        socket.on('notificacao', (dados) => {
            console.log('🔔 Notificação:', dados);
            socket.broadcast.emit('nova-notificacao', dados);
        });
        
        // Desconexão
        socket.on('disconnect', () => {
            console.log('👋 Cliente desconectado:', socket.id);
        });
    });
};

/**
 * 📊 FUNÇÕES AUXILIARES
 */
async function obterPontosAtuais() {
    try {
        // Sempre usar MongoDB - sem fallback local
        const pontosDB = await Pontos.find({});
        const pontosObj = {};
        pontosDB.forEach(p => {
            pontosObj[p.nome.toLowerCase()] = p.pontos;
        });
        return pontosObj;
    } catch (error) {
        console.error('❌ Erro ao obter pontos:', error);
        throw error; // Propagar erro em vez de retornar objeto vazio
    }
}

/**
 * 🚀 INICIALIZAÇÃO DO SERVIDOR
 */
const startServer = async () => {
    try {
        console.log('🚀 Iniciando servidor otimizado...');
        
        // Conectar ao banco
        await connectDB();
        
        // Configurar middleware
        setupMiddleware();
        
        // Configurar rotas
        setupRoutes();
        
        // Configurar WebSocket
        setupWebSocket();
        
        // Middleware de erro (deve ser o último)
        app.use(security.errorHandler);
        
        // Iniciar servidor
        server.listen(config.server.port, () => {
            console.log(`✅ Servidor rodando na porta ${config.server.port}`);
            console.log(`🌐 Ambiente: ${config.server.env}`);
            console.log(`🔗 URL: http://localhost:${config.server.port}`);
            console.log(`📊 Health Check: http://localhost:${config.server.port}/health`);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
    process.exit(1);
});

// Iniciar servidor
startServer();

module.exports = { app, server, io }; 