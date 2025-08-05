const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// ✨ REFATORAÇÃO DRY: Utilitários centralizados
const ResponseHelper = require('./utils/response-helper');
const Validators = require('./validators');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;

// Importar models
const { Pontos, Historico, Crianca, Atividade, Log, Lembrete } = require('./models/Pontos');

// Conectar ao MongoDB Atlas
const connectDB = async () => {
    try {
        // Usar variável de ambiente se disponível, senão usar URI hardcoded
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://tabela-pontos:TabelaPontos2025!@cluster0.nblesgu.mongodb.net/tabela-pontos?retryWrites=true&w=majority&appName=Cluster0&authSource=admin';
        
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 10000, // Timeout de 10 segundos
            socketTimeoutMS: 45000, // Timeout de socket de 45 segundos
            maxPoolSize: 10, // Máximo 10 conexões simultâneas
            bufferCommands: true, // Permitir comandos antes da conexão
        });
        
        console.log('🗄️ MongoDB Atlas conectado com sucesso!');
        console.log('🌐 Cluster:', mongoURI.split('@')[1].split('/')[0]);
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error.message);
        console.log('💡 Dica: Configure IP 0.0.0.0/0 no MongoDB Atlas para aceitar qualquer IP');
        throw error; // Falhar se não conseguir conectar ao MongoDB
    }
};

connectDB();

// WebSocket para sincronização em tempo real
io.on('connection', (socket) => {
    console.log('📱 Cliente conectado:', socket.id);
    
    // Quando um cliente se conecta, enviar dados atuais
    socket.on('solicitar-dados', async () => {
        try {
            const pontos = await obterPontosAtuais();
            socket.emit('dados-atuais', pontos);
        } catch (error) {
            console.error('❌ Erro ao enviar dados atuais:', error);
        }
    });
    
    // Escutar mudanças de pontos
    socket.on('pontos-alterados', (dados) => {
        console.log('🔄 Sincronizando alteração:', dados);
        // Enviar para todos os outros clientes conectados
        socket.broadcast.emit('atualizar-pontos', dados);
    });
    
    // Escutar mudanças no histórico
    socket.on('historico-alterado', (dados) => {
        console.log('📋 Sincronizando histórico:', dados);
        // Enviar para todos os outros clientes conectados
        socket.broadcast.emit('atualizar-historico', dados);
    });
    
    socket.on('disconnect', () => {
        console.log('👋 Cliente desconectado:', socket.id);
    });
});

// Função auxiliar para obter pontos atuais
async function obterPontosAtuais() {
    try {
        // Verificar se MongoDB está conectado
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB não está conectado');
        }
        
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

// ✨ NOVA FUNÇÃO: Verificar status do MongoDB
function getMongoDBStatus() {
    const status = {
        connected: mongoose.connection.readyState === 1,
        readyState: mongoose.connection.readyState,
        statusText: getReadyStateText(mongoose.connection.readyState)
    };
    
    console.log(`🔍 Status MongoDB: ${status.statusText} (${status.readyState})`);
    return status;
}

function getReadyStateText(readyState) {
    switch (readyState) {
        case 0: return 'disconnected';
        case 1: return 'connected';
        case 2: return 'connecting';
        case 3: return 'disconnecting';
        default: return 'unknown';
    }
}

// Sistema agora usa exclusivamente MongoDB Atlas
// Removidas funções de armazenamento local para evitar conflitos

// Função para salvar logs de sistema (separado do histórico de pontos)
async function salvarLogSistema(dadosLog) {
    try {
        // Apenas log no console para sistema - não salvar no histórico de pontos
        console.log('🔐 Log de Sistema:', {
            tipo: dadosLog.tipo,
            usuario: dadosLog.usuario,
            tipoUsuario: dadosLog.tipoUsuario,
            timestamp: dadosLog.timestamp,
            ip: dadosLog.ip
        });
        
        // Opcionalmente, poderia salvar em um arquivo separado de logs de sistema
        // Mas não vamos misturar com o histórico de pontos das crianças
        
    } catch (error) {
        console.error('❌ Erro ao salvar log de sistema:', error);
    }
}

// Função para salvar no histórico (MongoDB exclusivo) - APENAS para pontos das crianças
async function salvarHistorico(dadosLog) {
    try {
        // Sempre usar MongoDB - sem fallback local
        const ultimoHistorico = await Historico.findOne().sort({ id: -1 });
        const novoId = ultimoHistorico ? ultimoHistorico.id + 1 : 1;

        const novoLog = new Historico({
            id: novoId,
            nome: dadosLog.nome,
            pontos: dadosLog.pontos,
            motivo: dadosLog.motivo,
            tipo: dadosLog.tipo, // 'adicionar' ou 'remover'
            data: new Date(dadosLog.data || dadosLog.timestamp)
        });

        await novoLog.save();
        console.log('📝 Histórico salvo no MongoDB Atlas:', dadosLog.tipo);
    } catch (error) {
        console.error('❌ Erro ao salvar histórico:', error);
        throw error; // Propagar erro para tratamento adequado
    }
}

// Middleware
// ✨ REFATORAÇÃO DRY: Middlewares globais padronizados
app.use(ResponseHelper.requestLogger); // Log de todas as requisições
app.use(Validators.sanitizeInput); // Sanitização automática
app.use(Validators.rateLimit(1000, 15 * 60 * 1000)); // Rate limiting: 1000 req/15min (aumentado para desenvolvimento)
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Configurações de autenticação
const AUTH_CONFIG = {
    pai: {
        senhaFamilia: 'familia123' // Senha simples para os pais
    },
    admin: {
        senhaAdmin: 'admin2025!' // Senha especial para administrador
    }
};

// Middleware de autenticação para rotas protegidas
const verificarAutenticacao = (requiredPermission = null) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token de autenticação necessário' 
            });
        }

        try {
            // Verificar token de sessão (pode ser implementado JWT no futuro)
            const sessionData = JSON.parse(authHeader.replace('Bearer ', ''));
            
            if (requiredPermission && !sessionData.permissions.includes(requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    message: 'Permissão insuficiente'
                });
            }

            req.user = sessionData;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
    };
};

