const mongoose = require('mongoose');

// Schema para pontos dos filhos
const pontosSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        unique: true
    },
    pontos: {
        type: Number,
        default: 0
    },
    ultimaAtualizacao: {
        type: Date,
        default: Date.now
    }
});

// Schema para crianças/filhos
const criancaSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    nome: {
        type: String,
        required: true,
        unique: true
    },
    emoji: {
        type: String,
        default: '👶'
    },
    cor: {
        nome: {
            type: String,
            default: 'Azul'
        },
        valor: {
            type: String,
            default: '#4facfe'
        },
        gradiente: {
            type: String,
            default: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        }
    },
    ativo: {
        type: Boolean,
        default: true
    },
    dataCriacao: {
        type: Date,
        default: Date.now
    },
    ultimaAtualizacao: {
        type: Date,
        default: Date.now
    }
});

// Schema para histórico
const historicoSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    nome: {
        type: String,
        required: true
    },
    pontos: {
        type: Number,
        required: true
    },
    motivo: {
        type: String,
        required: true
    },
    tipo: {
        type: String,
        enum: ['adicionar', 'remover'],
        required: true
    },
    data: {
        type: Date,
        default: Date.now
    }
});

// ✨ NOVO: Schema para atividades
const atividadeSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    nome: {
        type: String,
        required: true
    },
    pontos: {
        type: Number,
        required: true
    },
    tipo: {
        type: String,
        enum: ['positiva', 'negativa'],
        required: true
    },
    ativo: {
        type: Boolean,
        default: true
    },
    dataCriacao: {
        type: Date,
        default: Date.now
    },
    ultimaAtualizacao: {
        type: Date,
        default: Date.now
    }
});

// ✨ NOVO: Schema para logs do sistema
const logSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    acao: {
        type: String,
        required: true
    },
    perfil: {
        type: String,
        required: true
    },
    responsavel: {
        type: String,
        required: false
    },
    detalhes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    dispositivo: {
        type: String,
        required: false
    },
    ip: {
        type: String,
        required: false
    }
});

const Pontos = mongoose.model('Pontos', pontosSchema);
const Historico = mongoose.model('Historico', historicoSchema);
const Crianca = mongoose.model('Crianca', criancaSchema);
const Atividade = mongoose.model('Atividade', atividadeSchema);
// ✨ NOVO: Schema para lembretes das crianças
const lembreteSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    crianca: {
        type: String,
        required: true
    },
    mensagem: {
        type: String,
        required: true,
        maxlength: 500
    },
    dataEnvio: {
        type: Date,
        default: Date.now,
        required: true
    },
    lido: {
        type: Boolean,
        default: false
    },
    dataLeitura: {
        type: Date,
        default: null
    },
    lidoPor: {
        type: String,
        default: null
    },
    ativo: {
        type: Boolean,
        default: true
    }
});

const Log = mongoose.model('Log', logSchema);
const Lembrete = mongoose.model('Lembrete', lembreteSchema);

module.exports = { Pontos, Historico, Crianca, Atividade, Log, Lembrete };
