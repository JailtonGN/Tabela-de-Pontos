/**
 * 🔐 ROTAS DE AUTENTICAÇÃO
 * 
 * Rotas para autenticação e autorização
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const ResponseHelper = require('../../utils/response-helper');

/**
 * POST /api/auth/login
 * Login do usuário
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Simulação de autenticação (em produção, usar JWT real)
        if (username === 'admin' && password === 'admin123') {
            const user = {
                id: 1,
                username: 'admin',
                name: 'Administrador',
                role: 'admin',
                permissions: ['manage_children', 'manage_points', 'view_reports']
            };
            
            ResponseHelper.sendSuccess(res, {
                user,
                token: 'fake-jwt-token-' + Date.now()
            }, 'Login realizado com sucesso');
        } else {
            ResponseHelper.sendUnauthorized(res, 'Credenciais inválidas');
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json(ResponseHelper.error('Erro no login'));
    }
});

/**
 * POST /api/auth/logout
 * Logout do usuário
 */
router.post('/logout', async (req, res) => {
    try {
        ResponseHelper.sendSuccess(res, null, 'Logout realizado com sucesso');
    } catch (error) {
        console.error('❌ Erro no logout:', error);
        ResponseHelper.sendInternalError(res, error, 'logout');
    }
});

/**
 * GET /api/auth/profile
 * Perfil do usuário atual
 */
router.get('/profile', async (req, res) => {
    try {
        // Simulação de perfil (em produção, verificar JWT)
        const user = {
            id: 1,
            username: 'admin',
            name: 'Administrador',
            role: 'admin',
            permissions: ['manage_children', 'manage_points', 'view_reports']
        };
        
        ResponseHelper.sendSuccess(res, user, 'Perfil carregado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        ResponseHelper.sendInternalError(res, error, 'carregar perfil');
    }
});

module.exports = router; 