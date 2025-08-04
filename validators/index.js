/**
 * 🔍 Validators - Middleware de validação para APIs
 * 
 * Elimina duplicação nas validações das rotas
 * Fornece validação consistente e padronizada
 * 
 * @author Refatoração DRY - Tabela de Pontos
 * @version 1.0.0
 */

const ResponseHelper = require('../utils/response-helper');

class Validators {
    /**
     * Valida dados de pontos (adicionar/remover)
     * @param {Request} req - Objeto request
     * @param {Response} res - Objeto response
     * @param {Function} next - Próximo middleware
     */
    static validatePontosData(req, res, next) {
        const { nome, pontos, atividade } = req.body;
        const errors = [];

        // Validar nome
        if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
            errors.push('Nome é obrigatório e deve ser uma string válida');
        }

        // Validar pontos
        if (pontos === undefined || pontos === null) {
            errors.push('Pontos é obrigatório');
        } else if (!Number.isInteger(pontos) || pontos <= 0) {
            errors.push('Pontos deve ser um número inteiro positivo');
        } else if (pontos > 1000) {
            errors.push('Pontos não pode ser maior que 1000');
        }

        // Validar atividade
        if (!atividade || typeof atividade !== 'string' || atividade.trim().length === 0) {
            errors.push('Atividade/motivo é obrigatória');
        } else if (atividade.trim().length > 200) {
            errors.push('Atividade/motivo não pode ter mais de 200 caracteres');
        }

        if (errors.length > 0) {
            return ResponseHelper.sendValidationError(res, errors);
        }

        // Normalizar dados
        req.body.nome = nome.trim();
        req.body.atividade = atividade.trim();

