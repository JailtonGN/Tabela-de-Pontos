/**
 * 🎨 DomUtils - Centralização de manipulação DOM e formulários
 * 
 * Elimina duplicação de código nas 20+ chamadas document.getElementById
 * Fornece cache inteligente e métodos padronizados para manipulação DOM
 * 
 * @author Refatoração DRY - Tabela de Pontos
 * @version 1.0.0
 */

class DomUtils {
    /**
     * Cache de elementos DOM para melhor performance
     */
    static elementCache = new Map();

    /**
     * Configurações padrão
     */
    static config = {
        cacheEnabled: true,
        logOperations: false
    };

    /**
     * Obtém elemento por ID com cache inteligente
     * @param {string} id - ID do elemento
     * @param {boolean} useCache - Usar cache (padrão: true)
     * @returns {HTMLElement|null} Elemento encontrado
     */
    static getElementById(id, useCache = true) {
        if (this.config.logOperations) {
            console.log(`🎯 DomUtils.getElementById('${id}')`);
        }

        if (useCache && this.elementCache.has(id)) {
            const element = this.elementCache.get(id);
            // Verificar se elemento ainda existe no DOM
            if (document.contains(element)) {
                return element;
            } else {
                this.elementCache.delete(id);
            }
        }

        const element = document.getElementById(id);
        
        if (element && useCache && this.config.cacheEnabled) {
            this.elementCache.set(id, element);
        }

        return element;
    }

    /**
     * Obtém elemento por seletor CSS
     * @param {string} selector - Seletor CSS
     * @returns {HTMLElement|null} Elemento encontrado
     */
    static getElement(selector) {
        if (this.config.logOperations) {
            console.log(`🎯 DomUtils.getElement('${selector}')`);
        }
        
        // Se começar com #, usar getElementById para melhor performance
        if (selector.startsWith('#') && !selector.includes(' ') && !selector.includes('.')) {
            return this.getElementById(selector.slice(1));
        }
        
        return document.querySelector(selector);
    }

    /**
     * Obtém valor de input de forma segura
     * @param {string} id - ID do elemento
     * @param {any} defaultValue - Valor padrão se não encontrado
     * @returns {string} Valor do elemento
     */
    static getValue(id, defaultValue = '') {
        const element = this.getElementById(id);
        return element ? element.value : defaultValue;
    }

