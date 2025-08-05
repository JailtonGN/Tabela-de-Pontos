/**
 * 📋 ROTAS DE HISTÓRICO
 * 
 * Rotas para gerenciamento do histórico de atividades
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const { Historico } = require('../../models/Pontos');
const ResponseHelper = require('../../utils/response-helper');

/**
 * GET /api/historico
 * Lista o histórico de atividades
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        const historico = await Historico.find({})
            .sort({ data: -1 })
            .limit(parseInt(limit))
            .skip(skip);
        
        const total = await Historico.countDocuments({});
        
        ResponseHelper.sendSuccess(res, {
            historico,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }, 'Histórico carregado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        ResponseHelper.sendInternalError(res, error, 'buscar histórico');
    }
});

/**
 * POST /api/historico
 * Adiciona uma entrada no histórico
 */
router.post('/', async (req, res) => {
    try {
        const { nome, pontos, motivo, tipo } = req.body;
        
        if (!nome || pontos === undefined || !motivo || !tipo) {
            return ResponseHelper.sendError(res, 'Todos os campos são obrigatórios', 400);
        }
        
        const historico = new Historico({
            id: Date.now(),
            nome,
            pontos,
            motivo,
            tipo,
            data: new Date()
        });
        
        await historico.save();
        
        ResponseHelper.sendSuccess(res, historico, 'Entrada adicionada ao histórico');
        
    } catch (error) {
        console.error('❌ Erro ao adicionar histórico:', error);
        ResponseHelper.sendInternalError(res, error, 'adicionar histórico');
    }
});

/**
 * DELETE /api/historico/:id
 * Remove uma entrada do histórico
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const historico = await Historico.findByIdAndDelete(id);
        
        if (!historico) {
            return ResponseHelper.sendNotFound(res, 'Entrada');
        }
        
        ResponseHelper.sendSuccess(res, null, 'Entrada removida do histórico');
        
    } catch (error) {
        console.error('❌ Erro ao remover histórico:', error);
        ResponseHelper.sendInternalError(res, error, 'remover histórico');
    }
});

module.exports = router; 