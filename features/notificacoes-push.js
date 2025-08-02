// Service Worker para notificações
self.addEventListener('push', function(event) {
    const options = {
        body: event.data ? event.data.text() : 'Nova atualização nos pontos!',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver Pontos',
                icon: '/icon-explore.png'
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: '/icon-close.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Tabela de Pontos', options)
    );
});

// No frontend
async function solicitarPermissaoNotificacao() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Permissão para notificações concedida');
                return true;
            }
        } catch (error) {
            console.error('❌ Erro ao solicitar permissão:', error);
        }
    }
    return false;
}

function enviarNotificacao(titulo, mensagem) {
    if (Notification.permission === 'granted') {
        new Notification(titulo, {
            body: mensagem,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png'
        });
    }
}
