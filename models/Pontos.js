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

const Pontos = mongoose.model('Pontos', pontosSchema);
const Historico = mongoose.model('Historico', historicoSchema);

module.exports = { Pontos, Historico };
