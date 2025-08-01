const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

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
app.get('/api/pontos', (req, res) => {
    try {
        const pontos = lerDados(PONTOS_FILE);
        res.json({
            joao: pontos.joao || 0,
            maria: pontos.maria || 0,
            pedro: pontos.pedro || 0
        });
    } catch (error) {
        console.error('Erro ao obter pontos:', error);
        res.status(500).json({ error: 'Erro ao obter pontos' });
    }
});

app.get('/api/historico', (req, res) => {
    try {
        const historico = lerDados(HISTORICO_FILE);
        res.json(historico.historico || []);
    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        res.status(500).json({ error: 'Erro ao obter histórico' });
    }
});

app.post('/api/pontos/adicionar', (req, res) => {
    const { nome, pontos, motivo } = req.body;

    try {
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
    } catch (error) {
        console.error('Erro ao adicionar pontos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.post('/api/pontos/remover', (req, res) => {
    const { nome, pontos, motivo } = req.body;

    try {
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
    } catch (error) {
        console.error('Erro ao remover pontos:', error);
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