/**
 * 🔄 StateManager - Centralização do gerenciamento de estado
 * 
 * Elimina duplicação na lógica de atualização dispersa
 * Fornece estado reativo com Observer pattern
 * 
 * @author Refatoração DRY - Tabela de Pontos
 * @version 1.0.0
 */

class StateManager {
    /**
     * Estado global da aplicação
     */
    static state = {
        filhos: [],
        historico: [],
        atividades: [],
        usuario: null,
        online: true,
        loading: false
    };

    /**
     * Observadores registrados para mudanças de estado
     */
    static observers = new Map();

    /**
     * Configurações do StateManager
     */
    static config = {
        autosave: true,
        syncWithServer: true,
        logStateChanges: false
    };

    /**
     * Inicializa o StateManager
     */
    static init() {
        console.log('🔄 StateManager inicializado');
        
        // Carregar dados iniciais
        this.loadInitialState();
        
        // Configurar salvamento automático
        if (this.config.autosave) {
            this.setupAutosave();
        }
        
        // Configurar sincronização com servidor
        if (this.config.syncWithServer) {
            this.setupServerSync();
        }
    }

    /**
     * Obtém valor do estado
     * @param {string} key - Chave do estado
     * @returns {any} Valor do estado
     */
    static get(key) {
        return this.state[key];
    }

    /**
     * Define valor do estado e notifica observadores
     * @param {string} key - Chave do estado
     * @param {any} value - Novo valor
     * @param {boolean} notify - Se deve notificar observadores (padrão: true)
     */
    static set(key, value, notify = true) {
        const oldValue = this.state[key];
        this.state[key] = value;

        if (this.config.logStateChanges) {
            console.log(`🔄 State change: ${key}`, { oldValue, newValue: value });
        }

        if (notify) {
            this.notifyObservers(key, value, oldValue);
        }

        // Salvamento automático
        if (this.config.autosave && ['filhos', 'historico', 'atividades'].includes(key)) {
            this.saveToLocalStorage(key);
        }
    }

    /**
     * Atualiza estado parcialmente
     * @param {Object} updates - Objeto com as atualizações
     */
    static update(updates) {
        for (const [key, value] of Object.entries(updates)) {
            this.set(key, value, false); // Não notificar individualmente
        }
        
        // Notificar observadores uma vez com todas as mudanças
        this.notifyObservers('*', updates);
    }

    /**
     * Registra observador para mudanças de estado
     * @param {string} key - Chave a observar ('*' para todas)
     * @param {Function} callback - Função callback
     * @param {string} id - ID único do observador (opcional)
     */
    static subscribe(key, callback, id = null) {
        if (!this.observers.has(key)) {
            this.observers.set(key, new Map());
        }

        const observerId = id || `observer_${Date.now()}_${Math.random()}`;
        this.observers.get(key).set(observerId, callback);

        // Retornar função para cancelar subscription
        return () => {
            if (this.observers.has(key)) {
                this.observers.get(key).delete(observerId);
            }
        };
    }

    /**
     * Remove observador
     * @param {string} key - Chave do observador
     * @param {string} id - ID do observador
     */
    static unsubscribe(key, id) {
        if (this.observers.has(key)) {
            this.observers.get(key).delete(id);
        }
    }

