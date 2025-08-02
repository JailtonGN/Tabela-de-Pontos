const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Importar models
const { Pontos, Historico } = require('./models/Pontos');

// Conectar ao MongoDB Atlas
const connectDB = async () => {
    try {
        const mongoURI = 'mongodb+srv://tabela-pontos:TabelaPontos2025!@cluster0.nblesgu.mongodb.net/tabela-pontos?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(mongoURI);
        console.log('🗄️ MongoDB Atlas conectado com sucesso!');
        console.log('🌐 Cluster:', mongoURI.split('@')[1].split('/')[0]);
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error.message);
        console.log('📁 Usando apenas armazenamento local');
    }
};

connectDB();

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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

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

        const historicoAtual = lerDados(HISTORICO_FILE);
        const novoRegistroLocal = {
            id: historicoAtual.length ? Math.max(...historicoAtual.map(h => h.id)) + 1 : 1,
            nome: nomeKey,
            pontos: pontos,
            motivo: atividade,
            tipo: 'adicionar',
            data: new Date().toISOString()
        };
        historicoAtual.unshift(novoRegistroLocal);
        salvarDados(HISTORICO_FILE, historicoAtual);

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

        const historicoAtual = lerDados(HISTORICO_FILE);
        const novoRegistroLocal = {
            id: historicoAtual.length ? Math.max(...historicoAtual.map(h => h.id)) + 1 : 1,
            nome: nomeKey,
            pontos: pontos,
            motivo: motivo,
            tipo: 'remover',
            data: new Date().toISOString()
        };
        historicoAtual.unshift(novoRegistroLocal);
        salvarDados(HISTORICO_FILE, historicoAtual);

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

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('🚀 Servidor rodando na porta', PORT);
    console.log('📱 Acesse: http://localhost:' + PORT);
    console.log('💾 Armazenamento: MongoDB Atlas + Local Files');
});
