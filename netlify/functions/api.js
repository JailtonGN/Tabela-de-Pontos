const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos de dados
const pontosPath = path.join(__dirname, '../../data/pontos.json');
const historicoPath = path.join(__dirname, '../../data/historico.json');

// Função para ler arquivo JSON
function lerArquivo(caminho, valorPadrao = {}) {
    try {
        if (fs.existsSync(caminho)) {
            const conteudo = fs.readFileSync(caminho, 'utf8');
            return JSON.parse(conteudo);
        }
    } catch (error) {
        console.error('Erro ao ler arquivo:', error);
    }
    return valorPadrao;
}

// Função para escrever arquivo JSON
function escreverArquivo(caminho, dados) {
    try {
        // Garantir que o diretório existe
        const dir = path.dirname(caminho);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao escrever arquivo:', error);
        return false;
    }
}

exports.handler = async (event, context) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    // Tratar OPTIONS (preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { path: requestPath } = event;
        const method = event.httpMethod;
        
        // Remover /api do path
        const endpoint = requestPath.replace('/api', '');

        switch (endpoint) {
            case '/pontos':
                if (method === 'GET') {
                    const pontos = lerArquivo(pontosPath, {});
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify(pontos)
                    };
                } else if (method === 'POST') {
                    const pontos = JSON.parse(event.body);
                    const sucesso = escreverArquivo(pontosPath, pontos);
                    return {
                        statusCode: sucesso ? 200 : 500,
                        headers,
                        body: JSON.stringify({ sucesso })
                    };
                }
                break;

            case '/historico':
                if (method === 'GET') {
                    const historico = lerArquivo(historicoPath, []);
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify(historico)
                    };
                } else if (method === 'POST') {
                    const novoItem = JSON.parse(event.body);
                    const historico = lerArquivo(historicoPath, []);
                    historico.push(novoItem);
                    const sucesso = escreverArquivo(historicoPath, historico);
                    return {
                        statusCode: sucesso ? 200 : 500,
                        headers,
                        body: JSON.stringify({ sucesso })
                    };
                }
                break;

            default:
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Endpoint não encontrado' })
                };
        }
    } catch (error) {
        console.error('Erro no handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
    }
};
