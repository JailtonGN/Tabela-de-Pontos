/**
 * 📁 FileUtils - Utilitários para manipulação de arquivos e área de transferência
 * 
 * Elimina duplicação de código nas funções de cópia e salvamento de arquivos
 * Fornece métodos padronizados para operações de arquivo
 * 
 * @author Refatoração DRY - Tabela de Pontos
 * @version 1.0.0
 */

class FileUtils {
    /**
     * Configurações padrão
     */
    static config = {
        logOperations: false,
        defaultFileName: 'historico-pontos'
    };

    /**
     * Copia texto para área de transferência com fallback
     * @param {string} texto - Texto a ser copiado
     * @returns {Promise<boolean>} Sucesso da operação
     */
    static async copyToClipboard(texto) {
        if (this.config.logOperations) {
            console.log('📋 FileUtils.copyToClipboard()');
        }

        try {
            // Método moderno
            await navigator.clipboard.writeText(texto);
            return true;
        } catch (error) {
            console.warn('⚠️ Fallback para método antigo de cópia:', error);
            
            try {
                // Fallback para navegadores mais antigos
                const textArea = document.createElement('textarea');
                textArea.value = texto;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                return successful;
            } catch (fallbackError) {
                console.error('❌ Erro no fallback de cópia:', fallbackError);
                return false;
            }
        }
    }

    /**
     * Salva dados como arquivo JSON
     * @param {Object} dados - Dados a serem salvos
     * @param {string} fileName - Nome do arquivo (opcional)
     * @returns {boolean} Sucesso da operação
     */
    static saveAsJSON(dados, fileName = null) {
        if (this.config.logOperations) {
            console.log('💾 FileUtils.saveAsJSON()');
        }

        try {
            const blob = new Blob([JSON.stringify(dados, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Gerar nome do arquivo com data se não fornecido
            if (!fileName) {
                const today = new Date().toISOString().split('T')[0];
                fileName = `${this.config.defaultFileName}-${today}.json`;
            }
            
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar arquivo JSON:', error);
            return false;
        }
    }

    /**
     * Gera nome de arquivo com timestamp
     * @param {string} prefix - Prefixo do arquivo
     * @param {string} extension - Extensão do arquivo
     * @returns {string} Nome do arquivo gerado
     */
    static generateFileName(prefix = 'file', extension = 'json') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${prefix}-${timestamp}.${extension}`;
    }

    /**
     * Configura o FileUtils
     * @param {Object} newConfig - Nova configuração
     */
    static configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ FileUtils configurado:', this.config);
    }
}

// Exportar para uso global
window.FileUtils = FileUtils; 