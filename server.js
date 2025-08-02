const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

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
const { Pontos, Historico } = require('./models/Pontos');

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

app.post('/api/pontos/adicionar', async (req, res) => {
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
        }

        // Backup local
        const pontosAtuais = lerDados(PONTOS_FILE);
        const nomeKey = nome.toLowerCase();
        pontosAtuais[nomeKey] = (pontosAtuais[nomeKey] || 0) + pontos;
        salvarDados(PONTOS_FILE, pontosAtuais);

        // Salvar no histórico usando a função correta
        await salvarHistorico({
            nome: nomeKey,
            pontos: pontos,
            motivo: atividade,
            tipo: 'adicionar',
            timestamp: new Date().toISOString()
        });

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

        res.json({ success: true, novoTotal: pontosAtuais[nomeKey] });
    } catch (error) {
        console.error('❌ Erro ao adicionar pontos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.post('/api/pontos/remover', async (req, res) => {
    try {
        const { nome, pontos, motivo } = req.body;

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
                motivo: motivo,
                tipo: 'remover',
                data: new Date()
            });

            await novoRegistro.save();
            console.log(`✅ MongoDB: -${pontos} pontos para ${nome} (Total: ${pontosExistentes.pontos})`);
        }

        // Backup local
        const pontosAtuais = lerDados(PONTOS_FILE);
        const nomeKey = nome.toLowerCase();
        pontosAtuais[nomeKey] = Math.max(0, (pontosAtuais[nomeKey] || 0) - pontos);
        salvarDados(PONTOS_FILE, pontosAtuais);

        // Salvar no histórico usando a função correta
        await salvarHistorico({
            nome: nomeKey,
            pontos: pontos,
            motivo: motivo,
            tipo: 'remover',
            timestamp: new Date().toISOString()
        });

        // 🔄 SINCRONIZAÇÃO EM TEMPO REAL
        const dadosParaSincronizar = {
            tipo: 'remover',
            nome: nomeKey,
            pontos: pontos,
            motivo: motivo,
            novoTotal: pontosAtuais[nomeKey],
            timestamp: new Date().toISOString()
        };
        
        // Notificar todos os clientes conectados
        io.emit('atualizar-pontos', dadosParaSincronizar);
        console.log('🔄 Sincronização enviada para todos os dispositivos');

        res.json({ success: true, novoTotal: pontosAtuais[nomeKey] });
    } catch (error) {
        console.error('❌ Erro ao remover pontos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.post('/api/pontos', async (req, res) => {
    try {
        const pontosData = req.body;
        
        // Salvar no MongoDB primeiro
        if (mongoose.connection.readyState === 1) {
            for (const [nome, pontos] of Object.entries(pontosData)) {
                await Pontos.findOneAndUpdate(
                    { nome: nome.toLowerCase() },
                    { 
                        nome: nome.toLowerCase(), 
                        pontos: pontos,
                        ultimaAtualizacao: new Date()
                    },
                    { upsert: true }
                );
            }
            console.log('📊 Pontos salvos no MongoDB:', pontosData);
        }

        // Backup local
        salvarDados(PONTOS_FILE, pontosData);
        console.log('📁 Pontos salvos localmente:', pontosData);

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

// Rota para sincronizar crianças baseadas nos pontos existentes
app.get('/api/sincronizar-criancas', async (req, res) => {
    try {
        const criancas = [];
        const cores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        const emojis = ['👦', '👧', '🧒', '👶', '🤴', '👸', '🦸‍♂️', '🦸‍♀️'];
        
        // Tentar MongoDB primeiro
        if (mongoose.connection.readyState === 1) {
            const pontosDB = await Pontos.find({});
            pontosDB.forEach((pontoDoc, index) => {
                if (pontoDoc.nome && pontoDoc.nome !== 'testeatlas') { // Pular nome de teste
                    criancas.push({
                        id: index + 1,
                        nome: pontoDoc.nome.charAt(0).toUpperCase() + pontoDoc.nome.slice(1),
                        emoji: emojis[index % emojis.length],
                        cor: cores[index % cores.length],
                        pontos: pontoDoc.pontos || 0
                    });
                }
            });
        } else {
            // Fallback: arquivo local
            const pontosLocal = lerDados(PONTOS_FILE);
            let index = 0;
            for (const [nome, pontos] of Object.entries(pontosLocal)) {
                if (nome && nome !== 'testeatlas') { // Pular nome de teste
                    criancas.push({
                        id: index + 1,
                        nome: nome.charAt(0).toUpperCase() + nome.slice(1),
                        emoji: emojis[index % emojis.length],
                        cor: cores[index % cores.length],
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

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
    console.log('📱 Acesse: http://localhost:' + PORT);
    console.log('💾 Armazenamento: MongoDB Atlas + Local Files');
    console.log('🔄 WebSocket: Sincronização em tempo real ativada!');
});
