/**
 * 🎭 EventManager - Centralização do gerenciamento de eventos
 * 
 * Elimina duplicação de código nos 20+ event listeners
 * Fornece controle centralizado e prevenção de múltiplos listeners
 * 
 * @author Refatoração DRY - Tabela de Pontos
 * @version 1.0.0
 */

class EventManager {
    /**
     * Registry de todos os event listeners ativos
     */
    static listeners = new Map();

    /**
     * Configurações padrão
     */
    static config = {
        logEvents: false,
        preventDuplicates: true,
        debounceDefault: 300
    };

    /**
     * Adiciona event listener com controle de duplicatas
     * @param {string} selector - Seletor CSS ou ID do elemento
     * @param {string} event - Tipo de evento ('click', 'submit', etc.)
     * @param {Function} handler - Função handler
     * @param {Object} options - Opções do listener
     */
    static addEventListener(selector, event, handler, options = {}) {
        const key = `${selector}:${event}`;
        
        if (this.config.logEvents) {
            console.log(`🎭 EventManager.addEventListener('${selector}', '${event}')`);
        }

        // Prevenir duplicatas se configurado
        if (this.config.preventDuplicates && this.listeners.has(key)) {
            console.warn(`⚠️ Event listener duplicado ignorado: ${key}`);
            return false;
        }

        const element = this.getElement(selector);
        if (!element) {
            console.warn(`⚠️ Elemento não encontrado: ${selector}`);
            return false;
        }

        // Aplicar debounce se especificado
        let finalHandler = handler;
        if (options.debounce) {
            finalHandler = this.debounce(handler, options.debounce);
        }

        // Wrapper para logging e error handling
        const wrappedHandler = (e) => {
            try {
                if (this.config.logEvents) {
                    console.log(`🎯 Event triggered: ${key}`);
                }
                return finalHandler(e);
            } catch (error) {
                console.error(`❌ Error in event handler ${key}:`, error);
                if (typeof mostrarNotificacao === 'function') {
                    mostrarNotificacao('❌ Erro interno na aplicação', 'error');
                }
            }
        };

        element.addEventListener(event, wrappedHandler, options);
        
        // Armazenar referência para remoção posterior
        this.listeners.set(key, {
            element,
            event,
            handler: wrappedHandler,
            originalHandler: handler,
            options,
            selector
        });

        return true;
    }

    /**
     * Adiciona click handler de forma simplificada
     * @param {string} selector - Seletor do elemento
     * @param {Function} handler - Função handler
     * @param {Object} options - Opções adicionais
     */
    static addClickHandler(selector, handler, options = {}) {
        return this.addEventListener(selector, 'click', handler, options);
    }

    /**
     * Adiciona submit handler para formulário
     * @param {string} formSelector - Seletor do formulário
     * @param {Function} handler - Função handler
     * @param {Object} options - Opções adicionais
     */
    static addFormSubmitHandler(formSelector, handler, options = {}) {
        const wrappedHandler = (e) => {
            e.preventDefault(); // Prevenir submit padrão
            return handler(e);
        };
        
        return this.addEventListener(formSelector, 'submit', wrappedHandler, options);
    }

    /**
     * Adiciona change handler para inputs
     * @param {string} selector - Seletor do input
     * @param {Function} handler - Função handler
     * @param {Object} options - Opções adicionais
     */
    static addChangeHandler(selector, handler, options = {}) {
        return this.addEventListener(selector, 'change', handler, options);
    }

    /**
     * Remove event listener específico
     * @param {string} selector - Seletor do elemento
     * @param {string} event - Tipo de evento
     */
    static removeEventListener(selector, event) {
        const key = `${selector}:${event}`;
        const listenerData = this.listeners.get(key);
        
        if (listenerData) {
            listenerData.element.removeEventListener(
                listenerData.event, 
                listenerData.handler, 
                listenerData.options
            );
            this.listeners.delete(key);
            
            if (this.config.logEvents) {
                console.log(`🗑️ Event listener removido: ${key}`);
            }
            return true;
        }
        
        return false;
    }

    /**
     * Remove todos os event listeners
     */
    static removeAllListeners() {
        let removed = 0;
        
        for (const [key, listenerData] of this.listeners.entries()) {
            listenerData.element.removeEventListener(
                listenerData.event, 
                listenerData.handler, 
                listenerData.options
            );
            removed++;
        }
        
        this.listeners.clear();
        console.log(`🗑️ ${removed} event listeners removidos`);
        return removed;
    }

