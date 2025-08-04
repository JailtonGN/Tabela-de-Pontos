// Sistema de Login - Gerenciamento de Autenticação
class LoginSystem {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.checkExistingSession();
    }

    initializeElements() {
        // Botões de tipo de usuário
        this.btnPai = document.getElementById('btn-pai');
        this.btnAdmin = document.getElementById('btn-admin');
        this.btnGuest = document.getElementById('btn-guest');

        // Seções de login
        this.loginPaiForm = document.getElementById('login-pai');
        this.loginAdminForm = document.getElementById('login-admin');
        this.loginGuestForm = document.getElementById('login-guest');

        // Campos de input
        this.nomePai = document.getElementById('nome-pai');
        this.senhaPai = document.getElementById('senha-pai');
        this.senhaAdmin = document.getElementById('senha-admin');

        // Botões de login
        this.btnLoginPai = document.getElementById('btn-login-pai');
        this.btnLoginAdmin = document.getElementById('btn-login-admin');
        this.btnLoginGuest = document.getElementById('btn-login-guest');
    }

    attachEventListeners() {
        // Seletores de tipo de usuário
        [this.btnPai, this.btnAdmin, this.btnGuest].forEach(btn => {
            btn.addEventListener('click', (e) => this.switchUserType(e.target.dataset.type));
        });

        // Botões de login
        this.btnLoginPai.addEventListener('click', () => {
            console.log('🔍 Clique em login pai');
            this.loginPai();
        });
        this.btnLoginAdmin.addEventListener('click', () => {
            console.log('🔍 Clique em login admin');
            this.loginAdmin();
        });
        this.btnLoginGuest.addEventListener('click', () => {
            console.log('🔍 Clique em login guest');
            console.log('🔍 Função loginGuest existe?', typeof this.loginGuest);
            if (typeof this.loginGuest === 'function') {
                this.loginGuest();
            } else {
                console.error('❌ loginGuest não é uma função!');
                // Fallback direto
                this.setLoading(this.btnLoginGuest, true);
                setTimeout(() => {
                    this.saveSession({
                        type: 'guest',
                        nome: 'Visitante',
                        permissions: ['view']
                    });
                    this.redirectToApp();
                }, 500);
            }
        });

        // Enter nos campos de senha
        this.senhaPai.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loginPai();
        });
        this.senhaAdmin.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loginAdmin();
        });
    }

    switchUserType(type) {
        // Remove active de todos os botões
        document.querySelectorAll('.user-type-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.login-section').forEach(section => section.classList.remove('active'));

        // Ativa o tipo selecionado
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        document.getElementById(`login-${type}`).classList.add('active');
    }

    async loginPai() {
        const nome = this.nomePai.value.trim();
        const senha = this.senhaPai.value.trim();

        if (!nome) {
            this.showError(this.nomePai, 'Digite seu nome');
            return;
        }

        if (!senha) {
            this.showError(this.senhaPai, 'Digite a senha da família');
            return;
        }

        this.setLoading(this.btnLoginPai, true);

        try {
            // Verificar credenciais dos pais
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'pai',
                    nome: nome,
                    senha: senha
                })
            });

            const result = await response.json();

            if (result.success) {
                this.saveSession({
                    type: 'pai',
                    nome: nome,
                    permissions: ['view', 'add_points', 'remove_points']
                });
                this.redirectToApp();
            } else {
                this.showError(this.senhaPai, result.message || 'Credenciais inválidas');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError(this.senhaPai, 'Erro de conexão. Tente novamente.');
        } finally {
            this.setLoading(this.btnLoginPai, false);
        }
    }

    async loginAdmin() {
        const senha = this.senhaAdmin.value.trim();

        if (!senha) {
            this.showError(this.senhaAdmin, 'Digite a senha de administrador');
            return;
        }

        this.setLoading(this.btnLoginAdmin, true);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'admin',
                    senha: senha
                })
            });

            const result = await response.json();

            if (result.success) {
                this.saveSession({
                    type: 'admin',
                    nome: 'Administrador',
                    permissions: ['view', 'add_points', 'remove_points', 'manage_children', 'manage_activities', 'view_history', 'export_data']
                });
                this.redirectToApp();
            } else {
                this.showError(this.senhaAdmin, result.message || 'Senha de administrador incorreta');
            }
        } catch (error) {
            console.error('Erro no login admin:', error);
            this.showError(this.senhaAdmin, 'Erro de conexão. Tente novamente.');
        } finally {
            this.setLoading(this.btnLoginAdmin, false);
        }
    }

    async loginGuest() {
        this.setLoading(this.btnLoginGuest, true);
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'guest'
                })
            });

            const result = await response.json();

            if (result.success) {
                this.saveSession({
                    type: 'guest',
                    nome: 'Visitante',
                    permissions: ['view']
                });
                this.redirectToApp();
            } else {
                console.error('Erro no login de visitante:', result.message);
                // Fallback: login local
                this.saveSession({
                    type: 'guest',
                    nome: 'Visitante',
                    permissions: ['view']
                });
                this.redirectToApp();
            }
        } catch (error) {
            console.error('Erro na conexão do visitante:', error);
            // Fallback: login local
            this.saveSession({
                type: 'guest',
                nome: 'Visitante',
                permissions: ['view']
            });
            this.redirectToApp();
        } finally {
            this.setLoading(this.btnLoginGuest, false);
        }
    }

    saveSession(userData) {
        localStorage.setItem('userSession', JSON.stringify({
            ...userData,
            loginTime: new Date().toISOString(),
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
        }));
    }

    checkExistingSession() {
        const session = localStorage.getItem('userSession');
        if (session) {
            const userData = JSON.parse(session);
            const now = new Date();
            const expires = new Date(userData.expires);
            
            if (now < expires) {
                // Sessão válida, redirecionar
                this.redirectToApp();
            } else {
                // Sessão expirada, limpar
                localStorage.removeItem('userSession');
            }
        }
    }

    redirectToApp() {
        console.log('🔄 Redirecionando para a aplicação...');
        // Forçar redirecionamento
        window.location.replace('/');
    }

    showError(element, message) {
        element.classList.add('error');
        
        // Remove erro existente
        const existingError = element.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Adiciona nova mensagem de erro
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message show';
        errorDiv.textContent = message;
        element.parentNode.appendChild(errorDiv);

        // Remove erro após 5 segundos
        setTimeout(() => {
            element.classList.remove('error');
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);

        // Remove erro quando usuário começar a digitar
        element.addEventListener('input', () => {
            element.classList.remove('error');
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, { once: true });
    }

    setLoading(button, loading) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

// Configurações padrão do sistema
const LOGIN_CONFIG = {
    pai: {
        // Senha simples para os pais - pode ser configurada
        senhaFamilia: 'familia123'
    },
    admin: {
        // Senha especial para administrador - mais complexa
        senhaAdmin: 'admin2025!'
    }
};

// Inicializar sistema de login quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new LoginSystem();
});

// Utilitários globais para o sistema de autenticação
window.AuthUtils = {
    // Verificar se usuário está logado
    isLoggedIn() {
        const session = localStorage.getItem('userSession');
        if (!session) return false;
        
        const userData = JSON.parse(session);
        const now = new Date();
        const expires = new Date(userData.expires);
        
        return now < expires;
    },

    // Obter dados do usuário atual
    getCurrentUser() {
        if (!this.isLoggedIn()) return null;
        return JSON.parse(localStorage.getItem('userSession'));
    },

    // Verificar se usuário tem permissão específica
    hasPermission(permission) {
        const user = this.getCurrentUser();
        return user && user.permissions.includes(permission);
    },

    // Fazer logout
    logout() {
        localStorage.removeItem('userSession');
        window.location.href = '/login.html';
    },

    // Redirecionar para login se não autenticado
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }
};