        next();
    }

    /**
     * Valida dados de histórico individual
     * @param {Request} req - Objeto request
     * @param {Response} res - Objeto response
     * @param {Function} next - Próximo middleware
     */
    static validateHistoricoData(req, res, next) {
        const { action, crianca, pontos, data } = req.body;
        const errors = [];

        // Validar action
        if (!action || typeof action !== 'string' || action.trim().length === 0) {
            errors.push('Action é obrigatória e deve ser uma string válida');
        } else if (!['adicionar', 'remover', 'resetar'].includes(action.toLowerCase())) {
            errors.push('Action deve ser "adicionar", "remover" ou "resetar"');
        }

        // Validar criança
        if (!crianca || typeof crianca !== 'string' || crianca.trim().length === 0) {
            errors.push('Criança é obrigatória e deve ser uma string válida');
        } else if (crianca.trim().length > 50) {
            errors.push('Nome da criança não pode ter mais de 50 caracteres');
        }

        // Validar pontos
        if (pontos === undefined || pontos === null) {
            errors.push('Pontos é obrigatório');
        } else if (!Number.isInteger(pontos)) {
            errors.push('Pontos deve ser um número inteiro');
        } else if (Math.abs(pontos) > 1000) {
            errors.push('Pontos não pode ser maior que 1000 em valor absoluto');
        }

        // Validar data (opcional)
        if (data && !Date.parse(data)) {
            errors.push('Data deve estar em formato válido');
        }

        if (errors.length > 0) {
            return ResponseHelper.sendValidationError(res, errors);
        }

        // Normalizar dados
        req.body.action = action.trim().toLowerCase();
        req.body.crianca = crianca.trim();

        next();
    }

    /**
     * Valida dados de histórico em lote (array)
     * @param {Request} req - Objeto request
     * @param {Response} res - Objeto response
     * @param {Function} next - Próximo middleware
     */
    static validateHistoricoLoteData(req, res, next) {
        const { historico } = req.body;
        const errors = [];

        if (!historico) {
            errors.push('Histórico é obrigatório');
        } else if (!Array.isArray(historico)) {
            errors.push('Histórico deve ser um array');
        } else if (historico.length > 10000) {
            errors.push('Histórico muito grande (máximo 10.000 itens)');
        } else {
            // Validar estrutura de cada item do histórico
            for (let i = 0; i < Math.min(historico.length, 100); i++) { // Validar apenas primeiros 100 itens
                const item = historico[i];
                
                if (!item.data || !item.acao || !item.nome) {
                    errors.push(`Item ${i + 1} do histórico está incompleto (falta data, acao ou nome)`);
                    break;
                }

                if (typeof item.acao !== 'string' || item.acao.trim().length === 0) {
                    errors.push(`Item ${i + 1} do histórico tem ação inválida`);
                    break;
                }

                if (typeof item.nome !== 'string' || item.nome.trim().length === 0) {
                    errors.push(`Item ${i + 1} do histórico tem nome inválido`);
                    break;
                }
            }
        }

        if (errors.length > 0) {
            return ResponseHelper.sendValidationError(res, errors);
        }

        next();
    }

    /**
     * Middleware de validação de autenticação simples
     * @param {Request} req - Objeto request
     * @param {Response} res - Objeto response
     * @param {Function} next - Próximo middleware
     */
    static validateAuth(req, res, next) {
        const authHeader = req.headers.authorization;
        
        // Para este projeto simples, vamos apenas verificar se há algum token
        // Em um projeto real, isso seria mais robusto
        if (!authHeader && req.path !== '/api/health' && !req.path.includes('/api/')) {
            return ResponseHelper.sendUnauthorized(res, 'Token de autorização necessário');
        }

        next();
    }

    /**
     * Valida parâmetros de consulta para listagem
     * @param {Request} req - Objeto request
     * @param {Response} res - Objeto response
     * @param {Function} next - Próximo middleware
     */
    static validateQueryParams(req, res, next) {
        const { page, limit, sortBy, order } = req.query;
        const errors = [];

        // Validar página
        if (page && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
            errors.push('Página deve ser um número inteiro positivo');
        }

        // Validar limite
        if (limit && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
            errors.push('Limite deve ser um número entre 1 e 100');
        }

        // Validar ordenação
        if (order && !['asc', 'desc'].includes(order.toLowerCase())) {
            errors.push('Ordem deve ser "asc" ou "desc"');
        }

        if (errors.length > 0) {
            return ResponseHelper.sendValidationError(res, errors);
        }

        // Normalizar parâmetros
        if (page) req.query.page = parseInt(page);
        if (limit) req.query.limit = parseInt(limit);
        if (order) req.query.order = order.toLowerCase();

        // Valores padrão
        req.query.page = req.query.page || 1;
        req.query.limit = req.query.limit || 50;
        req.query.order = req.query.order || 'desc';

        next();
    }

    /**
     * Valida IDs de parâmetros
     * @param {string} paramName - Nome do parâmetro a validar
     * @returns {Function} Middleware de validação
     */
    static validateId(paramName = 'id') {
        return (req, res, next) => {
            const id = req.params[paramName];
            
            if (!id) {
                return ResponseHelper.sendError(res, `Parâmetro ${paramName} é obrigatório`, 400);
            }

            // Para MongoDB ObjectId
            if (!/^[0-9a-fA-F]{24}$/.test(id)) {
                return ResponseHelper.sendError(res, `${paramName} inválido`, 400);
            }

            next();
        };
    }

    /**
     * Sanitiza dados de entrada
     * @param {Request} req - Objeto request
     * @param {Response} res - Objeto response
     * @param {Function} next - Próximo middleware
     */
    static sanitizeInput(req, res, next) {
        // Função helper para sanitizar strings
        const sanitizeString = (str) => {
            if (typeof str !== 'string') return str;
            
            return str
                .trim()
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .substring(0, 1000); // Limita tamanho
        };

        // Sanitizar body
        if (req.body && typeof req.body === 'object') {
            for (const key in req.body) {
                if (typeof req.body[key] === 'string') {
                    req.body[key] = sanitizeString(req.body[key]);
                }
            }
        }

        // Sanitizar query params
        if (req.query && typeof req.query === 'object') {
            for (const key in req.query) {
                if (typeof req.query[key] === 'string') {
                    req.query[key] = sanitizeString(req.query[key]);
                }
            }
        }

        next();
    }

    /**
     * Middleware de rate limiting simples
     * @param {number} maxRequests - Máximo de requisições
     * @param {number} windowMs - Janela de tempo em ms
     * @returns {Function} Middleware de rate limiting
     */
    static rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) { // 15 minutos
        const requests = new Map();

        return (req, res, next) => {
            const clientIP = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            const windowStart = now - windowMs;

            // Limpar requests antigas
            if (requests.has(clientIP)) {
                const clientRequests = requests.get(clientIP).filter(time => time > windowStart);
                requests.set(clientIP, clientRequests);
            }

            // Verificar limite
            const currentRequests = requests.get(clientIP) || [];
            if (currentRequests.length >= maxRequests) {
                return ResponseHelper.sendError(res, 'Muitas requisições. Tente novamente em alguns minutos.', 429);
            }

            // Adicionar nova requisição
            currentRequests.push(now);
            requests.set(clientIP, currentRequests);

            next();
        };
    }
}

module.exports = Validators;
