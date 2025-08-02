// Solução JSONBin.io - API gratuita para persistência JSON
const axios = require('axios');

class JSONBinStorage {
    constructor() {
        this.apiKey = '$2a$10$8K7iJ3qP2wH5rF1nM9xL6e';
        this.binIdPontos = '66ab8d12ad19ca34f894c234';  
        this.binIdHistorico = '66ab8d25ad19ca34f894c245';
        this.baseURL = 'https://api.jsonbin.io/v3/b';
    }

    async salvarPontos(pontos) {
        try {
            const response = await axios.put(
                `${this.baseURL}/${this.binIdPontos}`,
                pontos,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': this.apiKey
                    }
                }
            );
            console.log('✅ Pontos salvos no JSONBin:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar pontos no JSONBin:', error.message);
            return false;
        }
    }

    async carregarPontos() {
        try {
            const response = await axios.get(
                `${this.baseURL}/${this.binIdPontos}/latest`,
                {
                    headers: {
                        'X-Master-Key': this.apiKey
                    }
                }
            );
            console.log('✅ Pontos carregados do JSONBin:', response.data.record);
            return response.data.record;
        } catch (error) {
            console.error('❌ Erro ao carregar pontos do JSONBin:', error.message);
            return {};
        }
    }

    async salvarHistorico(historico) {
        try {
            const response = await axios.put(
                `${this.baseURL}/${this.binIdHistorico}`,
                { historico },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': this.apiKey
                    }
                }
            );
            console.log('✅ Histórico salvo no JSONBin:', response.data);
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar histórico no JSONBin:', error.message);
            return false;
        }
    }

    async carregarHistorico() {
        try {
            const response = await axios.get(
                `${this.baseURL}/${this.binIdHistorico}/latest`,
                {
                    headers: {
                        'X-Master-Key': this.apiKey
                    }
                }
            );
            console.log('✅ Histórico carregado do JSONBin:', response.data.record);
            return response.data.record;
        } catch (error) {
            console.error('❌ Erro ao carregar histórico do JSONBin:', error.message);
            return { historico: [] };
        }
    }
}

module.exports = JSONBinStorage;
