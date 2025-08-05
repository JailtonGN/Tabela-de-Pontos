/**
 * 🔐 ROTA DE LOGIN COMPATÍVEL
 * 
 * Rota de login que funciona com o frontend existente
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const ResponseHelper = require('../../utils/response-helper');

/**
 * POST /api/login
 * Login do usuário (compatível com frontend)
 */
router.post('/', async (req, res) => {
    try {
        const { type, nome, senha } = req.body;
        
        console.log('🔐 Tentativa de login recebida:', { type, nome, senha });
        
        let isValid = false;
        let permissions = [];
        let user = {};

        // Configurações de autenticação
        const AUTH_CONFIG = {
            pai: {
                senhaFamilia: 'familia123'
            },
            admin: {
                senhaAdmin: 'admin2025!'
            }
        };

        switch (type) {
            case 'pai':
                console.log('👨‍👩‍👧‍👦 Verificando login de pai...');
                isValid = senha === AUTH_CONFIG.pai.senhaFamilia;
                permissions = ['view', 'add_points', 'remove_points'];
                user = {
                    id: 1,
                    username: nome || 'pai',
                    name: 'Pai/Mãe',
                    role: 'pai',
                    permissions: permissions
                };
                break;
            
            case 'admin':
                console.log('🔧 Verificando login de admin...');
                isValid = senha === AUTH_CONFIG.admin.senhaAdmin;
                permissions = ['view', 'add_points', 'remove_points', 'manage_children', 'manage_activities', 'view_history', 'export_data'];
                user = {
                    id: 2,
                    username: nome || 'admin',
                    name: 'Administrador',
                    role: 'admin',
                    permissions: permissions
                };
                break;
            
            case 'guest':
                console.log('👀 Login de visitante (sempre válido)');
                isValid = true;
                permissions = ['view'];
                user = {
                    id: 3,
                    username: nome || 'guest',
                    name: 'Visitante',
                    role: 'guest',
                    permissions: permissions
                };
                break;
            
            default:
                console.log('❌ Tipo de usuário inválido:', type);
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de usuário inválido'
                });
        }

        if (isValid) {
            console.log('✅ Login válido para:', user.name);
            
            ResponseHelper.sendSuccess(res, {
                user,
                token: 'fake-jwt-token-' + Date.now(),
                permissions: permissions
            }, 'Login realizado com sucesso');
        } else {
            console.log('❌ Login inválido para tipo:', type);
            ResponseHelper.sendUnauthorized(res, 'Credenciais inválidas');
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        ResponseHelper.sendInternalError(res, error, 'login');
    }
});

module.exports = router; 