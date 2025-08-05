/**
 * 👨‍👩‍👧‍👦 CONTROLLER DE CRIANÇAS
 * 
 * Gerencia todas as operações relacionadas às crianças
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const { Crianca, Pontos } = require('../../models/Pontos');
const { isConnected } = require('../config/database');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Arquivos de dados locais (backup)
const PONTOS_FILE = 'data/pontos.json';

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
        console.log(`💾 Dados salvos em ${arquivo}`);
    } catch (error) {
        console.error(`❌ Erro ao salvar ${arquivo}:`, error.message);
    }
}

// Sincronizar crianças (MongoDB + arquivo local)
const sincronizarCriancas = async (req, res) => {
    try {
        console.log('🔍 DEBUG - Status MongoDB:', mongoose.connection.readyState);
        
        let criancasMongoDB = [];
        let criancasArquivo = [];
        
        // Tentar buscar do MongoDB primeiro
        if (isConnected()) {
            criancasMongoDB = await Crianca.find({}).sort({ id: 1 });
            console.log('🗄️ Crianças encontradas no MongoDB:', criancasMongoDB.length);
        }
        
        let criancasSalvas = [...criancasMongoDB];
        
        // Se MongoDB estiver vazio, usar arquivo local como fallback
        if (criancasMongoDB.length === 0) {
            console.log('📁 Usando arquivo local como último recurso');
            
            if (fs.existsSync(PONTOS_FILE)) {
                const pontosData = lerDados(PONTOS_FILE);
                
                // Converter pontos em crianças
                Object.keys(pontosData).forEach(nome => {
                    const pontos = pontosData[nome];
                    criancasArquivo.push({
                        id: nome.toLowerCase().replace(/\s+/g, '-'),
                        nome: nome,
                        pontos: pontos,
                        ativo: true,
                        dataCriacao: new Date().toISOString()
                    });
                });
                
                criancasSalvas = [...criancasSalvas, ...criancasArquivo];
                
                // Migrar dados do arquivo para MongoDB se MongoDB estiver disponível
                if (isConnected() && criancasArquivo.length > 0) {
                    console.log('🔄 Migrando dados do arquivo para MongoDB...');
                    
                    for (const crianca of criancasArquivo) {
                        const criancaExistente = await Crianca.findOne({ nome: crianca.nome });
                        if (!criancaExistente) {
                            await Crianca.create(crianca);
                        }
                    }
                    
                    console.log('✅ Migração concluída');
                }
            }
        }
        
        // Buscar pontos atuais para incluir nas crianças
        let pontosData = {};
        if (isConnected()) {
            const pontosDB = await Pontos.find({});
            pontosDB.forEach(p => {
                pontosData[p.nome.toLowerCase()] = p.pontos;
            });
        } else {
            pontosData = lerDados(PONTOS_FILE);
        }
        
        // Construir array final de crianças com pontos atualizados
        const criancas = criancasSalvas.map(crianca => ({
            id: crianca.id,
            nome: crianca.nome,
            pontos: pontosData[crianca.nome.toLowerCase()] || 0,
            ativo: crianca.ativo,
            dataCriacao: crianca.dataCriacao
        }));
        
        console.log('🔗 Total de crianças mescladas:', criancas.length, `(MongoDB: ${criancasMongoDB.length}, Arquivo: ${criancasArquivo.length})`);
        console.log('👨‍👩‍👧‍👦 Crianças sincronizadas:', criancas.map(c => c.nome));
        
        res.json({
            success: true,
            criancas: criancas
        });
        
    } catch (error) {
        console.error('❌ Erro ao sincronizar crianças:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// Adicionar nova criança
const adicionarCrianca = async (req, res) => {
    try {
        const { nome } = req.body;
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Nome da criança é obrigatório'
            });
        }
        
        const novaCrianca = {
            id: nome.toLowerCase().replace(/\s+/g, '-'),
            nome: nome.trim(),
            pontos: 0,
            ativo: true,
            dataCriacao: new Date().toISOString()
        };
        
        if (isConnected()) {
            await Crianca.create(novaCrianca);
        }
        
        // Salvar também no arquivo local como backup
        const pontosData = lerDados(PONTOS_FILE);
        pontosData[novaCrianca.nome] = 0;
        salvarDados(PONTOS_FILE, pontosData);
        
        res.json({
            success: true,
            message: 'Criança adicionada com sucesso',
            crianca: novaCrianca
        });
        
    } catch (error) {
        console.error('❌ Erro ao adicionar criança:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// Remover criança
const removerCrianca = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (isConnected()) {
            await Crianca.findOneAndUpdate(
                { id: id },
                { ativo: false },
                { new: true }
            );
        }
        
        res.json({
            success: true,
            message: 'Criança removida com sucesso'
        });
        
    } catch (error) {
        console.error('❌ Erro ao remover criança:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

module.exports = {
    sincronizarCriancas,
    adicionarCrianca,
    removerCrianca
}; 