    /**
     * Obtém valor de input como inteiro
     * @param {string} id - ID do elemento
     * @param {number} defaultValue - Valor padrão
     * @returns {number} Valor como inteiro
     */
    static getIntValue(id, defaultValue = 0) {
        const value = this.getValue(id, defaultValue.toString());
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Obtém valor de input com trim
     * @param {string} id - ID do elemento
     * @param {string} defaultValue - Valor padrão
     * @returns {string} Valor trimmed
     */
    static getTrimmedValue(id, defaultValue = '') {
        return this.getValue(id, defaultValue).trim();
    }

    /**
     * Define valor de elemento
     * @param {string} id - ID do elemento
     * @param {any} value - Valor a definir
     * @returns {boolean} Sucesso da operação
     */
    static setValue(id, value) {
        const element = this.getElementById(id);
        if (element) {
            element.value = value;
            return true;
        }
        console.warn(`⚠️ Elemento '${id}' não encontrado para setValue`);
        return false;
    }

    /**
     * Limpa valores de múltiplos inputs
     * @param {string[]} ids - Array de IDs
     * @param {Object} defaults - Valores padrão por ID
     */
    static clearInputs(ids, defaults = {}) {
        if (this.config.logOperations) {
            console.log('🧹 DomUtils.clearInputs:', ids);
        }

        ids.forEach(id => {
            const defaultValue = defaults[id] || '';
            this.setValue(id, defaultValue);
        });
    }

    /**
     * Obtém dados de formulário baseado em prefixo
     * @param {string} formPrefix - Prefixo dos campos do formulário
     * @returns {Object} Dados do formulário
     */
    static getFormData(formPrefix) {
        if (this.config.logOperations) {
            console.log(`📋 DomUtils.getFormData('${formPrefix}')`);
        }

        const data = {
            filhoId: this.getValue(`${formPrefix}-filho`),
            pontos: this.getIntValue(`${formPrefix}-pontos`, 1),
            motivo: this.getTrimmedValue(`${formPrefix}-motivo`)
        };

        // Campos opcionais comuns
        const optionalFields = ['categoria', 'tipo', 'observacao'];
        optionalFields.forEach(field => {
            const value = this.getTrimmedValue(`${formPrefix}-${field}`);
            if (value) {
                data[field] = value;
            }
        });

        return data;
    }

    /**
     * Limpa formulário baseado em prefixo
     * @param {string} formPrefix - Prefixo dos campos
     * @param {Object} defaults - Valores padrão específicos
     */
    static clearForm(formPrefix, defaults = {}) {
        if (this.config.logOperations) {
            console.log(`🧹 DomUtils.clearForm('${formPrefix}')`);
        }

        const defaultValues = {
            motivo: '',
            pontos: '1',
            categoria: '',
            tipo: '',
            observacao: '',
            ...defaults
        };

        Object.keys(defaultValues).forEach(field => {
            this.setValue(`${formPrefix}-${field}`, defaultValues[field]);
        });
    }

    /**
     * Valida formulário
     * @param {string} formPrefix - Prefixo do formulário
     * @param {Object} rules - Regras de validação
     * @returns {Object} Resultado da validação
     */
    static validateForm(formPrefix, rules = {}) {
        const data = this.getFormData(formPrefix);
        const errors = [];

        // Validações padrão
        if (rules.motivoRequired !== false && !data.motivo) {
            errors.push('Motivo é obrigatório');
        }

        if (rules.filhoRequired !== false && !data.filhoId) {
            errors.push('Filho deve ser selecionado');
        }

        if (rules.pontosMin && data.pontos < rules.pontosMin) {
            errors.push(`Pontos deve ser no mínimo ${rules.pontosMin}`);
        }

        if (rules.pontosMax && data.pontos > rules.pontosMax) {
            errors.push(`Pontos deve ser no máximo ${rules.pontosMax}`);
        }

        return {
            valid: errors.length === 0,
            data,
            errors
        };
    }

    /**
     * Mostra/esconde elemento
     * @param {string} id - ID do elemento
     * @param {boolean} show - Mostrar ou esconder
     */
    static toggleElement(id, show) {
        const element = this.getElementById(id);
        if (element) {
            element.style.display = show ? '' : 'none';
        }
    }

    /**
     * Mostra elemento
     * @param {string} id - ID do elemento
     */
    static showElement(id) {
        this.toggleElement(id, true);
    }

    /**
     * Esconde elemento
     * @param {string} id - ID do elemento
     */
    static hideElement(id) {
        this.toggleElement(id, false);
    }

    /**
     * Adiciona classe CSS
     * @param {string} id - ID do elemento
     * @param {string} className - Nome da classe
     */
    static addClass(id, className) {
        const element = this.getElementById(id);
        if (element) {
            element.classList.add(className);
        }
    }

    /**
     * Remove classe CSS
     * @param {string} id - ID do elemento
     * @param {string} className - Nome da classe
     */
    static removeClass(id, className) {
        const element = this.getElementById(id);
        if (element) {
            element.classList.remove(className);
        }
    }

    /**
     * Define texto de elemento
     * @param {string} id - ID do elemento
     * @param {string} text - Texto a definir
     */
    static setText(id, text) {
        const element = this.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Define HTML de elemento
     * @param {string} id - ID do elemento
     * @param {string} html - HTML a definir
     */
    static setHTML(id, html) {
        const element = this.getElementById(id);
        if (element) {
            element.innerHTML = html;
        }
    }

    /**
     * Foca em elemento
     * @param {string} id - ID do elemento
     */
    static focus(id) {
        const element = this.getElementById(id);
        if (element && typeof element.focus === 'function') {
            element.focus();
        }
    }

    /**
     * Limpa cache de elementos
     */
    static clearCache() {
        this.elementCache.clear();
        console.log('🧹 Cache de elementos DOM limpo');
    }

    /**
     * Estatísticas do cache
     * @returns {Object} Informações do cache
     */
    static getCacheStats() {
        return {
            size: this.elementCache.size,
            keys: Array.from(this.elementCache.keys())
        };
    }

    /**
     * Configura DomUtils
     * @param {Object} newConfig - Nova configuração
     */
    static configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ DomUtils configurado:', this.config);
    }
}

// Exportar para uso global
window.DomUtils = DomUtils;

console.log('🎨 DomUtils carregado - Duplicação DOM eliminada!');
