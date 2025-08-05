/**
 * 👶 ROTAS DE CRIANÇAS
 * 
 * Rotas para gerenciamento de crianças/filhos
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const { Crianca } = require('../../models/Pontos');
const ResponseHelper = require('../../utils/response-helper');

/**
 * GET /api/criancas
 * Lista todas as crianças
 */
router.get('/', async (req, res) => {
    try {
        const criancas = await Crianca.find({ ativo: true }).sort({ nome: 1 });
        ResponseHelper.sendSuccess(res, criancas, 'Crianças carregadas com sucesso');
    } catch (error) {
        console.error('❌ Erro ao buscar crianças:', error);
        ResponseHelper.sendInternalError(res, error, 'buscar crianças');
    }
});

/**
 * POST /api/criancas
 * Cria uma nova criança
 */
router.post('/', async (req, res) => {
    try {
        const { nome, emoji, cor } = req.body;
        
        if (!nome) {
            return ResponseHelper.sendError(res, 'Nome é obrigatório', 400);
        }
        
        const crianca = new Crianca({
            id: Date.now(),
            nome: nome,
            emoji: emoji || '👶',
            cor: cor || {
                nome: 'Azul',
                valor: '#4facfe',
                gradiente: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
            }
        });
        
        await crianca.save();
        
        ResponseHelper.sendSuccess(res, crianca, 'Criança criada com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao criar criança:', error);
        ResponseHelper.sendInternalError(res, error, 'criar criança');
    }
});

module.exports = router; 