    /**
     * Obtém elemento por seletor (ID ou CSS selector)
     * @param {string} selector - Seletor do elemento
     * @returns {HTMLElement|null} Elemento encontrado
     */
    static getElement(selector) {
        // ✨ CORREÇÃO: Verificar se selector é string
        if (!selector || typeof selector !== 'string') {
            console.warn('⚠️ EventManager.getElement: selector deve ser uma string:', selector);
            return null;
        }
        
        if (selector.startsWith('#')) {
            return document.getElementById(selector.slice(1));
        } else if (selector.startsWith('.') || selector.includes(' ')) {
            return document.querySelector(selector);
        } else if (selector === 'body') {
            // ✨ CORREÇÃO: Tratamento especial para body
            return document.body;
        } else if (selector === 'html') {
            // ✨ CORREÇÃO: Tratamento especial para html
            return document.documentElement;
        } else {
            // Assumir que é um ID sem #
            return document.getElementById(selector);
        }
    }

    /**
     * Implementa debounce para eventos frequentes
     * @param {Function} func - Função a ser debounced
     * @param {number} delay - Delay em millisegundos
     * @returns {Function} Função debounced
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Adiciona múltiplos event listeners de uma vez
     * @param {Array} eventConfigs - Array de configurações [{selector, event, handler, options}]
     */
    static addMultipleListeners(eventConfigs) {
        let added = 0;
        
        eventConfigs.forEach(config => {
            if (this.addEventListener(config.selector, config.event, config.handler, config.options)) {
                added++;
            }
        });
        
        console.log(`🎭 ${added} event listeners adicionados em lote`);
        return added;
    }

    /**
     * Delegação de eventos para elementos dinâmicos
     * @param {string} parentSelector - Seletor do elemento pai
     * @param {string} childSelector - Seletor dos filhos que receberão o evento
     * @param {string} event - Tipo de evento
     * @param {Function} handler - Função handler
     */
    static delegateEvent(parentSelector, childSelector, event, handler) {
        const parentElement = this.getElement(parentSelector);
        if (!parentElement) {
            console.warn(`⚠️ Elemento pai não encontrado: ${parentSelector}`);
            return false;
        }

        const delegatedHandler = (e) => {
            if (e.target.matches(childSelector)) {
                try {
                    return handler(e);
                } catch (error) {
                    console.error(`❌ Error in delegated event handler:`, error);
                }
            }
        };

        parentElement.addEventListener(event, delegatedHandler);
        
        const key = `${parentSelector}>${childSelector}:${event}`;
        this.listeners.set(key, {
            element: parentElement,
            event,
            handler: delegatedHandler,
            selector: parentSelector,
            delegated: true,
            childSelector
        });

        return true;
    }

    /**
     * Obtém estatísticas dos event listeners
     * @returns {Object} Estatísticas
     */
    static getStats() {
        const stats = {
            total: this.listeners.size,
            byEvent: {},
            byElement: {}
        };

        for (const [key, data] of this.listeners.entries()) {
            // Contar por tipo de evento
            stats.byEvent[data.event] = (stats.byEvent[data.event] || 0) + 1;
            
            // Contar por elemento
            stats.byElement[data.selector] = (stats.byElement[data.selector] || 0) + 1;
        }

        return stats;
    }

    /**
     * Lista todos os event listeners ativos
     * @returns {Array} Lista de listeners
     */
    static listActiveListeners() {
        return Array.from(this.listeners.entries()).map(([key, data]) => ({
            key,
            selector: data.selector,
            event: data.event,
            delegated: data.delegated || false
        }));
    }

    /**
     * Configura EventManager
     * @param {Object} newConfig - Nova configuração
     */
    static configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ EventManager configurado:', this.config);
    }

    /**
     * Inicializa event listeners padrão da aplicação
     */
    static initializeDefaultListeners() {
        console.log('🎭 Inicializando event listeners padrão...');
        
        // ✨ CORREÇÃO: Removido listener para button[type="submit"] que não existe
        // Listeners comuns podem ser adicionados aqui conforme necessário
        const commonListeners = [];

        this.addMultipleListeners(commonListeners);
    }
}

// Exportar para uso global
window.EventManager = EventManager;

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        EventManager.initializeDefaultListeners();
    });
} else {
    EventManager.initializeDefaultListeners();
}

console.log('🎭 EventManager carregado - Duplicação de eventos eliminada!');
