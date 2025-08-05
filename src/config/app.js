/**
 * ⚙️ CONFIGURAÇÕES CENTRALIZADAS
 * 
 * Todas as configurações da aplicação em um local centralizado
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

require('dotenv').config();

const config = {
    // Configurações do Servidor
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST", "PUT", "DELETE"],
            credentials: true
        }
    },

    // Configurações do MongoDB
    database: {
        uri: process.env.MONGODB_URI || 'mongodb+srv://tabela-pontos:TabelaPontos2025!@cluster0.nblesgu.mongodb.net/tabela-pontos?retryWrites=true&w=majority&appName=Cluster0&authSource=admin',
        options: {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            bufferCommands: true,
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    },

    // Configurações de Autenticação
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'chave_secreta_padrao_muito_insegura',
        jwtExpiresIn: '7d',
        sessionSecret: process.env.SESSION_SECRET || 'session_secret_padrao'
    },

    // Configurações de Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },

    // Configurações de WebSocket
    websocket: {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        pingTimeout: 60000,
        pingInterval: 25000
    },

    // Configurações de Logs
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableDebug: process.env.ENABLE_DEBUG_LOGS === 'true'
    },

    // Configurações de Features
    features: {
        websocket: process.env.ENABLE_WEBSOCKET !== 'false',
        pushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
        analytics: process.env.ENABLE_ANALYTICS !== 'false'
    },

    // Configurações de Segurança
    security: {
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "wss:", "ws:"]
                }
            }
        }
    }
};

module.exports = config; 