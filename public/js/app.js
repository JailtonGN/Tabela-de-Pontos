/**
 * 🚀 APLICAÇÃO PRINCIPAL - FRONTEND
 * 
 * Arquivo principal que inicializa e coordena toda a aplicação
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

class App {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
    }

    // Inicializar aplicação
    async init() {
        try {
            console.log('🚀 Inicializando aplicação...');
            
            // Verificar autenticação
            await this.verificarAutenticacao();
            
            // Carregar dados iniciais
            await this.carregarDadosIniciais();
            
            // Configurar interface
            this.configurarInterface();
            
            // Configurar eventos
            this.configurarEventos();
            
            this.isInitialized = true;
            console.log('✅ Aplicação inicializada com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar aplicação:', error);
            this.mostrarErroInicializacao(error);
        }
    }

    // Verificar autenticação
    async verificarAutenticacao() {
        console.log('🔐 Verificando autenticação...');
        
        // Verificar se AuthUtils está disponível
        if (typeof AuthUtils === 'undefined') {
            throw new Error('AuthUtils não carregado');
        }
        
        // Verificar se usuário está logado
        const isLoggedIn = AuthUtils.isLoggedIn();
        if (!isLoggedIn) {
            console.log('🔐 Usuário não logado, redirecionando...');
            window.location.href = '/login.html';
            return;
        }
        
        this.currentUser = AuthUtils.getCurrentUser();
        console.log('👤 Usuário logado:', this.currentUser);
    }

    // Carregar dados iniciais
    async carregarDadosIniciais() {
        console.log('📊 Carregando dados iniciais...');
        
        // Carregar crianças
        await criancasController.carregarCriancas();
        
        // Carregar pontos (se necessário)
        // await pontosController.carregarPontos();
        
        // Carregar atividades (se necessário)
        // await atividadesController.carregarAtividades();
        
        console.log('✅ Dados iniciais carregados');
    }

    // Configurar interface baseada no usuário
    configurarInterface() {
        console.log('🎨 Configurando interface...');
        
        if (!this.currentUser) return;
        
        // Configurar cabeçalho
        this.configurarCabecalho();
        
        // Configurar permissões
        this.configurarPermissoes();
        
        // Atualizar interface das crianças
        criancasController.atualizarInterface();
        
        console.log('✅ Interface configurada');
    }

    // Configurar cabeçalho
    configurarCabecalho() {
        const headerTitle = document.querySelector('.header-title p');
        if (headerTitle && this.currentUser) {
            const tipoTexto = this.currentUser.type === 'admin' ? '🔧 Administrador' : 
                             this.currentUser.type === 'pai' ? `👨‍👩‍👧‍👦 ${this.currentUser.nome}` : 
                             '👀 Visualização';
            headerTitle.innerHTML = `${tipoTexto} - Gerenciando os pontos dos filhos`;
        }
    }

    // Configurar permissões
    configurarPermissoes() {
        if (!this.currentUser) return;
        
        const { type, permissions } = this.currentUser;
        
        // Configurar botão de configurações
        const configBtn = document.getElementById('btn-configuracoes');
        if (configBtn) {
            if (type === 'guest') {
                configBtn.style.display = 'none';
            } else {
                configBtn.style.display = 'block';
            }
        }
        
        // Configurar elementos admin-only
        if (type === 'admin') {
            this.configurarElementosAdmin();
        }
    }

    // Configurar elementos admin-only
    configurarElementosAdmin() {
        const elementosAdmin = [
            { id: 'btn-baixar-log', permission: 'export_data' },
            { id: 'btn-resetar-pontos', permission: 'manage_children' },
            { id: 'btn-limpar-historico', permission: 'manage_activities' }
        ];
        
        elementosAdmin.forEach(elemento => {
            const el = document.getElementById(elemento.id);
            if (el && this.currentUser.permissions.includes(elemento.permission)) {
                el.style.display = 'block';
                console.log(`✅ LIBERADO: ${elemento.id}`);
            }
        });
    }

    // Configurar eventos
    configurarEventos() {
        console.log('🎭 Configurando eventos...');
        
        // Evento para adicionar criança
        const btnAddCrianca = document.getElementById('btn-add-crianca');
        if (btnAddCrianca) {
            btnAddCrianca.addEventListener('click', () => {
                criancasController.adicionarCriancaViaModal();
            });
        }
        
        // Evento para configurações
        const btnConfig = document.getElementById('btn-configuracoes');
        if (btnConfig) {
            btnConfig.addEventListener('click', () => {
                this.abrirConfiguracoes();
            });
        }
        
        // Evento para logout
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                this.fazerLogout();
            });
        }
        
        console.log('✅ Eventos configurados');
    }

    // Abrir configurações
    abrirConfiguracoes() {
        window.location.href = '/configuracoes.html';
    }

    // Fazer logout
    fazerLogout() {
        if (typeof AuthUtils !== 'undefined') {
            AuthUtils.logout();
        }
        window.location.href = '/login.html';
    }

    // Mostrar erro de inicialização
    mostrarErroInicializacao(error) {
        console.error('❌ Erro fatal na inicialização:', error);
        
        const container = document.querySelector('.main-content') || document.body;
        container.innerHTML = `
            <div class="error-container">
                <h2>❌ Erro ao carregar a aplicação</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="btn-retry">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }

    // Verificar se está inicializado
    isReady() {
        return this.isInitialized;
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }
}

// Instância global da aplicação
window.app = new App();

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    app.init();
}); 