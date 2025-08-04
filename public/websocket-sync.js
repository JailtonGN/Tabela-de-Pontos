/**
 * 🔄 WebSocket Sync - Sincronização em tempo real
 * 
 * Implementa conexão WebSocket com o servidor para sincronização em tempo real
 * 
 * @author Refatoração DRY - Tabela de Pontos
 * @version 1.0.0
 */

// Configuração do Socket.IO
const SOCKET_CONFIG = {
    // Usar URL do servidor atual ou especificar manualmente
    serverUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' // Servidor local na porta 3000
        : window.location.origin, // Servidor de produção
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
};

// Elemento de status do WebSocket
const wsStatusElement = document.getElementById('websocket-status');

// Inicializar Socket.IO
var socket;

try {
    console.log('🔌 Conectando ao servidor WebSocket:', SOCKET_CONFIG.serverUrl);
    
    // Inicializar Socket.IO com a URL do servidor
    socket = io(SOCKET_CONFIG.serverUrl, {
        reconnectionAttempts: SOCKET_CONFIG.reconnectionAttempts,
        reconnectionDelay: SOCKET_CONFIG.reconnectionDelay,
        timeout: SOCKET_CONFIG.timeout
    });
    
    // Eventos do Socket.IO
    socket.on('connect', () => {
        console.log('✅ WebSocket conectado! ID:', socket.id);
        updateSocketStatus('connected', '🟢 Conectado');
        
        // Solicitar dados atuais ao conectar
        socket.emit('solicitar-dados');
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão WebSocket:', error);
        updateSocketStatus('disconnected', '🔴 Erro de conexão');
    });
    
    socket.on('disconnect', (reason) => {
        console.warn('⚠️ WebSocket desconectado:', reason);
        updateSocketStatus('disconnected', '🔴 Desconectado');
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Tentativa de reconexão ${attemptNumber}/${SOCKET_CONFIG.reconnectionAttempts}`);
        updateSocketStatus('connecting', `🟠 Reconectando (${attemptNumber})`);
    });
    
    socket.on('reconnect_failed', () => {
        console.error('❌ Falha na reconexão após várias tentativas');
        updateSocketStatus('disconnected', '🔴 Falha na reconexão');
    });
    
    // Eventos específicos da aplicação
    socket.on('dados-atuais', (dados) => {
        console.log('📊 Dados recebidos via WebSocket:', dados);
        
        // Atualizar estado via StateManager
        if (window.StateManager) {
            const filhos = StateManager.getFilhos();
            
            // Atualizar pontos dos filhos
            filhos.forEach(filho => {
                const pontos = dados[filho.nome?.toLowerCase()] || 0;
                filho.pontos = pontos;
            });
            
            StateManager.set('filhos', filhos);
        }
    });
    
    socket.on('atualizar-pontos', (dados) => {
        console.log('🔄 Atualização de pontos recebida:', dados);
        
        // Atualizar estado via StateManager
        if (window.StateManager) {
            const filhos = StateManager.getFilhos();
            
            // Atualizar pontos do filho específico
            const filho = filhos.find(f => f.nome.toLowerCase() === dados.nome.toLowerCase());
            if (filho) {
                filho.pontos = dados.pontos;
                StateManager.set('filhos', filhos);
                
                // Mostrar notificação
                if (typeof mostrarNotificacao === 'function') {
                    mostrarNotificacao(`🔄 Pontos de ${dados.nome} atualizados para ${dados.pontos}`, 'info');
                }
            }
        }
    });
    
    socket.on('atualizar-historico', (dados) => {
        console.log('📋 Atualização de histórico recebida:', dados);
        
        // Atualizar estado via StateManager
        if (window.StateManager) {
            const historico = StateManager.get('historico');
            historico.unshift(dados);
            StateManager.set('historico', historico);
        }
    });
    
    // ✨ NOVOS EVENTOS: Sincronização de Lembretes
    socket.on('lembrete-novo', (lembrete) => {
        console.log('📝 Novo lembrete recebido:', lembrete);
        
        // Atualizar lembretes locais
        if (window.lembretes) {
            window.lembretes.unshift(lembrete);
            
            // Se a função de renderização existe, atualizar interface
            if (typeof renderizarLembretes === 'function') {
                renderizarLembretes();
                atualizarContadorLembretes();
            }
            
            // Mostrar notificação
            if (typeof mostrarNotificacao === 'function') {
                mostrarNotificacao(`📝 Novo lembrete de ${lembrete.crianca}!`, 'info');
            }
        }
    });
    
    socket.on('lembrete-lido', (lembrete) => {
        console.log('✅ Lembrete marcado como lido:', lembrete);
        
        // Atualizar lembrete local
        if (window.lembretes) {
            const index = window.lembretes.findIndex(l => l.id === lembrete.id);
            if (index !== -1) {
                window.lembretes[index] = lembrete;
                
                // Se a função de renderização existe, atualizar interface
                if (typeof renderizarLembretes === 'function') {
                    renderizarLembretes();
                    atualizarContadorLembretes();
                }
            }
        }
    });
    
    socket.on('lembretes-limpos', (dados) => {
        console.log('🧹 Lembretes limpos:', dados);
        
        // Remover lembretes lidos do array local
        if (window.lembretes) {
            window.lembretes = window.lembretes.filter(l => !l.lido);
            
            // Se a função de renderização existe, atualizar interface
            if (typeof renderizarLembretes === 'function') {
                renderizarLembretes();
                atualizarContadorLembretes();
            }
            
            // Mostrar notificação
            if (typeof mostrarNotificacao === 'function') {
                mostrarNotificacao(`🧹 ${dados.removidos} lembretes lidos removidos!`, 'success');
            }
        }
    });
    
} catch (error) {
    console.error('❌ Erro ao inicializar WebSocket:', error);
    updateSocketStatus('disconnected', '🔴 Erro de inicialização');
}

/**
 * Atualiza o status do WebSocket na interface
 * @param {string} status - Status da conexão ('connected', 'connecting', 'disconnected')
 * @param {string} message - Mensagem a ser exibida
 */
function updateSocketStatus(status, message) {
    if (!wsStatusElement) return;
    
    // Remover classes anteriores
    wsStatusElement.classList.remove('connected', 'connecting', 'disconnected');
    
    // Adicionar classe atual
    wsStatusElement.classList.add(status);
    
    // Atualizar texto
    wsStatusElement.textContent = message;
}

/**
 * Envia atualização de pontos para outros clientes
 * @param {Object} dados - Dados da atualização
 */
function sincronizarPontos(dados) {
    if (!socket || !socket.connected) {
        console.warn('⚠️ WebSocket não conectado, não foi possível sincronizar pontos');
        return;
    }
    
    console.log('📤 Enviando atualização de pontos:', dados);
    socket.emit('pontos-alterados', dados);
}

/**
 * Envia atualização de histórico para outros clientes
 * @param {Object} dados - Dados da atualização
 */
function sincronizarHistorico(dados) {
    if (!socket || !socket.connected) {
        console.warn('⚠️ WebSocket não conectado, não foi possível sincronizar histórico');
        return;
    }
    
    console.log('📤 Enviando atualização de histórico:', dados);
    socket.emit('historico-alterado', dados);
}

// Exportar funções para uso global
window.WebSocketSync = {
    getSocket: () => socket,
    sincronizarPontos,
    sincronizarHistorico
};

console.log('🔄 WebSocket Sync carregado - Sincronização em tempo real!');