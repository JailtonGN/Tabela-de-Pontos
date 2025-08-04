/**
 * 🌐 Response Helper - Padronização de respostas da API
 * 
 * Elimina duplicação nas 20+ rotas do servidor
 * Fornece respostas consistentes e padronizadas
 * 
 * @author Refatoração DRY - Tabela de Pontos
 * @version 1.0.0
 */

class ResponseHelper {
    /**
     * Envia resposta de sucesso padronizada
     * @param {Response} res - Objeto response do Express
     * @param {any} data - Dados a serem enviados
     * @param {string} message - Mensagem de sucesso
     * @param {number} statusCode - Código de status (padrão: 200)
     */
    static sendSuccess(res, data = null, message = 'Operação realizada com sucesso', statusCode = 200) {
        const response = {
            success: true,
            message,
            timestamp: new Date().toISOString()
        };

        if (data !== null) {
            response.data = data;
        }

        console.log(`✅ Success Response (${statusCode}):`, message);
        return res.status(statusCode).json(response);
    }

    /**
     * Envia resposta de erro padronizada
     * @param {Response} res - Objeto response do Express
     * @param {string|Error} error - Erro ou mensagem de erro
     * @param {number} statusCode - Código de status (padrão: 400)
     * @param {any} details - Detalhes adicionais do erro
     */
    static sendError(res, error, statusCode = 400, details = null) {
        const errorMessage = error instanceof Error ? error.message : error;
        
        const response = {
            success: false,
            message: errorMessage,
            timestamp: new Date().toISOString()
        };

        if (details) {
            response.details = details;
        }

        console.error(`❌ Error Response (${statusCode}):`, errorMessage);
        
        // Log stack trace para errors internos
        if (error instanceof Error && statusCode >= 500) {
            console.error('Stack trace:', error.stack);
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Envia resposta de erro de validação
     * @param {Response} res - Objeto response do Express
     * @param {Array|Object} validationErrors - Erros de validação
     * @param {string} message - Mensagem personalizada
     */
    static sendValidationError(res, validationErrors, message = 'Dados inválidos') {
        const response = {
            success: false,
            message,
            errors: validationErrors,
            timestamp: new Date().toISOString()
        };

        console.warn(`⚠️ Validation Error:`, validationErrors);
        return res.status(422).json(response);
    }

    /**
     * Envia resposta de não autorizado
     * @param {Response} res - Objeto response do Express
     * @param {string} message - Mensagem de erro
     */
    static sendUnauthorized(res, message = 'Não autorizado') {
        return this.sendError(res, message, 401);
    }

    /**
     * Envia resposta de não encontrado
     * @param {Response} res - Objeto response do Express
     * @param {string} resource - Recurso não encontrado
     */
    static sendNotFound(res, resource = 'Recurso') {
        return this.sendError(res, `${resource} não encontrado`, 404);
    }

    /**
     * Envia resposta de erro interno do servidor
     * @param {Response} res - Objeto response do Express
     * @param {Error} error - Erro interno
     * @param {string} context - Contexto do erro
     */
    static sendInternalError(res, error, context = 'Operação') {
        const message = `Erro interno no servidor durante: ${context}`;
        return this.sendError(res, message, 500, {
            originalError: error.message,
            context
        });
    }

    /**
     * Middleware para capturar erros não tratados
     * @param {Error} error - Erro capturado
     * @param {Request} req - Objeto request
     * @param {Response} res - Objeto response
     * @param {Function} next - Próximo middleware
     */
    static errorHandler(error, req, res, next) {
        console.error('🚨 Erro não tratado capturado:', error);

        // Verificar se a resposta já foi enviada
        if (res.headersSent) {
            return next(error);
        }

        // Tipos específicos de erro
        if (error.name === 'ValidationError') {
            return ResponseHelper.sendValidationError(res, error.errors);
        }

        if (error.name === 'UnauthorizedError') {
            return ResponseHelper.sendUnauthorized(res, error.message);
        }

        if (error.name === 'CastError') {
            return ResponseHelper.sendError(res, 'ID inválido fornecido', 400);
        }

        // Erro genérico
        return ResponseHelper.sendInternalError(res, error, req.path);
    }

    /**
     * Middleware para rotas não encontradas
     * @param {Request} req - Objeto request
     * @param {Response} res - Objeto response
     */
    static notFoundHandler(req, res) {
        return ResponseHelper.sendNotFound(res, `Rota ${req.method} ${req.path}`);
    }

    /**
     * Envia resposta com dados paginados
     * @param {Response} res - Objeto response
     * @param {Array} data - Dados a serem paginados
     * @param {number} page - Página atual
     * @param {number} limit - Itens por página
     * @param {number} total - Total de itens
     */
    static sendPaginated(res, data, page, limit, total) {
        const totalPages = Math.ceil(total / limit);
        
        return this.sendSuccess(res, {
            items: data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    }

    /**
     * Middleware para logging de requests
     * @param {Request} req - Objeto request
     * @param {Response} res - Objeto response
     * @param {Function} next - Próximo middleware
     */
    static requestLogger(req, res, next) {
        const start = Date.now();
        const { method, url, ip } = req;
        
        console.log(`🌐 ${method} ${url} - IP: ${ip}`);
        
        // Override do res.json para logar response
        const originalJson = res.json;
        res.json = function(body) {
            const duration = Date.now() - start;
            const { statusCode } = res;
            
            console.log(`📤 ${method} ${url} - ${statusCode} - ${duration}ms`);
            return originalJson.call(this, body);
        };
        
        next();
    }
}

module.exports = ResponseHelper;
