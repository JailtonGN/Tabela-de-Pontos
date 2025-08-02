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

// Conectar ao MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tabela-pontos';
        await mongoose.connect(mongoURI);
        console.log('🗄️ MongoDB conectado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error.message);
        // Continuar com arquivos locais se MongoDB não disponível
        console.log('📁 Usando armazenamento local como fallback');
    }
};

connectDB();

// Arquivos de dados
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
            const dados = fs.readFileSync(arquivo, 'utf8');
            return JSON.parse(dados);
        }
    } catch (error) {
        console.error(`Erro ao ler ${arquivo}:`, error);
    }
    return {};
}

// Função para salvar dados no arquivo JSON
function salvarDados(arquivo, dados) {
    try {
        fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
        return true;
    } catch (error) {
        console.error(`Erro ao salvar ${arquivo}:`, error);
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
            console.log('📊 Pontos carregados do MongoDB:', pontosObj);
            res.json(pontosObj);
        } else {
            // Fallback para arquivo local
            console.log('📁 Usando arquivo local como fallback');
            const pontos = lerDados(PONTOS_FILE);
            res.json(pontos);
        }
    } catch (error) {
        console.error('❌ Erro ao obter pontos:', error);
        // Fallback para arquivo local em caso de erro
        const pontos = lerDados(PONTOS_FILE);
        res.json(pontos);
    }
});

app.get('/api/historico', async (req, res) => {
    try {
        // Tentar MongoDB primeiro
        if (mongoose.connection.readyState === 1) {
            const historicoDB = await Historico.find({}).sort({ data: -1 });
            console.log('📋 Histórico carregado do MongoDB:', historicoDB.length, 'registros');
            res.json({ historico: historicoDB });
        } else {
            // Fallback para arquivo local
            console.log('📁 Usando arquivo local para histórico');
            const historico = lerDados(HISTORICO_FILE);
            res.json(historico);
        }
    } catch (error) {
        console.error('❌ Erro ao obter histórico:', error);
        const historico = lerDados(HISTORICO_FILE);
        res.json(historico);
    }
});