    /**
     * Notifica observadores sobre mudança
     * @param {string} key - Chave que mudou
     * @param {any} newValue - Novo valor
     * @param {any} oldValue - Valor anterior
     */
    static notifyObservers(key, newValue, oldValue = null) {
        // Notificar observadores específicos da chave
        if (this.observers.has(key)) {
            for (const callback of this.observers.get(key).values()) {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`❌ Erro em observer para '${key}':`, error);
                }
            }
        }

        // Notificar observadores globais (*)
        if (key !== '*' && this.observers.has('*')) {
            for (const callback of this.observers.get('*').values()) {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`❌ Erro em observer global:`, error);
                }
            }
        }
    }

    /**
     * Métodos específicos para filhos
     */
    static getFilhos() {
        return this.get('filhos') || [];
    }

    static adicionarFilho(filho) {
        const filhos = this.getFilhos();
        filhos.push(filho);
        this.set('filhos', filhos);
    }

    static atualizarFilho(id, updates) {
        const filhos = this.getFilhos();
        // ✨ CORREÇÃO: Usar == em vez de === para permitir conversão de tipos
        const index = filhos.findIndex(f => f.id == id);
        if (index !== -1) {
            filhos[index] = { ...filhos[index], ...updates };
            this.set('filhos', filhos);
        }
    }

    static encontrarFilho(id) {
        console.log('🔍 DEBUG StateManager: encontrarFilho() chamada com ID:', id, 'tipo:', typeof id);
        const filhos = this.getFilhos();
        console.log('🔍 DEBUG StateManager: Filhos disponíveis:', filhos);
        
        // Converter para número se for string
        const idNum = typeof id === 'string' ? parseInt(id) : id;
        console.log('🔍 DEBUG StateManager: ID convertido:', idNum);
        
        const filho = filhos.find(f => f.id == idNum);
        console.log('🔍 DEBUG StateManager: Filho encontrado:', filho);
        
        return filho;
    }

    /**
     * Métodos específicos para histórico
     */
    static getHistorico() {
        return this.get('historico') || [];
    }

    static adicionarHistorico(item) {
        const historico = this.getHistorico();
        historico.unshift(item);
        
        // Manter apenas os últimos 1000 itens
        if (historico.length > 1000) {
            historico.splice(1000);
        }
        
        this.set('historico', historico);
    }

    static limparHistorico() {
        this.set('historico', []);
    }

    /**
     * Métodos de persistência
     */
    static saveToLocalStorage(key = null) {
        try {
            if (key) {
                localStorage.setItem(`tabela_pontos_${key}`, JSON.stringify(this.get(key)));
            } else {
                // Salvar todo o estado
                for (const stateKey of Object.keys(this.state)) {
                    localStorage.setItem(`tabela_pontos_${stateKey}`, JSON.stringify(this.get(stateKey)));
                }
            }
        } catch (error) {
            console.error('❌ Erro ao salvar no localStorage:', error);
        }
    }

    static loadFromLocalStorage(key = null) {
        try {
            if (key) {
                const data = localStorage.getItem(`tabela_pontos_${key}`);
                return data ? JSON.parse(data) : null;
            } else {
                // Carregar todo o estado
                const loadedState = {};
                for (const stateKey of Object.keys(this.state)) {
                    const data = localStorage.getItem(`tabela_pontos_${stateKey}`);
                    if (data) {
                        loadedState[stateKey] = JSON.parse(data);
                    }
                }
                return loadedState;
            }
        } catch (error) {
            console.error('❌ Erro ao carregar do localStorage:', error);
            return null;
        }
    }

    /**
     * Carrega estado inicial
     */
    static loadInitialState() {
        const savedState = this.loadFromLocalStorage();
        if (savedState) {
            this.update(savedState);
            console.log('✅ Estado carregado do localStorage');
        }
    }

    /**
     * Configura salvamento automático
     */
    static setupAutosave() {
        // Salvar a cada 30 segundos
        setInterval(() => {
            this.saveToLocalStorage();
        }, 30000);

        // Salvar antes de fechar a página
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });
    }

    /**
     * Configura sincronização com servidor
     */
    static setupServerSync() {
        // Sincronizar quando volta online
        window.addEventListener('online', () => {
            this.set('online', true);
            this.syncWithServer();
        });

        window.addEventListener('offline', () => {
            this.set('online', false);
        });

        // Sincronização inicial
        this.syncWithServer();
    }

    /**
     * Sincroniza com servidor
     */
    static async syncWithServer() {
        if (!this.get('online')) return;

        try {
            this.set('loading', true);

            // Carregar dados do servidor via ApiService
            if (typeof ApiService !== 'undefined') {
                const pontosResult = await ApiService.get('/api/pontos');
                if (pontosResult.success) {
                    // Atualizar pontos dos filhos
                    const filhos = this.getFilhos();
                    const pontosData = pontosResult.data;
                    
                    filhos.forEach(filho => {
                        const pontos = pontosData[filho.nome?.toLowerCase()] || 0;
                        filho.pontos = pontos;
                    });
                    
                    this.set('filhos', filhos, false);
                }

                const historicoResult = await ApiService.get('/api/historico');
                if (historicoResult.success) {
                    this.set('historico', historicoResult.data, false);
                }
            }

            this.notifyObservers('*', this.state);
            console.log('✅ Sincronização com servidor concluída');
            
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
        } finally {
            this.set('loading', false);
        }
    }

    /**
     * Reset completo do estado
     */
    static reset() {
        this.state = {
            filhos: [],
            historico: [],
            atividades: [],
            usuario: null,
            online: navigator.onLine,
            loading: false
        };
        
        this.notifyObservers('*', this.state);
        this.saveToLocalStorage();
    }

    /**
     * Debug - mostra estado atual
     */
    static debug() {
        console.log('🔄 Estado atual:', this.state);
        console.log('👀 Observadores:', this.observers);
        return this.state;
    }

    /**
     * Configura StateManager
     * @param {Object} newConfig - Nova configuração
     */
    static configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ StateManager configurado:', this.config);
    }
}

// Exportar para uso global
window.StateManager = StateManager;

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        StateManager.init();
    });
} else {
    StateManager.init();
}

console.log('🔄 StateManager carregado - Estado centralizado!');
