/**
 * 🛡️ MIDDLEWARE DE SEGURANÇA
 * 
 * Middleware centralizado para todas as configurações de segurança
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config/app');

/**
 * Configuração de Rate Limiting
 */
const createRateLimiter = (windowMs, maxRequests, message = 'Muitas requisições, tente novamente mais tarde.') => {
    return rateLimit({
        windowMs,
        max: maxRequests,
        message: {
            error: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: message,
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    });
};

/**
 * Rate Limiter para API
 */
const apiRateLimiter = createRateLimiter(
    config.rateLimit.windowMs,
    config.rateLimit.maxRequests,
    'Limite de requisições da API excedido.'
);

/**
 * Rate Limiter para login
 */
const loginRateLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    5, // 5 tentativas
    'Muitas tentativas de login. Tente novamente em 15 minutos.'
);

/**
 * Configuração do Helmet
 */
const helmetConfig = helmet({
    contentSecurityPolicy: config.security.helmet.contentSecurityPolicy,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * Middleware de CORS otimizado
 */
const corsConfig = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.server.cors.origin);
    res.header('Access-Control-Allow-Methods', config.server.cors.methods.join(', '));
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', config.server.cors.credentials);
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};

/**
 * Middleware de Headers de Segurança
 */
const securityHeaders = (req, res, next) => {
    // Headers de segurança adicionais
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
};

/**
 * Middleware de Log de Requisições
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMessage = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
        
        if (config.logging.enableDebug) {
            console.log(`📝 ${logMessage}`);
        }
        
        // Log de erros
        if (res.statusCode >= 400) {
            console.error(`❌ ${logMessage}`);
        }
    });
    
    next();
};

/**
 * Middleware de Tratamento de Erros
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Erro na aplicação:', err);
    
    // Erro de validação do Mongoose
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            details: Object.values(err.errors).map(e => e.message)
        });
    }
    
    // Erro de cast do MongoDB
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: 'ID inválido'
        });
    }
    
    // Erro de duplicação
    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            error: 'Dados já existem'
        });
    }
    
    // Erro genérico
    res.status(err.status || 500).json({
        success: false,
        error: config.server.env === 'production' ? 'Erro interno do servidor' : err.message
    });
};

/**
 * Middleware de Validação de JSON
 */
const validateJSON = (err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'JSON inválido'
        });
    }
    next();
};

module.exports = {
    helmetConfig,
    corsConfig,
    securityHeaders,
    apiRateLimiter,
    loginRateLimiter,
    requestLogger,
    errorHandler,
    validateJSON
}; 