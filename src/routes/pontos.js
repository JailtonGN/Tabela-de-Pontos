/**
 * 🎯 ROTAS DE PONTOS
 * 
 * Rotas para gerenciamento de pontos das crianças
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const { Pontos, Historico } = require('../../models/Pontos');
const ResponseHelper = require('../../utils/response-helper');

/**
 * GET /api/pontos
 * Lista todos os pontos
 */
router.get('/', async (req, res) => {
    try {
        const pontos = await Pontos.find({}).sort({ nome: 1 });
        
        ResponseHelper.sendSuccess(res, pontos, 'Pontos carregados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao buscar pontos:', error);
        ResponseHelper.sendInternalError(res, error, 'buscar pontos');
    }
});

/**
 * POST /api/pontos
 * Adiciona pontos para uma criança
 */
router.post('/', async (req, res) => {
    try {
        const { nome, pontos, motivo, tipo = 'adicionar' } = req.body;
        
        if (!nome || pontos === undefined) {
            return ResponseHelper.sendError(res, 'Nome e pontos são obrigatórios', 400);
        }
        
        // Buscar ou criar registro de pontos
        let registroPontos = await Pontos.findOne({ nome: nome.toLowerCase() });
        
        if (!registroPontos) {
            registroPontos = new Pontos({
                nome: nome.toLowerCase(),
                pontos: 0
            });
        }
        
        // Calcular novos pontos
        const pontosAtuais = registroPontos.pontos;
        const novosPontos = tipo === 'adicionar' ? pontosAtuais + pontos : pontosAtuais - pontos;
        
        // Atualizar pontos
        registroPontos.pontos = Math.max(0, novosPontos); // Não permitir pontos negativos
        registroPontos.ultimaAtualizacao = new Date();
        
        await registroPontos.save();
        
        // Salvar no histórico
        const historico = new Historico({
            id: Date.now(),
            nome: nome,
            pontos: pontos,
            motivo: motivo || `${tipo} de pontos`,
            tipo: tipo,
            data: new Date()
        });
        
        await historico.save();
        
        ResponseHelper.sendSuccess(res, {
            nome: nome,
            pontos: registroPontos.pontos,
            alteracao: pontos,
            tipo: tipo
        }, 'Pontos atualizados com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao adicionar pontos:', error);
        ResponseHelper.sendInternalError(res, error, 'adicionar pontos');
    }
});

/**
 * PUT /api/pontos/:id
 * Atualiza pontos de uma criança específica
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { pontos, motivo } = req.body;
        
        if (pontos === undefined) {
            return ResponseHelper.sendError(res, 'Pontos são obrigatórios', 400);
        }
        
        const registroPontos = await Pontos.findById(id);
        
        if (!registroPontos) {
            return ResponseHelper.sendNotFound(res, 'Registro');
        }
        
        const pontosAnteriores = registroPontos.pontos;
        registroPontos.pontos = Math.max(0, pontos);
        registroPontos.ultimaAtualizacao = new Date();
        
        await registroPontos.save();
        
        // Salvar no histórico
        const historico = new Historico({
            id: Date.now(),
            nome: registroPontos.nome,
            pontos: pontos - pontosAnteriores,
            motivo: motivo || 'Ajuste manual de pontos',
            tipo: pontos > pontosAnteriores ? 'adicionar' : 'remover',
            data: new Date()
        });
        
        await historico.save();
        
        ResponseHelper.sendSuccess(res, registroPontos, 'Pontos atualizados com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar pontos:', error);
        ResponseHelper.sendInternalError(res, error, 'atualizar pontos');
    }
});

/**
 * DELETE /api/pontos/:id
 * Remove registro de pontos
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const registroPontos = await Pontos.findByIdAndDelete(id);
        
        if (!registroPontos) {
            return ResponseHelper.sendNotFound(res, 'Registro');
        }
        
        ResponseHelper.sendSuccess(res, null, 'Registro removido com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao remover pontos:', error);
        ResponseHelper.sendInternalError(res, error, 'remover pontos');
    }
});

/**
 * GET /api/pontos/reset
 * Reseta todos os pontos para zero
 */
router.get('/reset', async (req, res) => {
    try {
        await Pontos.updateMany({}, { pontos: 0, ultimaAtualizacao: new Date() });
        
        // Salvar no histórico
        const historico = new Historico({
            id: Date.now(),
            nome: 'Sistema',
            pontos: 0,
            motivo: 'Reset geral dos pontos',
            tipo: 'remover',
            data: new Date()
        });
        
        await historico.save();
        
        ResponseHelper.sendSuccess(res, null, 'Todos os pontos foram resetados');
        
    } catch (error) {
        console.error('❌ Erro ao resetar pontos:', error);
        ResponseHelper.sendInternalError(res, error, 'resetar pontos');
    }
});

module.exports = router; 