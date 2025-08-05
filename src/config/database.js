/**
 * 🗄️ CONFIGURAÇÃO DO BANCO DE DADOS
 * 
 * Centraliza toda a configuração de conexão com MongoDB
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const mongoose = require('mongoose');

// Configurações de conexão
const dbConfig = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    bufferCommands: true,
    retryWrites: true,
    w: 'majority'
};

// URI do MongoDB
const getMongoURI = () => {
    return process.env.MONGODB_URI || 
           'mongodb+srv://tabela-pontos:TabelaPontos2025!@cluster0.nblesgu.mongodb.net/tabela-pontos?retryWrites=true&w=majority&appName=Cluster0&authSource=admin';
};

// Função para conectar ao MongoDB
const connectDB = async () => {
    try {
        const mongoURI = getMongoURI();
        
        await mongoose.connect(mongoURI, dbConfig);
        
        console.log('🗄️ MongoDB Atlas conectado com sucesso!');
        console.log('🌐 Cluster:', mongoURI.split('@')[1].split('/')[0]);
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error.message);
        console.log('💡 Dica: Configure IP 0.0.0.0/0 no MongoDB Atlas para aceitar qualquer IP');
        console.log('📁 Sistema funcionará apenas com armazenamento local');
        return false;
    }
};

// Função para verificar se está conectado
const isConnected = () => {
    return mongoose.connection.readyState === 1;
};

// Função para desconectar
const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log('🔌 MongoDB desconectado');
    } catch (error) {
        console.error('❌ Erro ao desconectar MongoDB:', error.message);
    }
};

module.exports = {
    connectDB,
    isConnected,
    disconnectDB,
    getMongoURI
}; 