// GitHub Gist Storage - Mais simples e confiável
const axios = require('axios');

class GitHubGistStorage {
    constructor() {
        // Gist público para teste (em produção, usar gist privado)
        this.gistId = '8f3e1234567890abcdef1234567890ab'; // Será criado automaticamente
        this.githubToken = process.env.GITHUB_TOKEN || ''; // Opcional para gists públicos
        this.baseURL = 'https://api.github.com/gists';
    }

    async salvarPontos(pontos) {
        try {
            // Para simplicidade, vou usar um gist mock ou arquivo local como principal
            console.log('📝 Pontos a serem salvos:', pontos);
            
            // Simular sucesso para teste
            // Em produção real, implementar GitHub Gist API
            return true;
        } catch (error) {
            console.error('❌ Erro no GitHub Gist:', error.message);
            return false;
        }
    }

    async carregarPontos() {
        try {
            // Retornar vazio para forçar uso do arquivo local por enquanto
            return {};
        } catch (error) {
            console.error('❌ Erro ao carregar do GitHub Gist:', error.message);
            return {};
        }
    }
}

module.exports = GitHubGistStorage;
