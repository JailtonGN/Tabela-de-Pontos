// Adicionar ao server.js
const { Server } = require('socket.io');
const http = require('http');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Quando um cliente conecta
io.on('connection', (socket) => {
    console.log('👤 Cliente conectado:', socket.id);
    
    // Quando pontos são atualizados
    socket.on('pontos-atualizados', (data) => {
        // Enviar para todos os outros clientes
        socket.broadcast.emit('sincronizar-pontos', data);
        console.log('🔄 Pontos sincronizados para todos os clientes');
    });
    
    socket.on('disconnect', () => {
        console.log('👋 Cliente desconectado:', socket.id);
    });
});

// Usar server.listen em vez de app.listen
server.listen(PORT, () => {
    console.log('🚀 Servidor WebSocket rodando na porta', PORT);
});
