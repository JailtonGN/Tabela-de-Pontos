// WebSocket para sincronização em tempo real
let socket = null;

// Conectar ao WebSocket quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    iniciarWebSocket();
});

function iniciarWebSocket() {
    try {
        // Conectar ao servidor WebSocket
        socket = io();
        
        socket.on('connect', () => {
            console.log('🔄 Conectado ao WebSocket');
            showToast('🔄 Sincronização em tempo real ativada!', 'success');
            
            // Solicitar dados atuais
            socket.emit('solicitar-dados');
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Desconectado do WebSocket');
            showToast('⚠️ Sincronização offline', 'warning');
        });
        
        // Escutar atualizações de pontos em tempo real
        socket.on('atualizar-pontos', (dados) => {
            console.log('📡 Recebido:', dados);
            
            // Atualizar interface automaticamente
            atualizarInterfaceEmTempoReal(dados);
            
            // Mostrar notificação
            mostrarNotificacaoSincronizacao(dados);
        });
        
        // Receber dados atuais quando conectar
        socket.on('dados-atuais', (dados) => {
            console.log('📊 Dados atuais recebidos:', dados);
            // Opcional: atualizar interface se necessário
        });
        
        socket.on('atualizar-historico', (dados) => {
            console.log('📋 Histórico atualizado:', dados);
            // Recarregar histórico se a tela estiver aberta
            if (typeof carregarHistorico === 'function') {
                carregarHistorico();
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao conectar WebSocket:', error);
    }
}

// Atualizar interface em tempo real
function atualizarInterfaceEmTempoReal(dados) {
    // Atualizar pontos na tela
    const pontosElement = document.querySelector(`[data-nome="${dados.nome}"]`);
    if (pontosElement) {
        pontosElement.textContent = dados.novoTotal;
        
        // Adicionar animação
        pontosElement.classList.add('pontos-atualizados');
        setTimeout(() => {
            pontosElement.classList.remove('pontos-atualizados');
        }, 1000);
    }
    
    // Recarregar dados completos para garantir sincronia
    setTimeout(() => {
        if (typeof carregarPontos === 'function') {
            carregarPontos();
        }
    }, 500);
}

// Mostrar notificação de sincronização
function mostrarNotificacaoSincronizacao(dados) {
    const emoji = dados.tipo === 'adicionar' ? '➕' : '➖';
    const acao = dados.tipo === 'adicionar' ? 'ganhou' : 'perdeu';
    const motivo = dados.atividade || dados.motivo || '';
    
    const mensagem = `${emoji} ${dados.nome.toUpperCase()} ${acao} ${dados.pontos} pontos`;
    const detalhes = motivo ? `\n${motivo}` : '';
    
    showToast(mensagem + detalhes, 'info', 4000);
    
    // Vibração no dispositivo se suportado
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Notificar outros dispositivos quando alterar pontos localmente
function notificarAlteracaoPontos(dados) {
    if (socket && socket.connected) {
        socket.emit('pontos-alterados', dados);
        console.log('📡 Enviado para outros dispositivos:', dados);
    }
}

// Interceptar funções de adicionar/remover pontos existentes
// para adicionar notificação WebSocket

// Sobrescrever função de adicionar pontos
const adicionarPontosOriginal = window.adicionarPontos;
window.adicionarPontos = function(nome, pontos, atividade) {
    // Chamar função original
    const resultado = adicionarPontosOriginal?.call(this, nome, pontos, atividade);
    
    // Notificar outros dispositivos
    notificarAlteracaoPontos({
        tipo: 'adicionar',
        nome: nome,
        pontos: pontos,
        atividade: atividade,
        timestamp: new Date().toISOString()
    });
    
    return resultado;
};

// Sobrescrever função de remover pontos
const removerPontosOriginal = window.removerPontos;
window.removerPontos = function(nome, pontos, motivo) {
    // Chamar função original
    const resultado = removerPontosOriginal?.call(this, nome, pontos, motivo);
    
    // Notificar outros dispositivos
    notificarAlteracaoPontos({
        tipo: 'remover',
        nome: nome,
        pontos: pontos,
        motivo: motivo,
        timestamp: new Date().toISOString()
    });
    
    return resultado;
};
