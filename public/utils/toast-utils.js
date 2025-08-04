/**
 * 🍞 Sistema de Notificações Toast - Módulo Centralizado
 * Refatoração DRY - Elimina duplicação de código entre arquivos
 */

window.ToastUtils = {
    // Contador para evitar notificações duplicadas
    notificationCount: 0,
    lastNotifications: new Map(), // Cache das últimas notificações
    
    /**
     * Exibe uma notificação toast
     * @param {string} title - Título da notificação
     * @param {string} message - Mensagem da notificação
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duração em ms (padrão: 4000)
     */
    showToast: function(title, message, type = 'success', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.warn('Toast container não encontrado. Adicione <div id="toast-container" class="toast-container"></div> ao HTML');
            return;
        }
        
        // Verificar se é uma notificação duplicada recente
        const notificationKey = `${title}-${message}-${type}`;
        const now = Date.now();
        const lastTime = this.lastNotifications.get(notificationKey);
        
        // Se a mesma notificação foi exibida há menos de 2 segundos, ignorar
        if (lastTime && (now - lastTime) < 2000) {
            return;
        }
        
        // Atualizar cache
        this.lastNotifications.set(notificationKey, now);
        
        // Limpar cache antigo (mais de 10 segundos)
        for (const [key, time] of this.lastNotifications.entries()) {
            if (now - time > 10000) {
                this.lastNotifications.delete(key);
            }
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.success}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="ToastUtils.closeToast(this)">×</button>
        `;
        
        // Adicionar ao container
        container.appendChild(toast);
        
        // Mostrar toast com animação
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remover após duração especificada
        setTimeout(() => this.closeToast(toast.querySelector('.toast-close')), duration);
        
        // Limitar número máximo de toasts (máximo 3)
        const toasts = container.querySelectorAll('.toast');
        if (toasts.length > 3) {
            const oldestToast = toasts[0];
            this.closeToast(oldestToast.querySelector('.toast-close'));
        }
    },

    /**
     * Fecha uma notificação toast
     * @param {HTMLElement} button - Botão de fechar clicado
     */
    closeToast: function(button) {
        const toast = button.closest('.toast');
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    },

    /**
     * Métodos de conveniência para tipos específicos
     */
    success: function(title, message, duration) {
        this.showToast(title, message, 'success', duration);
    },

    error: function(title, message, duration) {
        this.showToast(title, message, 'error', duration);
    },

    warning: function(title, message, duration) {
        this.showToast(title, message, 'warning', duration);
    },

    info: function(title, message, duration) {
        this.showToast(title, message, 'info', duration);
    },

    /**
     * Limpa todas as notificações
     */
    clearAll: function() {
        const container = document.getElementById('toast-container');
        if (container) {
            const toasts = container.querySelectorAll('.toast');
            toasts.forEach(toast => {
                this.closeToast(toast.querySelector('.toast-close'));
            });
        }
    }
};

// Alias global para compatibilidade
window.showToast = window.ToastUtils.showToast.bind(window.ToastUtils);
window.closeToast = window.ToastUtils.closeToast.bind(window.ToastUtils);

console.log('🍞 ToastUtils carregado com sucesso!');