app.post('/api/pontos/adicionar', async (req, res) => {
    const { nome, pontos, motivo } = req.body;

    try {
        // Tentar MongoDB primeiro
        if (mongoose.connection.readyState === 1) {
            // Atualizar ou criar pontos no MongoDB
            const filtro = { nome: nome.toLowerCase() };
            const pontoAtual = await Pontos.findOne(filtro);
            const novoTotal = (pontoAtual?.pontos || 0) + pontos;
            
            await Pontos.findOneAndUpdate(
                filtro,
                { 
                    nome: nome.toLowerCase(), 
                    pontos: novoTotal,
                    ultimaAtualizacao: new Date()
                },
                { upsert: true }
            );

            // Adicionar ao histórico no MongoDB
            const novoHistorico = new Historico({
                id: Date.now(),
                nome: nome,
                pontos: pontos,
                motivo: motivo,
                tipo: 'adicionar',
                data: new Date()
            });
            
            await novoHistorico.save();
            
            console.log(`✅ MongoDB: +${pontos} pontos para ${nome} (Total: ${novoTotal})`);
            res.json({ success: true, message: 'Pontos adicionados com sucesso!' });
        } else {
            // Fallback para arquivos locais
            console.log('📁 Usando arquivos locais para adicionar pontos');
            const dadosPontos = lerDados(PONTOS_FILE);
            const dadosHistorico = lerDados(HISTORICO_FILE);
            
            // Atualizar pontos
            const chave = nome.toLowerCase();
            dadosPontos[chave] = (dadosPontos[chave] || 0) + pontos;
            
            // Adicionar ao histórico
            const novoRegistro = {
                id: Date.now(),
                nome: nome,
                pontos: pontos,
                motivo: motivo,
                tipo: 'adicionar',
                data: new Date().toISOString()
            };
            
            if (!dadosHistorico.historico) {
                dadosHistorico.historico = [];
            }
            dadosHistorico.historico.unshift(novoRegistro);
            
            // Salvar dados
            const sucessoPontos = salvarDados(PONTOS_FILE, dadosPontos);
            const sucessoHistorico = salvarDados(HISTORICO_FILE, dadosHistorico);
            
            if (sucessoPontos && sucessoHistorico) {
                res.json({ success: true, message: 'Pontos adicionados com sucesso!' });
            } else {
                res.status(500).json({ success: false, message: 'Erro ao salvar dados' });
            }
        }
    } catch (error) {
        console.error('❌ Erro ao adicionar pontos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.post('/api/pontos/remover', async (req, res) => {
    const { nome, pontos, motivo } = req.body;

    try {
        // Tentar MongoDB primeiro
        if (mongoose.connection.readyState === 1) {
            // Atualizar pontos no MongoDB
            const filtro = { nome: nome.toLowerCase() };
            const pontoAtual = await Pontos.findOne(filtro);
            const novoTotal = Math.max(0, (pontoAtual?.pontos || 0) - pontos);
            
            await Pontos.findOneAndUpdate(
                filtro,
                { 
                    nome: nome.toLowerCase(), 
                    pontos: novoTotal,
                    ultimaAtualizacao: new Date()
                },
                { upsert: true }
            );

            // Adicionar ao histórico no MongoDB
            const novoHistorico = new Historico({
                id: Date.now(),
                nome: nome,
                pontos: pontos,
                motivo: motivo,
                tipo: 'remover',
                data: new Date()
            });
            
            await novoHistorico.save();
            
            console.log(`❌ MongoDB: -${pontos} pontos para ${nome} (Total: ${novoTotal})`);
            res.json({ success: true, message: 'Pontos removidos com sucesso!' });
        } else {
            // Fallback para arquivos locais
            console.log('📁 Usando arquivos locais para remover pontos');
            const dadosPontos = lerDados(PONTOS_FILE);
            const dadosHistorico = lerDados(HISTORICO_FILE);
            
            // Atualizar pontos
            const chave = nome.toLowerCase();
            dadosPontos[chave] = Math.max(0, (dadosPontos[chave] || 0) - pontos);
            
            // Adicionar ao histórico
            const novoRegistro = {
                id: Date.now(),
                nome: nome,
                pontos: pontos,
                motivo: motivo,
                tipo: 'remover',
                data: new Date().toISOString()
            };
            
            if (!dadosHistorico.historico) {
                dadosHistorico.historico = [];
            }
            dadosHistorico.historico.unshift(novoRegistro);
            
            // Salvar dados
            const sucessoPontos = salvarDados(PONTOS_FILE, dadosPontos);
            const sucessoHistorico = salvarDados(HISTORICO_FILE, dadosHistorico);
            
            if (sucessoPontos && sucessoHistorico) {
                res.json({ success: true, message: 'Pontos removidos com sucesso!' });
            } else {
                res.status(500).json({ success: false, message: 'Erro ao salvar dados' });
            }
        }
    } catch (error) {
        console.error('❌ Erro ao remover pontos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para salvar pontos diretamente (usada pelo frontend)
app.post('/api/pontos', async (req, res) => {
    try {
        const pontosData = req.body;
        
        if (mongoose.connection.readyState === 1) {
            // Salvar cada filho no MongoDB
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
            console.log('💾 Pontos salvos no MongoDB:', pontosData);
            res.json({ success: true, message: 'Pontos salvos com sucesso!' });
        } else {
            // Fallback para arquivo local
            const sucesso = salvarDados(PONTOS_FILE, pontosData);
            res.json({ success: sucesso, message: sucesso ? 'Pontos salvos localmente!' : 'Erro ao salvar' });
        }
    } catch (error) {
        console.error('❌ Erro ao salvar pontos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para salvar histórico diretamente (usada pelo frontend)
app.post('/api/historico', async (req, res) => {
    try {
        const { historico } = req.body;
        
        if (mongoose.connection.readyState === 1) {
            // Salvar histórico no MongoDB (limpar e inserir tudo)
            await Historico.deleteMany({});
            
            for (const item of historico) {
                const novoItem = new Historico({
                    id: item.id || Date.now(),
                    nome: item.nome,
                    pontos: item.pontos,
                    motivo: item.motivo,
                    tipo: item.tipo,
                    data: new Date(item.data)
                });
                await novoItem.save();
            }
            
            console.log('📋 Histórico salvo no MongoDB:', historico.length, 'registros');
            res.json({ success: true, message: 'Histórico salvo com sucesso!' });
        } else {
            // Fallback para arquivo local
            const sucesso = salvarDados(HISTORICO_FILE, { historico });
            res.json({ success: sucesso, message: sucesso ? 'Histórico salvo localmente!' : 'Erro ao salvar' });
        }
    } catch (error) {
        console.error('❌ Erro ao salvar histórico:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`💾 Armazenamento local ativo`);
}); 