const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
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
            serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
            socketTimeoutMS: 45000, // Timeout de socket de 45 segundos
            maxPoolSize: 10, // Máximo 10 conexões simultâneas
            bufferCommands: false, // Não aguardar conexão para comandos
        });
        
        console.log('🗄️ MongoDB Atlas conectado com sucesso!');
        console.log('🌐 Cluster:', mongoURI.split('@')[1].split('/')[0]);
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error.message);
        console.log('💡 Dica: Configure IP 0.0.0.0/0 no MongoDB Atlas para aceitar qualquer IP');
        console.log('📁 Sistema funcionará apenas com armazenamento local');
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
        if (mongoose.connection.readyState === 1) {
            const pontosDB = await Pontos.find({});
            const pontosObj = {};
            pontosDB.forEach(p => {
                pontosObj[p.nome.toLowerCase()] = p.pontos;
            });
            return pontosObj;
        } else {
            return lerDados(PONTOS_FILE);
        }
    } catch (error) {
        console.error('❌ Erro ao obter pontos:', error);
        return {};
    }
}

// Arquivos de dados locais (backup)
const PONTOS_FILE = 'data/pontos.json';
const HISTORICO_FILE = 'data/historico.json';

// Criar pasta data se não existir
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// Função para ler dados do arquivo JSON
function lerDados(arquivo) {
    try {
        if (fs.existsSync(arquivo)) {
            const data = fs.readFileSync(arquivo, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.error(`❌ Erro ao ler ${arquivo}:`, error.message);
        return {};
    }
}

// Função para salvar dados no arquivo JSON
function salvarDados(arquivo, dados) {
    try {
        fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
        return true;
    } catch (error) {
        console.error(`❌ Erro ao salvar ${arquivo}:`, error.message);
        return false;
    }
}

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

// Função para salvar no histórico (MongoDB + Local) - APENAS para pontos das crianças
async function salvarHistorico(dadosLog) {
    try {
        // Salvar no MongoDB se disponível
        if (mongoose.connection.readyState === 1) {
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
            console.log('📝 Histórico salvo no MongoDB:', dadosLog.tipo);
        }

        // Backup local
        let historicoLocal = lerDados(HISTORICO_FILE);
        const novoRegistroLocal = {
            id: historicoLocal.length ? Math.max(...historicoLocal.map(h => h.id || 0)) + 1 : 1,
            nome: dadosLog.nome,
            pontos: dadosLog.pontos,
            motivo: dadosLog.motivo,
            tipo: dadosLog.tipo,
            data: dadosLog.data || dadosLog.timestamp
        };
        
        if (Array.isArray(historicoLocal)) {
            historicoLocal.unshift(novoRegistroLocal);
        } else {
            historicoLocal = [novoRegistroLocal];
        }
        
        salvarDados(HISTORICO_FILE, historicoLocal);
        console.log('📝 Histórico salvo localmente');
    } catch (error) {
        console.error('❌ Erro ao salvar histórico:', error);
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
        // Tentar MongoDB primeiro
        if (mongoose.connection.readyState === 1) {
            const pontosDB = await Pontos.find({});
            const pontosObj = {};
            pontosDB.forEach(p => {
                pontosObj[p.nome.toLowerCase()] = p.pontos;
            });
            if (Object.keys(pontosObj).length > 0) {
                console.log('📊 Pontos carregados do MongoDB:', pontosObj);
                res.json(pontosObj);
                return;
            }
        }

        // Fallback: arquivo local
        const pontosLocal = lerDados(PONTOS_FILE);
        console.log('📁 Usando arquivo local como último recurso');
        res.json(pontosLocal);
    } catch (error) {
        console.error('❌ Erro ao carregar pontos:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/historico', async (req, res) => {
    try {
        // Tentar MongoDB primeiro
        if (mongoose.connection.readyState === 1) {
            const historicoDB = await Historico.find({}).sort({ data: -1 });
            console.log('📋 Histórico carregado do MongoDB:', historicoDB.length, 'registros');
            res.json(historicoDB);
            return;
        }

        // Fallback: arquivo local
        const historicoLocal = lerDados(HISTORICO_FILE);
        res.json(Array.isArray(historicoLocal) ? historicoLocal : []);
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
            try {
                let historico = lerDados(HISTORICO_FILE) || [];
                historico.push(historicoEntry);
                
                // Manter apenas últimas 1000 entradas
                if (historico.length > 1000) {
                    historico = historico.slice(-1000);
                }
                
                salvarDados(HISTORICO_FILE, historico);
                console.log('📁 Histórico salvo localmente:', historicoEntry);
            } catch (localError) {
                console.error('❌ Erro ao salvar histórico localmente:', localError);
            }
            
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

            // Tentar MongoDB primeiro
            if (mongoose.connection.readyState === 1) {
                // Atualizar ou criar pontos no MongoDB
                const pontosExistentes = await Pontos.findOneAndUpdate(
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

                const novoTotal = pontosExistentes.pontos;

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
                // Fallback para arquivo local se MongoDB não estiver disponível
                await salvarHistorico({
                    nome: nome.toLowerCase(),
                    pontos: pontos,
                    motivo: atividade,
                    tipo: 'adicionar',
                    timestamp: new Date().toISOString()
                });
            }

            // Backup local (apenas pontos, não histórico)
            const pontosAtuais = lerDados(PONTOS_FILE);
            const nomeKey = nome.toLowerCase();
            pontosAtuais[nomeKey] = (pontosAtuais[nomeKey] || 0) + pontos;
            salvarDados(PONTOS_FILE, pontosAtuais);

            // 🔄 SINCRONIZAÇÃO EM TEMPO REAL
            const dadosParaSincronizar = {
                tipo: 'adicionar',
                nome: nomeKey,
                pontos: pontos,
                atividade: atividade,
                novoTotal: pontosAtuais[nomeKey],
                timestamp: new Date().toISOString()
            };
            
            // Notificar todos os clientes conectados
            io.emit('atualizar-pontos', dadosParaSincronizar);
            console.log('🔄 Sincronização enviada para todos os dispositivos');

            // ✨ REFATORADO: Usar ResponseHelper
            return ResponseHelper.sendSuccess(res, 
                { novoTotal: pontosAtuais[nomeKey] },
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

            // Tentar MongoDB primeiro
            if (mongoose.connection.readyState === 1) {
                // Atualizar pontos no MongoDB
                const pontosExistentes = await Pontos.findOneAndUpdate(
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
                console.log(`✅ MongoDB: -${pontos} pontos para ${nome} (Total: ${pontosExistentes.pontos})`);
            } else {
                // Fallback para arquivo local se MongoDB não estiver disponível
                await salvarHistorico({
                    nome: nome.toLowerCase(),
                pontos: pontos,
                motivo: atividadeTexto,
                tipo: 'remover',
                timestamp: new Date().toISOString()
            });
        }

            // Backup local (apenas pontos, não histórico)
            const pontosAtuais = lerDados(PONTOS_FILE);
            const nomeKey = nome.toLowerCase();
            pontosAtuais[nomeKey] = Math.max(0, (pontosAtuais[nomeKey] || 0) - pontos);
            salvarDados(PONTOS_FILE, pontosAtuais);

            // 🔄 SINCRONIZAÇÃO EM TEMPO REAL
            const dadosParaSincronizar = {
                tipo: 'remover',
                nome: nomeKey,
                pontos: pontos,
                motivo: atividadeTexto,
                novoTotal: pontosAtuais[nomeKey],
                timestamp: new Date().toISOString()
            };
            
            // Notificar todos os clientes conectados
            io.emit('atualizar-pontos', dadosParaSincronizar);
            console.log('🔄 Sincronização enviada para todos os dispositivos');

            // ✨ REFATORADO: Usar ResponseHelper
            return ResponseHelper.sendSuccess(res, 
                { novoTotal: pontosAtuais[nomeKey] },
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
        }

        // Backup local com chaves normalizadas
        salvarDados(PONTOS_FILE, pontosNormalizados);
        console.log('📁 Pontos salvos localmente:', pontosNormalizados);

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
        }

        // Backup local
        const historicoAtual = lerDados(HISTORICO_FILE);
        const novoHistorico = historicoAtual.filter(item => item.id !== id);
        salvarDados(HISTORICO_FILE, novoHistorico);

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
            console.log('⚠️ MongoDB não conectado, limpando apenas arquivo local');
        }

        // Backup local - contar e limpar
        const historicoAtual = lerDados(HISTORICO_FILE);
        const registrosLocais = historicoAtual.length;
        if (!totalRemovidos) totalRemovidos = registrosLocais;
        
        salvarDados(HISTORICO_FILE, []);
        console.log(`📁 Arquivo local: ${registrosLocais} registros removidos`);

        console.log(`🗑️ Histórico completo limpo: ${totalRemovidos} registros removidos, ${logsRemovidos} logs removidos`);
        res.json({ 
            success: true, 
            totalRemovidos: totalRemovidos,
            logsRemovidos: logsRemovidos,
            registrosLocais: registrosLocais,
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
        let totalLocal = 0;
        let totalAtividades = 0;
        let totalLogs = 0;

        // Contar no MongoDB
        if (mongoose.connection.readyState === 1) {
            totalMongoDB = await Historico.countDocuments();
            totalAtividades = await Atividade.countDocuments();
            totalLogs = await Log.countDocuments();
        }

        // Contar no arquivo local
        const historicoLocal = lerDados(HISTORICO_FILE);
        totalLocal = historicoLocal.length;

        res.json({
            success: true,
            historico: {
                mongodb: totalMongoDB,
                local: totalLocal
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
        }

        // Resetar local
        salvarDados(PONTOS_FILE, {});
        console.log('🗑️ Local: Todos os pontos resetados');

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
        }

        // Limpar local
        const historicoLocal = lerDados(HISTORICO_FILE);
        const historicoLimpo = historicoLocal.filter(item => item.tipo !== 'sistema');
        salvarDados(HISTORICO_FILE, historicoLimpo);
        console.log('🧹 Local: Logs de sistema removidos do histórico');

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
                data: lerDados(PONTOS_FILE)
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
        }

        // Também salvar no localStorage como backup
        const criancasFile = 'data/criancas.json';
        salvarDados(criancasFile, criancas);

        // ✨ CORREÇÃO CRÍTICA: Garantir que todas as crianças tenham entradas de pontos
        const pontosFile = 'data/pontos.json';
        let pontosData = {};
        
        try {
            if (fs.existsSync(pontosFile)) {
                pontosData = lerDados(pontosFile);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar pontos existentes:', error);
            pontosData = {};
        }
        
        // Adicionar pontos para crianças que não têm entrada
        let pontosAtualizados = false;
        for (const crianca of criancas) {
            const nomeKey = crianca.nome.toLowerCase();
            if (!(nomeKey in pontosData)) {
                pontosData[nomeKey] = 0;
                pontosAtualizados = true;
                console.log(`➕ Criando entrada de pontos para ${nomeKey}: 0`);
            }
        }
        
        // Salvar pontos atualizados se necessário
        if (pontosAtualizados) {
            salvarDados(pontosFile, pontosData);
            console.log('💾 Pontos atualizados com novas crianças');
        }

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
                criancasMongoDB = await Crianca.find({ ativo: true }).sort({ id: 1 });
                console.log('👨‍👩‍👧‍👦 Crianças encontradas no MongoDB:', criancasMongoDB.length);
            } catch (error) {
                console.error('❌ Erro ao buscar crianças no MongoDB:', error);
            }
        }

        // Sempre tentar carregar do arquivo local
        try {
            const criancasFile = 'data/criancas.json';
            if (fs.existsSync(criancasFile)) {
                criancasArquivo = lerDados(criancasFile);
                console.log('👨‍👩‍👧‍👦 Crianças carregadas do arquivo local:', criancasArquivo.length);
                console.log('🔍 DEBUG - Crianças do arquivo:', criancasArquivo.map(c => c.nome));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar crianças do arquivo:', error);
        }

        // Mesclar crianças: MongoDB + arquivo local (priorizando arquivo local para conflitos)
        let criancasSalvas = [...criancasMongoDB];
        
        // Adicionar crianças do arquivo que não estão no MongoDB
        criancasArquivo.forEach(criancaArquivo => {
            const existeNoMongoDB = criancasMongoDB.some(c => c.nome.toLowerCase() === criancaArquivo.nome.toLowerCase());
            if (!existeNoMongoDB) {
                criancasSalvas.push(criancaArquivo);
                console.log(`➕ Adicionando criança do arquivo local: ${criancaArquivo.nome}`);
            }
        });
        
        console.log(`🔗 Total de crianças mescladas: ${criancasSalvas.length} (MongoDB: ${criancasMongoDB.length}, Arquivo: ${criancasArquivo.length})`);

        // Obter pontos atuais
        let pontosData = {};
        if (mongoose.connection.readyState === 1) {
            const pontosDB = await Pontos.find({});
            pontosDB.forEach(p => {
                pontosData[p.nome.toLowerCase()] = p.pontos;
            });
        } else {
            pontosData = lerDados(PONTOS_FILE);
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
            const pontosFile = 'data/pontos.json';
            salvarDados(pontosFile, pontosData);
        } else {
            // Fallback: criar crianças baseadas apenas nos pontos (comportamento antigo)
            let index = 0;
            for (const [nome, pontos] of Object.entries(pontosData)) {
                if (nome && nome !== 'testeatlas') {
                    criancas.push({
                        id: index + 1,
                        nome: nome.charAt(0).toUpperCase() + nome.slice(1),
                        emoji: emojis[index % emojis.length],
                        cor: {
                            nome: ['Vermelho', 'Verde', 'Azul', 'Rosa', 'Amarelo', 'Roxo', 'Ciano', 'Laranja'][index % 8],
                            valor: cores[index % cores.length],
                            gradiente: `linear-gradient(135deg, ${cores[index % cores.length]} 0%, ${cores[(index + 1) % cores.length]} 100%)`
                        },
                        pontos: pontos || 0
                    });
                    index++;
                }
            }
        }
        
        console.log('👨‍👩‍👧‍👦 Crianças sincronizadas:', criancas);
        res.json({ success: true, criancas: criancas });
    } catch (error) {
        console.error('❌ Erro ao sincronizar crianças:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor', criancas: [] });
    }
});

// ✨ NOVO: Endpoint para visualizar histórico de uma criança específica
app.get('/api/historico/crianca/:nome', async (req, res) => {
    try {
        const nome = req.params.nome.toLowerCase();
        
        // Buscar registros de histórico da criança
        const registros = await Historico.find({ nome: nome }).sort({ data: -1 });
        
        console.log(`📋 Histórico de ${nome}: ${registros.length} registros encontrados`);
        
        res.json({ 
            success: true, 
            crianca: nome,
            total: registros.length,
            registros: registros
        });
    } catch (error) {
        console.error('❌ Erro ao buscar histórico da criança:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✨ NOVO: Endpoint para remover histórico de uma criança específica
app.delete('/api/historico/crianca/:nome', async (req, res) => {
    try {
        const nome = req.params.nome.toLowerCase();
        
        // Remover todos os registros da criança
        const resultado = await Historico.deleteMany({ nome: nome });
        
        console.log(`🗑️ Histórico de ${nome} removido: ${resultado.deletedCount} registros`);
        
        res.json({ 
            success: true, 
            crianca: nome,
            registrosRemovidos: resultado.deletedCount,
            message: `Histórico de ${nome} removido: ${resultado.deletedCount} registros`
        });
    } catch (error) {
        console.error('❌ Erro ao remover histórico da criança:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✨ NOVO: Endpoint para limpar histórico órfão
app.delete('/api/limpar-historico-orfao', async (req, res) => {
    try {
        // Obter todas as crianças ativas
        const criancasAtivas = await Crianca.find({ ativo: true });
        const nomesAtivos = criancasAtivas.map(c => c.nome.toLowerCase());
        
        // Remover histórico de crianças que não existem mais
        const historicoRemovido = await Historico.deleteMany({
            nome: { $nin: nomesAtivos }
        });
        
        console.log(`🧹 Histórico órfão limpo: ${historicoRemovido.deletedCount} registros removidos`);
        res.json({ 
            success: true, 
            message: `Histórico limpo: ${historicoRemovido.deletedCount} registros órfãos removidos` 
        });
    } catch (error) {
        console.error('❌ Erro ao limpar histórico órfão:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✨ NOVO: Endpoints para lembretes das crianças

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

// ✨ NOVO: Endpoint para remover criança
app.delete('/api/criancas/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // Verificar se a criança existe
        const crianca = await Crianca.findOne({ id: id, ativo: true });
        if (!crianca) {
            return res.status(404).json({ 
                success: false, 
                error: 'Criança não encontrada' 
            });
        }
        
        // Marcar como inativa em vez de deletar
        await Crianca.updateOne(
            { id: id },
            { 
                ativo: false,
                ultimaAtualizacao: new Date()
            }
        );
        
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
        const criancasAtivas = await Crianca.find({ ativo: true });
        const nomesAtivos = criancasAtivas.map(c => c.nome.toLowerCase());
        const historicoOrfaoRemovido = await Historico.deleteMany({
            nome: { $nin: nomesAtivos }
        });
        
        console.log(`🗑️ Criança removida: ${crianca.nome} (ID: ${id})`);
        console.log(`📝 Histórico da criança removido: ${historicoRemovido.deletedCount} registros`);
        console.log(`📋 Logs de sistema removidos: ${logsRemovidos.deletedCount} registros`);
        console.log(`🧹 Histórico órfão removido: ${historicoOrfaoRemovido.deletedCount} registros`);
        
        const totalRemovido = historicoRemovido.deletedCount + logsRemovidos.deletedCount + historicoOrfaoRemovido.deletedCount;
        
        res.json({ 
            success: true, 
            message: `Criança ${crianca.nome} removida com sucesso (${historicoRemovido.deletedCount} histórico + ${logsRemovidos.deletedCount} logs removidos)` 
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
    console.log('💾 Armazenamento: MongoDB Atlas + Local Files');
    console.log('🔄 WebSocket: Sincronização em tempo real ativada!');
    console.log('✨ Refatoração DRY: Utilitários carregados!');
});
