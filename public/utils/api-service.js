/**
 * 🔧 ApiService - Centralização de todas as chamadas de API
 * 
 * Elimina duplicação de código nas 16+ chamadas fetch identificadas
 * Fornece tratamento consistente de responses, errors e fallback offline
 * 
 * @author Refatoração DRY - Tabela de Pontos
 * @version 1.0.0
 */

class ApiService {
    /**
     * Configurações padrão para requisições
     */
    static defaultHeaders = {
        'Content-Type': 'application/json'
    };

    /**
     * Timeout padrão para requisições (10 segundos)
     */
    static defaultTimeout = 10000;

    /**
     * Executa operação de pontos (adicionar ou remover)
     * @param {string} operation - 'adicionar' ou 'remover'
     * @param {Object} data - Dados da operação {nome, pontos, atividade}
     * @returns {Promise<Object>} Resultado da operação
     */
    static async pontosOperation(operation, data) {
        console.log(`🔍 DEBUG: ApiService.pontosOperation(${operation})`, data);
        return this.post(`/api/pontos/${operation}`, data);
    }

    /**
     * Salva histórico no servidor - TEMPORARIAMENTE DESABILITADO
     * @param {Object} historico - Dados do histórico
     * @returns {Promise<Object>} Resultado da operação
     */
    static async salvarHistorico(historico) {
        // ✨ REFATORADO: Salvamento individual com mapeamento correto de campos
        return this.post('/api/historico', {
            action: historico.tipo || 'adicionar',
            crianca: historico.nome || historico.crianca,
            pontos: historico.pontos,
            motivo: historico.motivo || historico.atividade,
            data: new Date().toISOString()
        });
    }

    /**
     * Carrega dados do servidor
     * @returns {Promise<Object>} Dados carregados
     */
    static async carregarDados() {
        console.log('🔍 DEBUG: ApiService.carregarDados()');
        return this.get('/api/dados');
    }

    /**
     * Executa requisição POST
     * @param {string} endpoint - Endpoint da API
     * @param {Object} data - Dados a serem enviados
     * @returns {Promise<Object>} Resultado da requisição
     */
    static async post(endpoint, data) {
        try {
            console.log(`📡 API POST: ${endpoint}`, data);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: this.defaultHeaders,
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return await this.handleResponse(response);
            
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Executa requisição GET
     * @param {string} endpoint - Endpoint da API
     * @returns {Promise<Object>} Resultado da requisição
     */
    static async get(endpoint) {
        try {
            console.log(`📡 API GET: ${endpoint}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: this.defaultHeaders,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return await this.handleResponse(response);
            
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Executa requisição PUT
     * @param {string} endpoint - Endpoint da API
     * @param {Object} data - Dados a serem enviados
     * @returns {Promise<Object>} Resultado da requisição
     */
    static async put(endpoint, data) {
        try {
            console.log(`📡 API PUT: ${endpoint}`, data);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: this.defaultHeaders,
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return await this.handleResponse(response);
            
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Executa requisição DELETE
     * @param {string} endpoint - Endpoint da API
     * @returns {Promise<Object>} Resultado da requisição
     */
    static async delete(endpoint) {
        try {
            console.log(`📡 API DELETE: ${endpoint}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: this.defaultHeaders,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return await this.handleResponse(response);
            
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Processa resposta da API de forma padronizada
     * @param {Response} response - Resposta fetch
     * @returns {Promise<Object>} Dados processados
     */
    static async handleResponse(response) {
        try {
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ API Success:', data);
                
                // Notificação automática de sucesso se mensagem fornecida
                if (data.message && typeof mostrarNotificacao === 'function') {
                    mostrarNotificacao(`✅ ${data.message}`, 'success');
                }
                
                return {
                    success: true,
                    data: data.data || data,
                    message: data.message,
                    online: true
                };
            } else {
                console.warn('⚠️ API Error:', data);
                
                // Notificação automática de erro
                if (typeof mostrarNotificacao === 'function') {
                    mostrarNotificacao(`❌ ${data.message || 'Erro na operação'}`, 'error');
                }
                
                return {
                    success: false,
                    error: data.message || 'Erro na operação',
                    online: true
                };
            }
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            return this.handleError(parseError);
        }
    }

    /**
     * Trata erros de forma padronizada com fallback offline
     * @param {Error} error - Erro capturado
     * @returns {Object} Resultado com fallback offline
     */
    static handleError(error) {
        console.error('❌ API Error:', error);
        
        let errorMessage = 'Erro de conexão';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Timeout na requisição';
        } else if (error.message.includes('fetch')) {
            errorMessage = 'Servidor indisponível';
        }
        
        // Notificação de fallback offline
        if (typeof mostrarNotificacao === 'function') {
            mostrarNotificacao(`⚠️ ${errorMessage} - Operação realizada offline`, 'warning');
        }
        
        return {
            success: false,
            error: errorMessage,
            online: false,
            fallbackOffline: true
        };
    }

    /**
     * Verifica se o servidor está online
     * @returns {Promise<boolean>} Status da conexão
     */
    static async isOnline() {
        try {
            const response = await fetch('/api/health', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Executa operação com retry automático
     * @param {Function} operation - Função da operação
     * @param {number} maxRetries - Máximo de tentativas
     * @returns {Promise<Object>} Resultado da operação
     */
    static async withRetry(operation, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Tentativa ${attempt}/${maxRetries}`);
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    // Espera progressiva: 1s, 2s, 3s
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                }
            }
        }
        
        return this.handleError(lastError);
    }
}

// Exportar para uso global
window.ApiService = ApiService;

console.log('🔧 ApiService carregado - Duplicação de API eliminada!');
