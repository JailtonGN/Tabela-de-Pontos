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
// Conectar ao MongoDB (fallback)
const connectDB = async () => {
    try {
        // URL direta do MongoDB Atlas
        const mongoURI = 'mongodb+srv://tabela-pontos:TabelaPontos2025!@cluster0.nblesgu.mongodb.net/tabela-pontos?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(mongoURI);
        console.log('🗄️ MongoDB Atlas conectado com sucesso!');
        console.log('🌐 Cluster:', mongoURI.split('@')[1].split('/')[0]);
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error.message);
        console.log('🌐 Usando JSONBin como armazenamento principal');
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
            if (Object.keys(pontosObj).length > 0) {
                console.log('📊 Pontos carregados do MongoDB:', pontosObj);
                res.json(pontosObj);
                return;
            }
        }

        // Fallback para arquivo local
        console.log('📁 Usando arquivo local como último recurso');
        const pontos = lerDados(PONTOS_FILE);
        res.json(pontos);
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
        
        // Salvar no JSONBin primeiro
        const sucessoJSONBin = await jsonBinStorage.salvarPontos(pontosData);
        
        // Tentar salvar no MongoDB também (backup)
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
            console.log('💾 Pontos salvos no MongoDB (backup):', pontosData);
        }
        
        // Salvar arquivo local também (backup)
        salvarDados(PONTOS_FILE, pontosData);
        
        if (sucessoJSONBin) {
            console.log('🌐 Pontos salvos no JSONBin:', pontosData);
            res.json({ success: true, message: 'Pontos salvos com sucesso!' });
        } else {
            res.json({ success: true, message: 'Pontos salvos localmente!' });
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

// Rota para diagnóstico - VERIFICAR ONDE OS DADOS ESTÃO SENDO SALVOS
app.get('/api/status', async (req, res) => {
    const status = {
        timestamp: new Date().toISOString(),
        storage: {
            jsonbin: {
                status: 'testing...',
                working: false
            },
            mongodb: {
                status: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
                working: mongoose.connection.readyState === 1
            },
            localFile: {
                status: 'sempre disponível',
                working: true,
                pontosFile: fs.existsSync(PONTOS_FILE),
                historicoFile: fs.existsSync(HISTORICO_FILE)
            }
        },
        data: {
            pontos: {},
            historico: [],
            lastAction: 'Verificação completa do sistema'
        }
    };

    // Testar JSONBin
    try {
        const pontosJSONBin = await jsonBinStorage.carregarPontos();
        if (pontosJSONBin && Object.keys(pontosJSONBin).length > 0) {
            status.storage.jsonbin.status = 'funcionando ✅';
            status.storage.jsonbin.working = true;
            status.data.pontos = pontosJSONBin;
            status.data.lastAction = 'Dados carregados do JSONBin';
        } else {
            status.storage.jsonbin.status = 'vazio ou erro ❌';
        }
    } catch (error) {
        status.storage.jsonbin.status = `erro: ${error.message}`;
    }

    // Testar MongoDB
    if (mongoose.connection.readyState === 1) {
        try {
            const pontosDB = await Pontos.find({});
            const pontosObj = {};
            pontosDB.forEach(p => {
                pontosObj[p.nome.toLowerCase()] = p.pontos;
            });
            if (Object.keys(pontosObj).length > 0) {
                status.data.pontos = pontosObj;
                status.data.lastAction = 'Dados carregados do MongoDB';
            }
        } catch (error) {
            status.storage.mongodb.status = `erro: ${error.message}`;
        }
    }

    // Carregar arquivo local (sempre funciona)
    const pontosLocal = lerDados(PONTOS_FILE);
    if (Object.keys(pontosLocal).length > 0) {
        status.data.pontos = pontosLocal;
        status.data.lastAction = 'Dados carregados do arquivo local';
    }

    const historicoLocal = lerDados(HISTORICO_FILE);
    if (historicoLocal.historico) {
        status.data.historico = historicoLocal.historico.slice(0, 3); // Primeiros 3 registros
    }

    res.json(status);
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