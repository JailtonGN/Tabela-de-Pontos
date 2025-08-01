/**
 * 🍞 Sistema de Notificações Toast - Módulo Centralizado
 * Refatoração DRY - Elimina duplicação de código entre arquivos
 */

window.ToastUtils = {
    /**
     * Exibe uma notificação toast
     * @param {string} title - Título da notificação
     * @param {string} message - Mensagem da notificação
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     */
    showToast: function(title, message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.warn('Toast container não encontrado. Adicione <div id="toast-container" class="toast-container"></div> ao HTML');
            return;
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
        
        container.appendChild(toast);
        
        // Mostrar toast com animação
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remover após 4 segundos
        setTimeout(() => this.closeToast(toast.querySelector('.toast-close')), 4000);
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
    success: function(title, message) {
        this.showToast(title, message, 'success');
    },

    error: function(title, message) {
        this.showToast(title, message, 'error');
    },

    warning: function(title, message) {
        this.showToast(title, message, 'warning');
    },

    info: function(title, message) {
        this.showToast(title, message, 'info');
    }
};

// Alias global para compatibilidade
window.showToast = window.ToastUtils.showToast.bind(window.ToastUtils);
window.closeToast = window.ToastUtils.closeToast.bind(window.ToastUtils);

console.log('🍞 ToastUtils carregado com sucesso!');