// ✨ NOVA ROTA: Sincronização inteligente para resolver conflitos
app.post('/api/sincronizar-pendentes', async (req, res) => {
    try {
        const { operacoesPendentes } = req.body;
        
        if (!operacoesPendentes || !Array.isArray(operacoesPendentes)) {
            return ResponseHelper.sendError(res, 'Operações pendentes inválidas', 400);
        }
        
        console.log(`🔄 Sincronizando ${operacoesPendentes.length} operações pendentes...`);
        
        const resultados = [];
        
        for (const operacao of operacoesPendentes) {
            try {
                const { nome, pontos, atividade, tipo, timestamp } = operacao;
                
                // Aplicar operação no MongoDB
                const pontosExistentes = await Pontos.findOneAndUpdate(
                    { nome: nome.toLowerCase() },
                    { 
                        $inc: { pontos: tipo === 'adicionar' ? pontos : -pontos },
                        ultimaAtualizacao: new Date()
                    },
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );
                
                // Não permitir pontos negativos
                if (pontosExistentes.pontos < 0) {
                    await Pontos.updateOne(
                        { nome: nome.toLowerCase() },
                        { pontos: 0 }
                    );
                    pontosExistentes.pontos = 0;
                }
                
                // Salvar no histórico
                const ultimoHistorico = await Historico.findOne().sort({ id: -1 });
                const novoId = ultimoHistorico ? ultimoHistorico.id + 1 : 1;
                
                const novoRegistro = new Historico({
                    id: novoId,
                    nome: nome.toLowerCase(),
                    pontos: pontos,
                    motivo: atividade,
                    tipo: tipo,
                    data: new Date(timestamp)
                });
                
                await novoRegistro.save();
                
                resultados.push({
                    success: true,
                    nome: nome,
                    tipo: tipo,
                    pontos: pontos,
                    novoTotal: pontosExistentes.pontos
                });
                
                console.log(`✅ Sincronizado: ${tipo} ${pontos} pontos para ${nome}`);
                
            } catch (error) {
                console.error(`❌ Erro ao sincronizar operação:`, error);
                resultados.push({
                    success: false,
                    nome: operacao.nome,
                    tipo: operacao.tipo,
                    error: error.message
                });
            }
        }
        
        return ResponseHelper.sendSuccess(res, {
            sincronizadas: resultados.filter(r => r.success).length,
            falharam: resultados.filter(r => !r.success).length,
            resultados: resultados
        }, `Sincronização concluída: ${resultados.filter(r => r.success).length}/${operacoesPendentes.length} operações`);
        
    } catch (error) {
        console.error('❌ Erro na sincronização pendente:', error);
        return ResponseHelper.sendInternalError(res, error, 'sincronizar operações pendentes');
    }
});

// ✨ NOVA ROTA: Verificar status do MongoDB
app.get('/api/status', (req, res) => {
    const mongoStatus = getMongoDBStatus();
    
    const status = {
        mongodb: mongoStatus,
        server: {
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: process.version
        },
        online: mongoStatus.connected
    };
    
    res.json(status);
});

