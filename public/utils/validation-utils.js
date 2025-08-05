/**
 * ✅ ValidationUtils - Centralização de validações e mensagens de erro
 * 
 * Elimina duplicação de código nas validações de formulários e dados
 * Fornece validações padronizadas com mensagens consistentes
 * 
 * @author Refatoração DRY - Tabela de Pontos
 * @version 1.0.0
 */

class ValidationUtils {
    /**
     * Configurações padrão
     */
    static config = {
        logValidations: false,
        showNotifications: true,
        defaultMessages: {
            required: 'Campo obrigatório',
            invalid: 'Valor inválido',
            notFound: 'Item não encontrado',
            duplicate: 'Item já existe',
            permission: 'Permissão negada'
        }
    };

    /**
     * Valida se um valor não está vazio
     * @param {any} value - Valor a ser validado
     * @param {string} fieldName - Nome do campo para mensagem
     * @param {string} customMessage - Mensagem personalizada
     * @returns {Object} Resultado da validação
     */
    static validateRequired(value, fieldName = 'Campo', customMessage = null) {
        const isValid = value !== null && value !== undefined && value !== '';
        const message = customMessage || `${fieldName} é obrigatório`;
        
        if (this.config.logValidations) {
            console.log(`🔍 ValidationUtils.validateRequired('${fieldName}'):`, { value, isValid });
        }

        return {
            isValid,
            message,
            field: fieldName
        };
    }

    /**
     * Valida se um valor é um número válido
     * @param {any} value - Valor a ser validado
     * @param {string} fieldName - Nome do campo para mensagem
     * @param {number} min - Valor mínimo (opcional)
     * @param {number} max - Valor máximo (opcional)
     * @returns {Object} Resultado da validação
     */
    static validateNumber(value, fieldName = 'Campo', min = null, max = null) {
        const numValue = parseInt(value);
        const isValid = !isNaN(numValue);
        
        let message = `${fieldName} deve ser um número válido`;
        
        if (isValid) {
            if (min !== null && numValue < min) {
                message = `${fieldName} deve ser maior ou igual a ${min}`;
                return { isValid: false, message, field: fieldName };
            }
            if (max !== null && numValue > max) {
                message = `${fieldName} deve ser menor ou igual a ${max}`;
                return { isValid: false, message, field: fieldName };
            }
            message = null; // Válido
        }

        if (this.config.logValidations) {
            console.log(`🔍 ValidationUtils.validateNumber('${fieldName}'):`, { value, numValue, isValid });
        }

        return {
            isValid,
            message,
            field: fieldName,
            value: isValid ? numValue : null
        };
    }

    /**
     * Valida se um elemento DOM existe
     * @param {HTMLElement} element - Elemento a ser validado
     * @param {string} elementName - Nome do elemento para mensagem
     * @returns {Object} Resultado da validação
     */
    static validateElement(element, elementName = 'Elemento') {
        const isValid = element !== null && element !== undefined;
        const message = isValid ? null : `${elementName} não encontrado`;

        if (this.config.logValidations) {
            console.log(`🔍 ValidationUtils.validateElement('${elementName}'):`, { element, isValid });
        }

        return {
            isValid,
            message,
            field: elementName
        };
    }

    /**
     * Valida se um item existe em uma lista
     * @param {any} item - Item a ser validado
     * @param {Array} list - Lista onde procurar
     * @param {string} itemName - Nome do item para mensagem
     * @param {Function} finder - Função para encontrar o item (opcional)
     * @returns {Object} Resultado da validação
     */
    static validateExists(item, list, itemName = 'Item', finder = null) {
        let exists = false;
        
        if (finder && typeof finder === 'function') {
            exists = finder(item, list);
        } else {
            exists = list.some(i => i.id === item || i.nome === item);
        }

        const message = exists ? null : `${itemName} não encontrado`;

        if (this.config.logValidations) {
            console.log(`🔍 ValidationUtils.validateExists('${itemName}'):`, { item, exists });
        }

        return {
            isValid: exists,
            message,
            field: itemName
        };
    }

    /**
     * Valida se um item é único (não duplicado)
     * @param {any} item - Item a ser validado
     * @param {Array} list - Lista onde verificar duplicação
     * @param {string} itemName - Nome do item para mensagem
     * @param {Function} comparator - Função para comparar itens (opcional)
     * @returns {Object} Resultado da validação
     */
    static validateUnique(item, list, itemName = 'Item', comparator = null) {
        let isUnique = true;
        
        if (comparator && typeof comparator === 'function') {
            isUnique = !list.some(i => comparator(item, i));
        } else {
            isUnique = !list.some(i => i.nome.toLowerCase() === item.toLowerCase());
        }

        const message = isUnique ? null : `${itemName} já existe`;

        if (this.config.logValidations) {
            console.log(`🔍 ValidationUtils.validateUnique('${itemName}'):`, { item, isUnique });
        }

        return {
            isValid: isUnique,
            message,
            field: itemName
        };
    }