// Rota de login
app.post('/api/login', (req, res) => {
    console.log('🔐 Tentativa de login recebida:', req.body);
    
    const { type, nome, senha } = req.body;

    try {
        let isValid = false;
        let permissions = [];

        console.log('🔍 Verificando credenciais para tipo:', type);
        console.log('🔑 Senha recebida:', senha);
        console.log('🔑 Senhas configuradas:', {
            familia: AUTH_CONFIG.pai.senhaFamilia,
            admin: AUTH_CONFIG.admin.senhaAdmin
        });

        switch (type) {
            case 'pai':
                console.log('👨‍👩‍👧‍👦 Verificando login de pai...');
                isValid = senha === AUTH_CONFIG.pai.senhaFamilia;
                permissions = ['view', 'add_points', 'remove_points'];
                console.log('✅ Senha pai válida?', isValid);
                break;
            
            case 'admin':
                console.log('🔧 Verificando login de admin...');
                console.log('🔍 Comparando:', `"${senha}" === "${AUTH_CONFIG.admin.senhaAdmin}"`);
                isValid = senha === AUTH_CONFIG.admin.senhaAdmin;
                permissions = ['view', 'add_points', 'remove_points', 'manage_children', 'manage_activities', 'view_history', 'export_data'];
                console.log('✅ Senha admin válida?', isValid);
                break;
            
            case 'guest':
                console.log('👀 Login de visitante (sempre válido)');
                isValid = true;
                permissions = ['view'];
                break;
            
            default:
                console.log('❌ Tipo de usuário inválido:', type);
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de usuário inválido'
                });
        }

        if (isValid) {
            // Log do login
            const loginData = {
                tipo: 'LOGIN',
                usuario: nome || type,
                tipoUsuario: type,
                permissions: permissions,
                timestamp: new Date().toISOString(),
                ip: req.ip || req.connection.remoteAddress
            };

            // Salvar log de sistema (não no histórico de pontos)
            salvarLogSistema(loginData);

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                user: {
                    nome: nome || (type === 'admin' ? 'Administrador' : 'Visitante'),
                    type: type,
                    permissions: permissions
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: type === 'pai' ? 'Senha da família incorreta' : 'Senha de administrador incorreta'
            });
        }
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para servir a página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota principal - redirecionar para login se não autenticado
app.get('/', (req, res) => {
    // Por padrão, servir o index.html
    // A verificação de autenticação será feita no lado cliente
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rotas da API
app.get('/api/pontos', async (req, res) => {
    try {
        const mongoStatus = getMongoDBStatus();
        
        if (!mongoStatus.connected) {
            return res.status(503).json({ 
                error: 'MongoDB não está conectado',
                status: mongoStatus,
                message: 'Serviço temporariamente indisponível'
            });
        }
        
        const pontosDB = await Pontos.find({});
        const pontosObj = {};
        pontosDB.forEach(p => {
            pontosObj[p.nome.toLowerCase()] = p.pontos;
        });
        
        return res.json(pontosObj);
    } catch (error) {
        console.error('❌ Erro ao carregar pontos:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/historico', async (req, res) => {
    try {
        const mongoStatus = getMongoDBStatus();
        
        if (!mongoStatus.connected) {
            return res.status(503).json({ 
                error: 'MongoDB não está conectado',
                status: mongoStatus,
                message: 'Serviço temporariamente indisponível'
            });
        }
        
        const historicoDB = await Historico.find({}).sort({ data: -1 });
        console.log('📋 Histórico carregado do MongoDB:', historicoDB.length, 'registros');
        res.json(historicoDB);
    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ✨ REFATORADO: Rota POST para salvar histórico com validação
// ✨ REFATORADO: Rota POST para salvar histórico com validação
app.post('/api/historico', 
    Validators.validateHistoricoData,  // ✅ Validação reabilitada
    async (req, res) => {
        const logInfo = `🌐 POST /api/historico - IP: ${req.ip}`;
        console.log(logInfo);
        
        try {
            const { action, crianca, pontos, data } = req.body;
            
            // Criar entrada de histórico
            const historicoEntry = {
                action,
                crianca,
                pontos,
                data: data || new Date().toISOString(),
                timestamp: new Date().toISOString()
            };
            
            // Tentar salvar no MongoDB
            if (mongoose.connection.readyState === 1) {
                const ultimoHistorico = await Historico.findOne().sort({ id: -1 });
                const novoId = ultimoHistorico ? ultimoHistorico.id + 1 : 1;
                
                const novoRegistro = new Historico({
                    id: novoId,
                    nome: crianca,
                    acao: action,
                    pontos: pontos,
                    data: historicoEntry.data
                });
                
                await novoRegistro.save();
                console.log('📋 Histórico salvo no MongoDB:', novoRegistro);
            }
            
            // Salvar também localmente como backup
            // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.
            
            ResponseHelper.sendSuccess(res, 'Histórico salvo com sucesso', historicoEntry);
            
        } catch (error) {
            console.error('❌ Erro ao processar histórico:', error);
            ResponseHelper.sendError(res, 'Erro interno do servidor');
        }
    }
);

// ✨ REFATORADO: Usar middleware de validação e ResponseHelper
app.post('/api/pontos/adicionar', 
    Validators.validatePontosData, // Validação automática
    async (req, res) => {
        try {
            const { nome, pontos, atividade } = req.body;

            let pontosExistentes = null;
            let novoTotal = 0;

            // Tentar MongoDB primeiro
            if (mongoose.connection.readyState === 1) {
                // Atualizar ou criar pontos no MongoDB
                pontosExistentes = await Pontos.findOneAndUpdate(
                    { nome: nome.toLowerCase() },
                    { 
                        $inc: { pontos: pontos },
                        ultimaAtualizacao: new Date()
                    },
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                novoTotal = pontosExistentes.pontos;

                // Adicionar ao histórico no MongoDB
                const ultimoHistorico = await Historico.findOne().sort({ id: -1 });
                const novoId = ultimoHistorico ? ultimoHistorico.id + 1 : 1;

                const novoRegistro = new Historico({
                    id: novoId,
                    nome: nome.toLowerCase(),
                    pontos: pontos,
                    motivo: atividade,
                    tipo: 'adicionar',
                    data: new Date()
                });

                await novoRegistro.save();
                console.log(`✅ MongoDB: +${pontos} pontos para ${nome} (Total: ${novoTotal})`);
            } else {
                // MongoDB offline - apenas salvar no histórico local (sem duplicação)
                console.log(`⚠️ MongoDB offline: +${pontos} pontos para ${nome} (Apenas histórico local)`);
                
                // Não salvar no MongoDB histórico quando offline para evitar duplicação
                // O cliente irá salvar localmente e sincronizar quando MongoDB voltar
                novoTotal = pontos; // Valor estimado para resposta
            }

            // 🔄 SINCRONIZAÇÃO EM TEMPO REAL
            const dadosParaSincronizar = {
                tipo: 'adicionar',
                nome: nome.toLowerCase(),
                pontos: pontos,
                atividade: atividade,
                novoTotal: novoTotal,
                timestamp: new Date().toISOString()
            };
            
            // Notificar todos os clientes conectados
            io.emit('atualizar-pontos', dadosParaSincronizar);
            console.log('🔄 Sincronização enviada para todos os dispositivos');

            // ✨ REFATORADO: Usar ResponseHelper
            return ResponseHelper.sendSuccess(res, 
                { novoTotal: novoTotal },
                `${pontos} pontos adicionados para ${nome}`
            );
        } catch (error) {
            console.error('❌ Erro ao adicionar pontos:', error);
            return ResponseHelper.sendInternalError(res, error, 'adicionar pontos');
        }
    }
);

// ✨ REFATORADO: Rota com middleware de validação
app.post('/api/pontos/remover', 
    Validators.validatePontosData, // Middleware de validação automática
    async (req, res) => {
        try {
            const { nome, pontos, atividade, motivo } = req.body;
            const atividadeTexto = atividade || motivo; // Aceitar ambos para compatibilidade

            let pontosExistentes = null;
            let novoTotal = 0;

            // Tentar MongoDB primeiro
            if (mongoose.connection.readyState === 1) {
                // Atualizar pontos no MongoDB
                pontosExistentes = await Pontos.findOneAndUpdate(
                    { nome: nome.toLowerCase() },
                    { 
                        $inc: { pontos: -pontos },
                        ultimaAtualizacao: new Date()
                    },
                    { 
                        upsert: true, 
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                // Não permitir pontos negativos
                if (pontosExistentes.pontos < 0) {
                    await Pontos.updateOne(
                        { nome: nome.toLowerCase() },
                        { pontos: 0 }
                    );
                    pontosExistentes.pontos = 0;
                }

                novoTotal = pontosExistentes.pontos;

                // Adicionar ao histórico no MongoDB
                const ultimoHistorico = await Historico.findOne().sort({ id: -1 });
                const novoId = ultimoHistorico ? ultimoHistorico.id + 1 : 1;

                const novoRegistro = new Historico({
                    id: novoId,
                    nome: nome.toLowerCase(),
                    pontos: pontos,
                    motivo: atividadeTexto,
                    tipo: 'remover',
                    data: new Date()
                });

                await novoRegistro.save();
                console.log(`✅ MongoDB: -${pontos} pontos para ${nome} (Total: ${novoTotal})`);
            } else {
                // MongoDB offline - apenas salvar no histórico local (sem duplicação)
                console.log(`⚠️ MongoDB offline: -${pontos} pontos para ${nome} (Apenas histórico local)`);
                
                // Não salvar no MongoDB histórico quando offline para evitar duplicação
                // O cliente irá salvar localmente e sincronizar quando MongoDB voltar
                novoTotal = Math.max(0, pontos); // Valor estimado para resposta
            }

            // 🔄 SINCRONIZAÇÃO EM TEMPO REAL
            const dadosParaSincronizar = {
                tipo: 'remover',
                nome: nome.toLowerCase(),
                pontos: pontos,
                motivo: atividadeTexto,
                novoTotal: novoTotal,
                timestamp: new Date().toISOString()
            };
            
            // Notificar todos os clientes conectados
            io.emit('atualizar-pontos', dadosParaSincronizar);
            console.log('🔄 Sincronização enviada para todos os dispositivos');

            // ✨ REFATORADO: Usar ResponseHelper
            return ResponseHelper.sendSuccess(res, 
                { novoTotal: novoTotal },
                `${pontos} pontos removidos de ${nome}`
            );
        } catch (error) {
            console.error('❌ Erro ao remover pontos:', error);
            return ResponseHelper.sendInternalError(res, error, 'remover pontos');
        }
    }
);

app.post('/api/pontos', async (req, res) => {
    try {
        const pontosData = req.body;
        
        // ✨ CORREÇÃO CRÍTICA: Extrair dados se vier encapsulado em response
        let dadosParaSalvar = pontosData;
        if (pontosData && pontosData.data && typeof pontosData.data === 'object') {
            dadosParaSalvar = pontosData.data;
            console.log('📦 Dados extraídos de response encapsulado');
        }
        
        // ✨ CORREÇÃO CRÍTICA: Validar estrutura dos dados recebidos
        if (!dadosParaSalvar || typeof dadosParaSalvar !== 'object') {
            console.log('❌ POST /api/pontos - Dados inválidos (não é objeto)');
            return res.status(400).json({ 
                success: false, 
                error: 'Dados de pontos inválidos' 
            });
        }
        
        // Normalizar e validar dados
        const pontosNormalizados = {};
        for (const [nome, pontos] of Object.entries(dadosParaSalvar)) {
            // ✨ VALIDAÇÃO: Garantir que nome é string e pontos é número
            if (typeof nome === 'string' && 
                typeof pontos === 'number' && 
                !isNaN(pontos) && 
                nome.trim() !== '' &&
                nome !== 'success') { // Excluir campo 'success'
                pontosNormalizados[nome.toLowerCase().trim()] = Math.round(pontos);
            }
        }
        
        // ✨ PROTEÇÃO: Verificar se temos dados válidos para salvar
        if (Object.keys(pontosNormalizados).length === 0) {
            console.log('⚠️ POST /api/pontos - Nenhum dado válido para salvar');
            return res.status(400).json({ 
                success: false, 
                error: 'Nenhum dado válido para salvar' 
            });
        }
        
        // Salvar no MongoDB primeiro
        if (mongoose.connection.readyState === 1) {
            for (const [nome, pontos] of Object.entries(pontosNormalizados)) {
                await Pontos.findOneAndUpdate(
                    { nome: nome },
                    { 
                        nome: nome, 
                        pontos: pontos,
                        ultimaAtualizacao: new Date()
                    },
                    { upsert: true }
                );
            }
            console.log('📊 Pontos salvos no MongoDB:', pontosNormalizados);
        } else {
            return res.status(500).json({ error: 'Erro ao conectar no MongoDB' });
        }

        // Backup local com chaves normalizadas
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        res.json({ success: true, message: 'Pontos salvos com sucesso!' });
    } catch (error) {
        console.error('❌ Erro ao salvar pontos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.delete('/api/historico/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Remover do MongoDB
        if (mongoose.connection.readyState === 1) {
            await Historico.deleteOne({ id: id });
            console.log(`✅ MongoDB: Registro ${id} removido do histórico`);
        } else {
            return res.status(500).json({ error: 'Erro ao conectar no MongoDB' });
        }

        // Backup local
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao excluir registro:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Limpar todo o histórico (admin only)
app.delete('/api/historico', async (req, res) => {
    try {
        let totalRemovidos = 0;
        let logsRemovidos = 0;

        // Contar registros antes da remoção
        if (mongoose.connection.readyState === 1) {
            totalRemovidos = await Historico.countDocuments();
            console.log(`📊 Registros no MongoDB antes da limpeza: ${totalRemovidos}`);
            
            // ✨ NOVO: Também limpar logs se a collection existir
            try {
                logsRemovidos = await Log.countDocuments();
                await Log.deleteMany({});
                console.log(`✅ MongoDB: ${logsRemovidos} logs removidos`);
            } catch (logError) {
                console.log('⚠️ Não foi possível limpar logs:', logError.message);
            }
            
            await Historico.deleteMany({});
            console.log(`✅ MongoDB: ${totalRemovidos} registros removidos do histórico`);
        } else {
            return res.status(500).json({ error: 'Erro ao conectar no MongoDB' });
        }

        // Backup local - contar e limpar
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        console.log(`🗑️ Histórico completo limpo: ${totalRemovidos} registros removidos, ${logsRemovidos} logs removidos`);
        res.json({ 
            success: true, 
            totalRemovidos: totalRemovidos,
            logsRemovidos: logsRemovidos,
            registrosLocais: 0, // Não há registros locais
            message: `${totalRemovidos} registros e ${logsRemovidos} logs removidos do histórico` 
        });
    } catch (error) {
        console.error('❌ Erro ao limpar histórico:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor ao limpar histórico' 
        });
    }
});

// ✨ NOVOS ENDPOINTS: Sincronização de Atividades
// Endpoint para salvar atividades no MongoDB
app.post('/api/salvar-atividades', async (req, res) => {
    try {
        const { atividades } = req.body;
        console.log('📋 Salvando atividades no MongoDB:', atividades.length, 'atividades');
        
        // Limpar atividades existentes
        await Atividade.deleteMany({});
        
        // Inserir novas atividades
        if (atividades && atividades.length > 0) {
            await Atividade.insertMany(atividades);
        }
        
        console.log('✅ Atividades salvas com sucesso');
        res.json({ success: true, message: 'Atividades salvas com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao salvar atividades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obter atividades do MongoDB
app.get('/api/atividades', async (req, res) => {
    try {
        console.log('📋 Obtendo atividades do MongoDB...');
        const todasAtividades = await Atividade.find().sort({ nome: 1 });
        
        // Separar atividades por tipo
        const positivas = todasAtividades.filter(a => a.tipo === 'positiva');
        const negativas = todasAtividades.filter(a => a.tipo === 'negativa');
        
        console.log('📊 Atividades encontradas:', {
            total: todasAtividades.length,
            positivas: positivas.length,
            negativas: negativas.length
        });
        
        res.json({ 
            success: true, 
            positivas: positivas,
            negativas: negativas,
            total: todasAtividades.length
        });
    } catch (error) {
        console.error('❌ Erro ao obter atividades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para sincronizar atividades do MongoDB
app.get('/api/sincronizar-atividades', async (req, res) => {
    try {
        console.log('🔄 Sincronizando atividades do MongoDB...');
        const atividades = await Atividade.find().sort({ nome: 1 });
        
        console.log('📋 Atividades encontradas:', atividades.length);
        res.json({ success: true, atividades });
    } catch (error) {
        console.error('❌ Erro ao sincronizar atividades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para adicionar nova atividade
app.post('/api/atividades', async (req, res) => {
    try {
        const { nome, pontos, tipo } = req.body;
        
        // Verificar se já existe
        const existeAtividade = await Atividade.findOne({ nome });
        if (existeAtividade) {
            return res.status(400).json({ 
                success: false, 
                error: 'Atividade já existe' 
            });
        }
        
        // Gerar novo ID
        const ultimaAtividade = await Atividade.findOne().sort({ id: -1 });
        const novoId = ultimaAtividade ? ultimaAtividade.id + 1 : 1;
        
        // Criar nova atividade
        const novaAtividade = new Atividade({
            id: novoId,
            nome,
            pontos: parseInt(pontos),
            tipo
        });
        
        await novaAtividade.save();
        
        console.log('✅ Nova atividade criada:', nome);
        res.json({ success: true, atividade: novaAtividade });
    } catch (error) {
        console.error('❌ Erro ao criar atividade:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para remover atividade
app.delete('/api/atividades/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const resultado = await Atividade.deleteOne({ id });
        
        if (resultado.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Atividade não encontrada' 
            });
        }
        
        console.log('🗑️ Atividade removida:', id);
        res.json({ success: true, message: 'Atividade removida com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao remover atividade:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✨ NOVOS ENDPOINTS: Sincronização de Logs do Sistema
// Endpoint para salvar logs no MongoDB
app.post('/api/salvar-logs', async (req, res) => {
    try {
        const { logs } = req.body;
        console.log('📝 Salvando logs no MongoDB:', logs.length, 'registros');
        
        if (logs && logs.length > 0) {
            // Inserir apenas logs que não existem
            for (const logItem of logs) {
                const existeLog = await Log.findOne({ id: logItem.id });
                if (!existeLog) {
                    await Log.create(logItem);
                }
            }
        }
        
        console.log('✅ Logs salvos com sucesso');
        res.json({ success: true, message: 'Logs salvos com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao salvar logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para sincronizar logs do MongoDB
app.get('/api/sincronizar-logs', async (req, res) => {
    try {
        console.log('🔄 Sincronizando logs do MongoDB...');
        const logs = await Log.find().sort({ timestamp: -1 }).limit(1000); // Últimos 1000 logs
        
        console.log('📝 Logs encontrados:', logs.length);
        res.json({ success: true, logs });
    } catch (error) {
        console.error('❌ Erro ao sincronizar logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para adicionar novo log
app.post('/api/logs', async (req, res) => {
    try {
        const { acao, perfil, responsavel, detalhes, dispositivo } = req.body;
        
        // Gerar novo ID
        const ultimoLog = await Log.findOne().sort({ id: -1 });
        const novoId = ultimoLog ? ultimoLog.id + 1 : 1;
        
        // Obter IP do cliente
        const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        
        // Criar novo log
        const novoLog = new Log({
            id: novoId,
            acao,
            perfil,
            responsavel,
            detalhes: detalhes || {},
            dispositivo: dispositivo || 'Desconhecido',
            ip: ip || 'Desconhecido'
        });
        
        await novoLog.save();
        
        console.log('📝 Novo log criado:', acao);
        res.json({ success: true, log: novoLog });
    } catch (error) {
        console.error('❌ Erro ao criar log:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para limpar logs antigos
app.delete('/api/logs/limpar', async (req, res) => {
    try {
        const { diasAtras = 30 } = req.query;
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - parseInt(diasAtras));
        
        const resultado = await Log.deleteMany({ 
            timestamp: { $lt: dataLimite } 
        });
        
        console.log(`🧹 Logs antigos removidos: ${resultado.deletedCount} registros`);
        res.json({ 
            success: true, 
            removidos: resultado.deletedCount,
            message: `${resultado.deletedCount} logs antigos removidos` 
        });
    } catch (error) {
        console.error('❌ Erro ao limpar logs antigos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Debug: Contar registros no histórico
app.get('/api/historico/count', async (req, res) => {
    try {
        let totalMongoDB = 0;
        let totalAtividades = 0;
        let totalLogs = 0;

        // Contar no MongoDB
        if (mongoose.connection.readyState === 1) {
            totalMongoDB = await Historico.countDocuments();
            totalAtividades = await Atividade.countDocuments();
            totalLogs = await Log.countDocuments();
        }

        // Contar no arquivo local
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        res.json({
            success: true,
            historico: {
                mongodb: totalMongoDB,
                local: 0 // Não há registros locais
            },
            atividades: {
                mongodb: totalAtividades
            },
            logs: {
                mongodb: totalLogs
            },
            mongoConnected: mongoose.connection.readyState === 1
        });
    } catch (error) {
        console.error('❌ Erro ao contar registros:', error);
        res.status(500).json({ success: false, message: 'Erro ao contar registros' });
    }
});

app.post('/api/resetar-pontos', async (req, res) => {
    try {
        // Resetar no MongoDB
        if (mongoose.connection.readyState === 1) {
            await Pontos.deleteMany({});
            console.log('🗑️ MongoDB: Todos os pontos resetados');
        } else {
            return res.status(500).json({ error: 'Erro ao conectar no MongoDB' });
        }

        // Resetar local
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        res.json({ success: true, message: 'Pontos resetados com sucesso!' });
    } catch (error) {
        console.error('❌ Erro ao resetar pontos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para limpar logs de sistema do histórico
app.post('/api/limpar-logs-sistema', async (req, res) => {
    try {
        // Limpar do MongoDB
        if (mongoose.connection.readyState === 1) {
            await Historico.deleteMany({ tipo: 'sistema' });
            console.log('🧹 MongoDB: Logs de sistema removidos do histórico');
        } else {
            return res.status(500).json({ error: 'Erro ao conectar no MongoDB' });
        }

        // Limpar local
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        res.json({ success: true, message: 'Logs de sistema removidos do histórico!' });
    } catch (error) {
        console.error('❌ Erro ao limpar logs:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota de diagnóstico
app.get('/api/status', async (req, res) => {
    const status = {
        timestamp: new Date().toISOString(),
        storage: {
            mongodb: {
                status: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
                working: mongoose.connection.readyState === 1
            },
            localFile: {
                status: 'sempre disponível',
                working: true,
                data: 'Não há dados locais' // Não há dados locais
            }
        }
    };

    res.json(status);
});

// Rota para salvar configurações de crianças
app.post('/api/salvar-criancas', async (req, res) => {
    try {
        const { criancas } = req.body;
        
        if (!criancas || !Array.isArray(criancas)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Array de crianças é obrigatório' 
            });
        }

        const criancasSalvas = [];

        if (mongoose.connection.readyState === 1) {
            // Salvar no MongoDB
            for (const crianca of criancas) {
                try {
                    const criancaAtualizada = await Crianca.findOneAndUpdate(
                        { nome: crianca.nome.toLowerCase() },
                        {
                            id: crianca.id,
                            nome: crianca.nome.toLowerCase(),
                            emoji: crianca.emoji,
                            cor: crianca.cor,
                            ativo: true,
                            ultimaAtualizacao: new Date()
                        },
                        { 
                            upsert: true, 
                            new: true,
                            runValidators: true
                        }
                    );
                    criancasSalvas.push(criancaAtualizada);
                } catch (mongoError) {
                    console.error(`❌ Erro ao salvar criança ${crianca.nome}:`, mongoError);
                }
            }
        } else {
            return res.status(500).json({ error: 'Erro ao conectar no MongoDB' });
        }

        // Também salvar no localStorage como backup
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        // ✨ CORREÇÃO CRÍTICA: Garantir que todas as crianças tenham entradas de pontos
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        // Salvar pontos atualizados se necessário
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        console.log('👨‍👩‍👧‍👦 Configurações de crianças salvas:', criancasSalvas.length);
        
        res.json({ 
            success: true, 
            message: `${criancasSalvas.length} configurações de crianças salvas`,
            criancas: criancasSalvas
        });
    } catch (error) {
        console.error('❌ Erro ao salvar configurações de crianças:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Rota para sincronizar crianças baseadas nos pontos existentes
app.get('/api/sincronizar-criancas', async (req, res) => {
    try {
        const criancas = [];
        const cores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        const emojis = ['👦', '👧', '🧒', '👶', '🤴', '👸', '🦸‍♂️', '🦸‍♀️'];
        
        // Carregar crianças do MongoDB (se conectado) e arquivo local
        let criancasMongoDB = [];
        let criancasArquivo = [];
        
        console.log('🔍 DEBUG - Status MongoDB:', mongoose.connection.readyState);
        
        // Tentar carregar do MongoDB
        if (mongoose.connection.readyState === 1) {
            try {
                criancasMongoDB = await Crianca.find({}).sort({ id: 1 });
                console.log('👨‍👩‍👧‍👦 Crianças encontradas no MongoDB:', criancasMongoDB.length);
            } catch (error) {
                console.error('❌ Erro ao buscar crianças no MongoDB:', error);
            }
        }

        // Carregar do arquivo local apenas se não há dados no MongoDB
        let criancasSalvas = [...criancasMongoDB];
        
        if (criancasMongoDB.length === 0) {
            try {
                // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.
                // const criancasFile = 'data/criancas.json';
                // if (fs.existsSync(criancasFile)) {
                //     criancasArquivo = lerDados(criancasFile);
                //     console.log('👨‍👩‍👧‍👦 Crianças carregadas do arquivo local (MongoDB vazio):', criancasArquivo.length);
                //     console.log('🔍 DEBUG - Crianças do arquivo:', criancasArquivo.map(c => c.nome));
                    
                //     // Adicionar crianças do arquivo apenas se não há dados no MongoDB
                //     criancasArquivo.forEach(criancaArquivo => {
                //         criancasSalvas.push(criancaArquivo);
                //         console.log(`➕ Adicionando criança do arquivo local: ${criancaArquivo.nome}`);
                //     });
                // }
            } catch (error) {
                console.error('❌ Erro ao carregar crianças do arquivo:', error);
            }
        } else {
            console.log('✅ Usando apenas dados do MongoDB (arquivo local ignorado)');
        }
        
        console.log(`🔗 Total de crianças mescladas: ${criancasSalvas.length} (MongoDB: ${criancasMongoDB.length}, Arquivo: ${criancasArquivo.length})`);
        
        // ✨ NOVO: Migrar crianças do arquivo para MongoDB se necessário
        // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.

        // Obter pontos atuais
        let pontosData = {};
        if (mongoose.connection.readyState === 1) {
            const pontosDB = await Pontos.find({});
            pontosDB.forEach(p => {
                pontosData[p.nome.toLowerCase()] = p.pontos;
            });
        } else {
            // Todas as rotas e funções que usavam arquivos locais foram removidas. Apenas MongoDB é utilizado.
        }

        // Se há crianças salvas, usar suas configurações
        if (criancasSalvas.length > 0) {
            criancasSalvas.forEach(crianca => {
                const nomeKey = crianca.nome.toLowerCase();
                const pontos = pontosData[nomeKey] || 0;
                
                // ✨ CORREÇÃO: Garantir que crianças sem pontos tenham entrada criada
                if (!(nomeKey in pontosData)) {
                    pontosData[nomeKey] = 0;
                    console.log(`➕ Criando entrada de pontos para ${nomeKey}: 0`);
                }
                
                criancas.push({
                    id: crianca.id,
                    nome: crianca.nome.charAt(0).toUpperCase() + crianca.nome.slice(1),
                    emoji: crianca.emoji,
                    cor: crianca.cor,
                    pontos: pontos
                });
            });
            
            // ✨ NOVO: Salvar pontos atualizados se foram adicionadas novas entradas
            // const pontosFile = 'data/pontos.json';
            // salvarDados(pontosFile, pontosData);
        } else {
            // Não criar crianças dinamicamente - usar apenas crianças cadastradas no MongoDB
            console.log('⚠️ Nenhuma criança cadastrada no MongoDB - lista vazia');
        }
        
        console.log('👨‍👩‍👧‍👦 Crianças sincronizadas:', criancas);
        res.json({ success: true, criancas: criancas });
    } catch (error) {
        console.error('❌ Erro ao sincronizar crianças:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor', criancas: [] });
    }
});

// ✨ NOVOS ENDPOINTS: Sincronização de Lembretes

// GET - Buscar todos os lembretes
app.get('/api/lembretes', async (req, res) => {
    try {
        const lembretes = await Lembrete.find({ ativo: true }).sort({ dataEnvio: -1 });
        console.log(`📝 Lembretes carregados: ${lembretes.length} registros`);
        res.json({ success: true, lembretes });
    } catch (error) {
        console.error('❌ Erro ao carregar lembretes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Criar novo lembrete
app.post('/api/lembretes', async (req, res) => {
    try {
        const { crianca, mensagem } = req.body;
        
        if (!crianca || !mensagem) {
            return res.status(400).json({ 
                success: false, 
                error: 'Criança e mensagem são obrigatórios' 
            });
        }
        
        // Gerar ID único
        const ultimoLembrete = await Lembrete.findOne().sort({ id: -1 });
        const novoId = ultimoLembrete ? ultimoLembrete.id + 1 : 1;
        
        const novoLembrete = new Lembrete({
            id: novoId,
            crianca: crianca,
            mensagem: mensagem,
            dataEnvio: new Date()
        });
        
        await novoLembrete.save();
        
        console.log(`📝 Novo lembrete criado: ${crianca} - ${mensagem.substring(0, 50)}...`);
        
        // Emitir evento WebSocket para sincronização
        io.emit('lembrete-novo', novoLembrete);
        
        res.json({ 
            success: true, 
            message: 'Lembrete enviado com sucesso!',
            lembrete: novoLembrete
        });
    } catch (error) {
        console.error('❌ Erro ao criar lembrete:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT - Marcar lembrete como lido
app.put('/api/lembretes/:id/lido', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { lidoPor } = req.body;
        
        const lembrete = await Lembrete.findOneAndUpdate(
            { id: id },
            { 
                lido: true,
                dataLeitura: new Date(),
                lidoPor: lidoPor || 'Responsável'
            },
            { new: true }
        );
        
        if (!lembrete) {
            return res.status(404).json({ 
                success: false, 
                error: 'Lembrete não encontrado' 
            });
        }
        
        console.log(`✅ Lembrete marcado como lido: ${lembrete.crianca}`);
        
        // Emitir evento WebSocket para sincronização
        io.emit('lembrete-lido', lembrete);
        
        res.json({ 
            success: true, 
            message: 'Lembrete marcado como lido',
            lembrete: lembrete
        });
    } catch (error) {
        console.error('❌ Erro ao marcar lembrete como lido:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE - Limpar lembretes lidos
app.delete('/api/lembretes/limpar-lidos', async (req, res) => {
    try {
        const resultado = await Lembrete.deleteMany({ lido: true });
        
        console.log(`🧹 Lembretes lidos removidos: ${resultado.deletedCount} registros`);
        
        // Emitir evento WebSocket para sincronização
        io.emit('lembretes-limpos', { removidos: resultado.deletedCount });
        
        res.json({ 
            success: true, 
            message: `${resultado.deletedCount} lembretes lidos foram removidos`,
            removidos: resultado.deletedCount
        });
    } catch (error) {
        console.error('❌ Erro ao limpar lembretes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✨ NOVO: Endpoint para limpar todas as crianças
app.delete('/api/limpar-todas-criancas', async (req, res) => {
    try {
        console.log('🗑️ Limpando todas as crianças do MongoDB...');
        
        const resultado = await Crianca.deleteMany({});
        
        console.log(`✅ ${resultado.deletedCount} crianças removidas do MongoDB`);
        
        res.json({ 
            success: true, 
            message: `${resultado.deletedCount} crianças removidas`,
            removidas: resultado.deletedCount
        });
        
    } catch (error) {
        console.error('❌ Erro ao limpar crianças:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✨ NOVO: Endpoint para limpar todos os pontos
app.delete('/api/limpar-todos-pontos', async (req, res) => {
    try {
        console.log('🗑️ Limpando todos os pontos do MongoDB...');
        
        const resultado = await Pontos.deleteMany({});
        
        console.log(`✅ ${resultado.deletedCount} pontos removidos do MongoDB`);
        
        res.json({ 
            success: true, 
            message: `${resultado.deletedCount} pontos removidos`,
            removidos: resultado.deletedCount
        });
        
    } catch (error) {
        console.error('❌ Erro ao limpar pontos:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✨ NOVO: Endpoint para limpar todo o histórico
app.delete('/api/limpar-todo-historico', async (req, res) => {
    try {
        console.log('🗑️ Limpando todo o histórico do MongoDB...');
        
        const resultado = await Historico.deleteMany({});
        
        console.log(`✅ ${resultado.deletedCount} registros de histórico removidos do MongoDB`);
        
        res.json({ 
            success: true, 
            message: `${resultado.deletedCount} registros de histórico removidos`,
            removidos: resultado.deletedCount
        });
        
    } catch (error) {
        console.error('❌ Erro ao limpar histórico:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✨ NOVO: Endpoint para remover criança
app.delete('/api/criancas/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // Verificar se a criança existe (qualquer status)
        const crianca = await Crianca.findOne({ 
            id: parseInt(id)
        });
        if (!crianca) {
            return res.status(404).json({ 
                success: false, 
                error: 'Criança não encontrada' 
            });
        }
        
        // Excluir completamente do banco de dados
        await Crianca.deleteOne({ id: parseInt(id) });
        
        // Remover pontos da criança
        await Pontos.deleteOne({ nome: crianca.nome.toLowerCase() });
        
        // ✨ NOVO: Remover todo o histórico da criança
        const historicoRemovido = await Historico.deleteMany({ 
            nome: crianca.nome.toLowerCase() 
        });
        
        // ✨ NOVO: Remover logs de sistema que mencionam a criança
        const logsRemovidos = await Log.deleteMany({
            $or: [
                { 'detalhes.filho': crianca.nome },
                { 'detalhes.filho': crianca.nome.toLowerCase() },
                { 'detalhes.filho': crianca.nome.toUpperCase() }
            ]
        });
        
        // ✨ NOVO: Limpar histórico órfão (crianças que não existem mais)
        const criancasExistentes = await Crianca.find({});
        const nomesExistentes = criancasExistentes.map(c => c.nome.toLowerCase());
        const historicoOrfaoRemovido = await Historico.deleteMany({
            nome: { $nin: nomesExistentes }
        });
        
        console.log(`🗑️ Criança excluída do banco: ${crianca.nome} (ID: ${id})`);
        console.log(`📝 Histórico da criança removido: ${historicoRemovido.deletedCount} registros`);
        console.log(`📋 Logs de sistema removidos: ${logsRemovidos.deletedCount} registros`);
        console.log(`🧹 Histórico órfão removido: ${historicoOrfaoRemovido.deletedCount} registros`);
        
        const totalRemovido = historicoRemovido.deletedCount + logsRemovidos.deletedCount + historicoOrfaoRemovido.deletedCount;
        
        res.json({ 
            success: true, 
            message: `Criança ${crianca.nome} excluída do banco com sucesso (${historicoRemovido.deletedCount} histórico + ${logsRemovidos.deletedCount} logs removidos)` 
        });
    } catch (error) {
        console.error('❌ Erro ao remover criança:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✨ REFATORAÇÃO DRY: Handlers de erro padronizados
app.use(ResponseHelper.notFoundHandler); // 404
app.use(ResponseHelper.errorHandler); // Catch-all errors

// Iniciar servidor
server.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
    console.log('📱 Acesse: http://localhost:' + PORT);
    console.log('💾 Armazenamento: MongoDB Atlas');
    console.log('🔄 WebSocket: Sincronização em tempo real ativada!');
    console.log('✨ Refatoração DRY: Utilitários carregados!');
});