    /**
     * Valida permissões do usuário
     * @param {string} permission - Permissão necessária
     * @param {Object} user - Objeto do usuário
     * @returns {Object} Resultado da validação
     */
    static validatePermission(permission, user) {
        const hasPermission = user && user.permissions && user.permissions.includes(permission);
        const message = hasPermission ? null : 'Permissão negada';

        if (this.config.logValidations) {
            console.log(`🔍 ValidationUtils.validatePermission('${permission}'):`, { hasPermission, user });
        }

        return {
            isValid: hasPermission,
            message,
            field: 'permission'
        };
    }

    /**
     * Valida formulário completo
     * @param {Object} formData - Dados do formulário
     * @param {Object} rules - Regras de validação
     * @returns {Object} Resultado da validação
     */
    static validateForm(formData, rules) {
        const errors = [];
        let isValid = true;

        for (const [field, rule] of Object.entries(rules)) {
            const value = formData[field];
            
            // Validação obrigatória
            if (rule.required) {
                const requiredResult = this.validateRequired(value, rule.label || field, rule.requiredMessage);
                if (!requiredResult.isValid) {
                    errors.push(requiredResult);
                    isValid = false;
                    continue;
                }
            }

            // Validação de número
            if (rule.type === 'number' && value !== null && value !== undefined && value !== '') {
                const numberResult = this.validateNumber(value, rule.label || field, rule.min, rule.max);
                if (!numberResult.isValid) {
                    errors.push(numberResult);
                    isValid = false;
                }
            }

            // Validação de elemento DOM
            if (rule.type === 'element') {
                const elementResult = this.validateElement(value, rule.label || field);
                if (!elementResult.isValid) {
                    errors.push(elementResult);
                    isValid = false;
                }
            }
        }

        if (this.config.logValidations) {
            console.log(`🔍 ValidationUtils.validateForm:`, { formData, rules, isValid, errors });
        }

        return {
            isValid,
            errors,
            firstError: errors.length > 0 ? errors[0] : null
        };
    }

    /**
     * Exibe notificação de erro se configurado
     * @param {Object} validationResult - Resultado da validação
     * @param {Function} notificationCallback - Função de notificação
     */
    static showValidationError(validationResult, notificationCallback = null) {
        if (!validationResult.isValid && validationResult.message) {
            const message = `❌ ${validationResult.message}`;
            
            if (this.config.showNotifications) {
                if (notificationCallback && typeof notificationCallback === 'function') {
                    notificationCallback(message, 'error');
                } else if (typeof mostrarNotificacao === 'function') {
                    mostrarNotificacao(message, 'error');
                } else {
                    console.error(message);
                }
            }
        }
    }

    /**
     * Validação específica para formulário de pontos
     * @param {Object} data - Dados do formulário
     * @returns {Object} Resultado da validação
     */
    static validatePontosForm(data) {
        const rules = {
            filhoId: { required: true, label: 'Filho' },
            pontos: { required: true, type: 'number', min: 1, label: 'Pontos' },
            atividade: { required: true, label: 'Atividade' }
        };

        return this.validateForm(data, rules);
    }

    /**
     * Validação específica para formulário de filho
     * @param {Object} data - Dados do formulário
     * @param {Array} existingFilhos - Lista de filhos existentes
     * @returns {Object} Resultado da validação
     */
    static validateFilhoForm(data, existingFilhos = []) {
        const rules = {
            nome: { required: true, label: 'Nome do filho' },
            emoji: { required: true, label: 'Emoji' },
            cor: { required: true, label: 'Cor' }
        };

        const formResult = this.validateForm(data, rules);
        
        // Validação adicional de duplicação
        if (formResult.isValid && data.nome) {
            const uniqueResult = this.validateUnique(data.nome, existingFilhos, 'Nome do filho');
            if (!uniqueResult.isValid) {
                formResult.errors.push(uniqueResult);
                formResult.isValid = false;
            }
        }

        return formResult;
    }

    /**
     * Configura o ValidationUtils
     * @param {Object} newConfig - Nova configuração
     */
    static configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ ValidationUtils configurado:', this.config);
    }
}

// Exportar para uso global
window.ValidationUtils = ValidationUtils; 