// Sistema de Pontos - JavaScript Simples e Funcional

// Verificação de autenticação ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicação carregando...');
    
    // Verificar se AuthUtils está disponível
    if (typeof AuthUtils === 'undefined') {
        console.error('❌ AuthUtils não carregado, redirecionando para login...');
        window.location.href = '/login.html';
        return;
    }
    
    console.log('✅ AuthUtils carregado');
    
    // Verificar se usuário está logado
    const isLoggedIn = AuthUtils.isLoggedIn();
    console.log('🔐 Status de autenticação:', isLoggedIn);
    
    if (!isLoggedIn) {
        console.log('🔐 Usuário não autenticado, redirecionando para login...');
        window.location.href = '/login.html';
        return;
    }

    // Obter dados do usuário
    const currentUser = AuthUtils.getCurrentUser();
    console.log('👤 Usuário logado:', currentUser);

    if (!currentUser) {
        console.error('❌ Dados do usuário inválidos, redirecionando para login...');
        window.location.href = '/login.html';
        return;
    }

    console.log('👤 Tipo de usuário:', currentUser.type);
    console.log('🔑 Permissões:', currentUser.permissions);

    // Configurar interface baseado nas permissões
    configurarInterfacePorPermissao(currentUser);

    // Inicializar aplicação
    inicializarApp();
});

// Configurar interface baseado no tipo de usuário
function configurarInterfacePorPermissao(user) {
    const { type, permissions } = user;

    // Mostrar informações do usuário no cabeçalho
    const headerTitle = document.querySelector('.header-title p');
    if (headerTitle) {
        const tipoTexto = type === 'admin' ? '🔧 Administrador' : 
                         type === 'pai' ? `👨‍👩‍👧‍👦 ${user.nome}` : 
                         '👀 Visualização';
        headerTitle.innerHTML = `${tipoTexto} - Gerenciando os pontos dos filhos`;
    }

    // Adicionar botão de logout
    const headerControls = document.querySelector('.header-controls');
    if (headerControls) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn-logout';
        logoutBtn.innerHTML = '🚪 Sair';
        logoutBtn.title = 'Fazer logout';
        logoutBtn.onclick = () => AuthUtils.logout();
        headerControls.appendChild(logoutBtn);
    }

    // Configurar visibilidade dos elementos baseado nas permissões
    if (!permissions.includes('add_points')) {
        // Esconder seção de adicionar pontos
        const addSection = document.querySelector('.acao-card:has(#filho-adicionar)');
        if (addSection) addSection.style.display = 'none';
    }

    if (!permissions.includes('remove_points')) {
        // Esconder seção de remover pontos
        const removeSection = document.querySelector('.acao-card:has(#filho-remover)');
        if (removeSection) removeSection.style.display = 'none';
    }

    if (!permissions.includes('manage_children') || !permissions.includes('manage_activities')) {
        // Esconder ou desabilitar botão de configurações
        const configBtn = document.getElementById('btn-configuracoes');
        if (configBtn) {
            if (type === 'guest') {
                configBtn.style.display = 'none';
            } else {
                // Pais podem ver configurações mas com limitações
                configBtn.title = 'Configurações (Limitadas)';
            }
        }
    }

    // Para visitantes, mostrar apenas a visualização
    if (type === 'guest') {
        document.querySelectorAll('.acao-card').forEach(card => {
            card.style.display = 'none';
        });
        
        // Adicionar aviso para visitantes
        const mainContent = document.querySelector('.main-content');
        const avisoDiv = document.createElement('div');
        avisoDiv.className = 'aviso-visitante';
        avisoDiv.innerHTML = `
            <div class="card">
                <h3>👀 Modo Visitante</h3>
                <p>Você está no modo de visualização. Para adicionar ou remover pontos, use o botão "🚪 Sair" no canto superior direito e faça login como pai/mãe ou administrador.</p>
            </div>
        `;
        mainContent.insertBefore(avisoDiv, mainContent.firstChild);
    }
}

// Estado global
let filhos = []; // Array dinâmico de filhos
let atividadesPositivas = []; // Atividades que ganham pontos
let atividadesNegativas = []; // Atividades que perdem pontos
let historico = [];
let pontos = {}; // Objeto para armazenar pontos dos filhos
let logs = []; // Sistema de log para todas as ações

// Sistema de Sincronização com Backend
const API_BASE = window.location.origin;

// Função para fazer requisições ao backend
async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE}/api${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro na comunicação com o servidor:', error);
        // Fallback para localStorage se o servidor não estiver disponível
        return null;
    }
}

// Sincronizar dados com o servidor
async function sincronizarDados() {
    try {
        // Carregar pontos do servidor
        const pontosServidor = await apiRequest('/pontos');
        if (pontosServidor) {
            pontos = pontosServidor;
        }
        
        // Carregar histórico do servidor
        const historicoServidor = await apiRequest('/historico');
        if (historicoServidor && historicoServidor.historico) {
            historico = historicoServidor.historico;
        }
        
        console.log('✅ Dados sincronizados com o servidor');
        return true;
    } catch (error) {
        console.error('❌ Erro ao sincronizar dados:', error);
        return false;
    }
}

// Salvar dados no servidor
async function salvarNoServidor() {
    try {
        // Salvar pontos
        await apiRequest('/pontos', 'POST', pontos);
        
        // Salvar histórico
        await apiRequest('/historico', 'POST', { historico });
        
        console.log('✅ Dados salvos no servidor');
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar no servidor:', error);
        return false;
    }
}

// Sistema de Log
function adicionarLog(acao, detalhes = {}) {
    const log = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        data: new Date().toLocaleString('pt-BR'),
        acao: acao,
        usuario: 'Admin', // Pode ser expandido futuramente
        detalhes: detalhes,
        ip: 'local' // Para app local
    };
    
    logs.push(log);
    salvarLogs();
    console.log('📋 Log adicionado:', log);
}

// Salvar logs no localStorage
function salvarLogs() {
    localStorage.setItem('pontos_logs', JSON.stringify(logs));
}

// Carregar logs do localStorage
function carregarLogs() {
    const logsStorage = localStorage.getItem('pontos_logs');
    if (logsStorage) {
        logs = JSON.parse(logsStorage);
    }
}

// Sincronização automática (executa a cada 30 segundos)
setInterval(async () => {
    if (navigator.onLine) {
        const sincronizado = await sincronizarDados();
        if (sincronizado) {
            // Atualizar pontos dos filhos com dados do servidor
            filhos.forEach(filho => {
                if (pontos[filho.nome] !== undefined && pontos[filho.nome] !== filho.pontos) {
                    filho.pontos = pontos[filho.nome];
                }
            });
            atualizarInterface();
        }
    }
}, 30000);

// Detectar quando volta a ter internet
window.addEventListener('online', async () => {
    console.log('🌐 Conexão restaurada, sincronizando dados...');
    mostrarNotificacao('🌐 Sincronizando dados...', 'info');
    await sincronizarDados();
    await salvarDados();
    mostrarNotificacao('✅ Dados sincronizados!', 'success');
});

window.addEventListener('offline', () => {
    console.log('📱 Modo offline - dados salvos localmente');
    mostrarNotificacao('📱 Modo offline - dados salvos localmente', 'warning');
});

// Cores disponíveis para os filhos
const coresDisponiveis = [
    { nome: 'Azul', valor: '#4facfe', gradiente: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { nome: 'Rosa', valor: '#f093fb', gradiente: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { nome: 'Verde', valor: '#4ecdc4', gradiente: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)' },
    { nome: 'Laranja', valor: '#ffecd2', gradiente: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
    { nome: 'Roxo', valor: '#a8edea', gradiente: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    { nome: 'Vermelho', valor: '#ff9a9e', gradiente: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
    { nome: 'Amarelo', valor: '#ffeaa7', gradiente: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)' },
    { nome: 'Ciano', valor: '#74b9ff', gradiente: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)' }
];

// Função para inicializar a aplicação (chamada após verificação de autenticação)
async function inicializarApp() {
    console.log('🚀 Inicializando aplicação...');
    await carregarDados();
    configurarEventos();
    atualizarTela();
}

// Inicialização original (será removida pela nova estrutura de autenticação)
// Inicialização original (desativada - agora controlada por autenticação)
/*
document.addEventListener('DOMContentLoaded', async function() {
    await carregarDados();
    configurarEventos();
    atualizarTela();
});
*/

// Carregar dados salvos
async function carregarDados() {
    console.log('🔍 Carregando dados...');
    
    // Tentar sincronizar com o servidor primeiro
    const sincronizado = await sincronizarDados();
    
    if (!sincronizado) {
        console.log('⚠️ Usando dados locais (localStorage)');
        // Fallback para localStorage se servidor não disponível
        const filhosSalvos = localStorage.getItem('filhos');
        const atividadesPositivasSalvas = localStorage.getItem('atividadesPositivas');
        const atividadesNegativasSalvas = localStorage.getItem('atividadesNegativas');
        const historicoSalvo = localStorage.getItem('historico');
        
        if (filhosSalvos) {
            filhos = JSON.parse(filhosSalvos);
        }
        
        if (atividadesPositivasSalvas) {
            atividadesPositivas = JSON.parse(atividadesPositivasSalvas);
        }
        
        if (atividadesNegativasSalvas) {
            atividadesNegativas = JSON.parse(atividadesNegativasSalvas);
        }
        
        if (historicoSalvo) {
            historico = JSON.parse(historicoSalvo);
        }
    }
    
    // Carregar configurações locais (filhos e atividades ainda ficam no localStorage)
    const filhosSalvos = localStorage.getItem('filhos');
    const atividadesPositivasSalvas = localStorage.getItem('atividadesPositivas');
    const atividadesNegativasSalvas = localStorage.getItem('atividadesNegativas');
    
    console.log('🔍 Debug - Dados no localStorage:');
    console.log('Filhos salvos:', filhosSalvos);
    
    if (filhosSalvos) {
        filhos = JSON.parse(filhosSalvos);
        console.log('✅ Filhos carregados:', filhos);
    } else {
        // Inicializar com filhos de exemplo se não houver dados
        filhos = [
            {
                id: 1,
                nome: 'João',
                emoji: '👦',
                cor: coresDisponiveis[0],
                pontos: 0
            },
            {
                id: 2,
                nome: 'Maria',
                emoji: '👧',
                cor: coresDisponiveis[1],
                pontos: 0
            }
        ];
        console.log('⚠️ Usando filhos padrão:', filhos);
    }
    
    if (atividadesPositivasSalvas) {
        atividadesPositivas = JSON.parse(atividadesPositivasSalvas);
    } else {
        // Atividades padrão
        atividadesPositivas = [
            { id: 1, nome: 'Arrumou o quarto', pontos: 10 },
            { id: 2, nome: 'Fez a lição de casa', pontos: 15 }
        ];
    }
    
    if (atividadesNegativasSalvas) {
        atividadesNegativas = JSON.parse(atividadesNegativasSalvas);
    } else {
        // Atividades padrão
        atividadesNegativas = [
            { id: 1, nome: 'Não arrumou o quarto', pontos: 5 },
            { id: 2, nome: 'Mau comportamento', pontos: 8 }
        ];
    }
    
    // Sincronizar pontos dos filhos com dados do servidor
    if (Object.keys(pontos).length > 0) {
        filhos.forEach(filho => {
            if (pontos[filho.nome] !== undefined) {
                filho.pontos = pontos[filho.nome];
            }
        });
    }
}

// Salvar dados
async function salvarDados() {
    // Salvar no localStorage (backup local)
    localStorage.setItem('filhos', JSON.stringify(filhos));
    localStorage.setItem('atividadesPositivas', JSON.stringify(atividadesPositivas));
    localStorage.setItem('atividadesNegativas', JSON.stringify(atividadesNegativas));
    localStorage.setItem('historico', JSON.stringify(historico));
    console.log('💾 Dados salvos no localStorage');
    
    // Atualizar pontos baseado nos filhos
    filhos.forEach(filho => {
        pontos[filho.nome] = filho.pontos || 0;
    });
    
    // Tentar salvar no servidor
    const salvouServidor = await salvarNoServidor();
    if (salvouServidor) {
        console.log('☁️ Dados sincronizados com o servidor');
    } else {
        console.log('⚠️ Dados salvos apenas localmente');
    }
}

// Atualizar tela quando necessário
async function atualizarTela() {
    console.log('📺 Executando atualizarTela()');
    
    // Carregar pontos do servidor se disponível
    try {
        await carregarPontosServidor();
    } catch (error) {
        console.log('⚠️ Servidor não disponível, usando dados locais');
    }
    
    // Atualizar interface completa
    console.log('📝 Atualizando interface...');
    atualizarInterface();
    
    // Carregar e atualizar atividades se existirem
    if (typeof carregarAtividades === 'function') {
        carregarAtividades();
    }
    if (typeof atualizarAtividades === 'function') {
        atualizarAtividades();
    }
    
    // Atualizar histórico
    try {
        await carregarHistoricoServidor();
    } catch (error) {
        console.log('⚠️ Servidor não disponível para histórico');
    }
    aplicarFiltrosHistorico();
}

// Carregar pontos do servidor
async function carregarPontosServidor() {
    try {
        const response = await fetch('/api/pontos');
        const data = await response.json();
        
        // Atualizar pontos dos filhos baseado nos dados do servidor
        filhos.forEach(filho => {
            // Tentar encontrar os pontos no servidor pelo nome do filho
            const nomeKey = filho.nome.toLowerCase();
            if (data[nomeKey] !== undefined) {
                filho.pontos = data[nomeKey];
            }
        });
        
        salvarDados();
        
        console.log('✅ Pontos carregados do servidor');
    } catch (error) {
        console.log('⚠️ Servidor não disponível, usando dados locais');
        // Não é um erro crítico, apenas significa que o servidor não está disponível
    }
}

// Carregar histórico do servidor
async function carregarHistoricoServidor() {
    try {
        const response = await fetch('/api/historico');
        const data = await response.json();
        
        // Verificar se recebemos um objeto com propriedade 'historico' ou um array direto
        if (data.historico && Array.isArray(data.historico)) {
            historico = data.historico;
        } else if (Array.isArray(data)) {
            historico = data;
        } else {
            console.warn('⚠️ Formato de histórico inesperado:', data);
            historico = [];
        }
        
        console.log('✅ Histórico carregado do servidor:', historico.length, 'itens');
        
        // Salvar localmente
        localStorage.setItem('historico', JSON.stringify(historico));
        
    } catch (error) {
        console.log('⚠️ Servidor não disponível para histórico, usando dados locais');
        // Carregar do localStorage se servidor não estiver disponível
        const historicoLocal = localStorage.getItem('historico');
        if (historicoLocal) {
            historico = JSON.parse(historicoLocal);
        } else {
            historico = [];
        }
    }
}

// Funções do Modal de Configurações
function abrirModalConfiguracoes() {
    const modal = document.getElementById('modal-configuracoes');
    if (modal) {
        modal.style.display = 'block';
        carregarConfiguracoesNoModal();
    }
}

function fecharModalConfiguracoes() {
    const modal = document.getElementById('modal-configuracoes');
    if (modal) {
        modal.style.display = 'none';
    }
}

function carregarConfiguracoesNoModal() {
    // Renderizar lista de filhos na aba de filhos
    renderizarListaFilhos();
    // Ativar a aba filhos por padrão
    ativarTab('filhos');
}

function ativarTab(tabId) {
    // Remover classe active de todos os botões e conteúdos
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Ativar botão e conteúdo selecionados
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

// Renderizar lista de filhos no modal
function renderizarListaFilhos() {
    const container = document.getElementById('lista-filhos');
    if (!container) {
        // Criar container se não existir
        const tabFilhos = document.getElementById('tab-filhos');
        if (tabFilhos) {
            tabFilhos.innerHTML = `
                <h3>👥 Gerenciar Filhos</h3>
                <div class="config-group">
                    <h4>➕ Adicionar Novo Filho</h4>
                    <div class="novo-filho-form">
                        <div class="input-group">
                            <label>Nome:</label>
                            <input type="text" id="novo-filho-nome" class="form-control" placeholder="Nome do filho">
                        </div>
                        <div class="input-group">
                            <label>Emoji:</label>
                            <select id="novo-filho-emoji" class="form-control">
                                <option value="👦">👦 Menino</option>
                                <option value="👧">👧 Menina</option>
                                <option value="👶">👶 Bebê</option>
                                <option value="🧒">🧒 Criança</option>
                                <option value="👨">👨 Homem</option>
                                <option value="👩">👩 Mulher</option>
                                <option value="🎓">🎓 Estudante</option>
                                <option value="⭐">⭐ Estrela</option>
                                <option value="🌟">🌟 Brilhante</option>
                                <option value="💎">💎 Diamante</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>Cor do tema:</label>
                            <select id="novo-filho-cor" class="form-control">
                                ${coresDisponiveis.map((cor, index) => 
                                    `<option value="${index}">${cor.nome}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <button onclick="adicionarNovoFilho()" class="btn btn-success">➕ Adicionar Filho</button>
                    </div>
                </div>
                <div class="config-group">
                    <h4>👥 Filhos Cadastrados</h4>
                    <div id="lista-filhos" class="lista-filhos"></div>
                </div>
            `;
        }
        return renderizarListaFilhos(); // Chamar novamente após criar o container
    }
    
    container.innerHTML = '';
    
    if (filhos.length === 0) {
        container.innerHTML = '<p class="texto-vazio">Nenhum filho cadastrado ainda.</p>';
        return;
    }
    
    filhos.forEach(filho => {
        const filhoItem = document.createElement('div');
        filhoItem.className = 'filho-item';
        filhoItem.innerHTML = `
            <div class="filho-info" style="border-left: 4px solid ${filho.cor.valor}">
                <div class="filho-avatar" style="background: ${filho.cor.gradiente}">
                    ${filho.emoji}
                </div>
                <div class="filho-dados">
                    <div class="filho-nome">${filho.nome}</div>
                    <div class="filho-pontos">${filho.pontos} pontos</div>
                    <div class="filho-cor">${filho.cor.nome}</div>
                </div>
            </div>
            <div class="filho-acoes">
                <button onclick="editarFilho(${filho.id})" class="btn-edit">✏️</button>
                <button onclick="removerFilho(${filho.id})" class="btn-delete">🗑️</button>
            </div>
        `;
        container.appendChild(filhoItem);
    });
}

// Adicionar novo filho
function adicionarNovoFilho() {
    const nome = document.getElementById('novo-filho-nome').value.trim();
    const emoji = document.getElementById('novo-filho-emoji').value;
    const corIndex = parseInt(document.getElementById('novo-filho-cor').value);
    
    if (!nome) {
        mostrarNotificacao('❌ Por favor, insira um nome para o filho', 'error');
        return;
    }
    
    // Verificar se já existe um filho com este nome
    if (filhos.some(f => f.nome.toLowerCase() === nome.toLowerCase())) {
        mostrarNotificacao('❌ Já existe um filho com este nome', 'error');
        return;
    }
    
    const novoFilho = {
        id: gerarNovoId(),
        nome: nome,
        emoji: emoji,
        cor: coresDisponiveis[corIndex],
        pontos: 0
    };
    
    filhos.push(novoFilho);
    salvarDados();
    
    // Limpar formulário
    document.getElementById('novo-filho-nome').value = '';
    document.getElementById('novo-filho-emoji').value = '👦';
    document.getElementById('novo-filho-cor').value = '0';
    
    // Atualizar interface
    renderizarListaFilhos();
    atualizarInterface();
    
    mostrarNotificacao(`✅ ${nome} foi adicionado com sucesso!`, 'success');
}

// Editar filho
function editarFilho(id) {
    const filho = encontrarFilho(id);
    if (!filho) return;
    
    const novoNome = prompt('Novo nome:', filho.nome);
    if (!novoNome || novoNome.trim() === '') return;
    
    // Verificar se já existe outro filho com este nome
    if (filhos.some(f => f.id !== id && f.nome.toLowerCase() === novoNome.toLowerCase())) {
        mostrarNotificacao('❌ Já existe um filho com este nome', 'error');
        return;
    }
    
    const novoEmoji = prompt('Novo emoji:', filho.emoji);
    if (!novoEmoji) return;
    
    const corOptions = coresDisponiveis.map((cor, index) => `${index}: ${cor.nome}`).join('\n');
    const novaCor = prompt(`Nova cor (0-${coresDisponiveis.length-1}):\n${corOptions}`, coresDisponiveis.findIndex(c => c.nome === filho.cor.nome));
    if (novaCor === null) return;
    
    const corIndex = parseInt(novaCor);
    if (isNaN(corIndex) || corIndex < 0 || corIndex >= coresDisponiveis.length) {
        mostrarNotificacao('❌ Cor inválida', 'error');
        return;
    }
    
    filho.nome = novoNome.trim();
    filho.emoji = novoEmoji;
    filho.cor = coresDisponiveis[corIndex];
    
    salvarDados();
    renderizarListaFilhos();
    atualizarInterface();
    
    mostrarNotificacao(`✅ ${filho.nome} foi editado com sucesso!`, 'success');
}

// Remover filho
function removerFilho(id) {
    const filho = encontrarFilho(id);
    if (!filho) return;
    
    if (!confirm(`Tem certeza que deseja remover ${filho.nome}? Esta ação não pode ser desfeita.`)) {
        return;
    }
    
    // Adicionar log antes de remover
    adicionarLog('remover_filho', {
        filho: filho.nome,
        pontos_finais: filho.pontos,
        cor: filho.cor
    });
    
    // Remover filho da lista
    filhos = filhos.filter(f => f.id !== id);
    
    // Remover do histórico também
    historico = historico.filter(h => h.nome !== filho.nome);
    
    salvarDados();
    renderizarListaFilhos();
    atualizarInterface();
    
    mostrarNotificacao(`🗑️ ${filho.nome} foi removido do sistema`, 'warning');
}

function salvarConfiguracoes() {
    salvarDados();
    
    // Fechar modal
    fecharModalConfiguracoes();
    
    // Mostrar notificação
    mostrarNotificacao('✅ Configurações salvas com sucesso!', 'success');
}

// Configurar eventos
function configurarEventos() {
    console.log('⚙️ Configurando eventos...');
    
    // Botão configurações
    const btnConfiguracoes = document.getElementById('btn-configuracoes');
    if (btnConfiguracoes) {
        btnConfiguracoes.addEventListener('click', abrirModalConfiguracoes);
        console.log('✅ Event listener adicionado para btn-configuracoes');
    }
    
    // Modal de configurações
    const modalConfiguracoes = document.getElementById('modal-configuracoes');
    const fecharModal = document.getElementById('fechar-modal');
    const cancelarConfig = document.getElementById('btn-cancelar-config');
    const salvarConfig = document.getElementById('btn-salvar-config');
    const btnBaixarLog = document.getElementById('btn-baixar-log');
    const btnResetarPontos = document.getElementById('btn-resetar-pontos');
    
    if (fecharModal) {
        fecharModal.addEventListener('click', fecharModalConfiguracoes);
    }
    if (cancelarConfig) {
        cancelarConfig.addEventListener('click', fecharModalConfiguracoes);
    }
    if (salvarConfig) {
        salvarConfig.addEventListener('click', salvarConfiguracoes);
    }
    if (btnBaixarLog) {
        btnBaixarLog.addEventListener('click', baixarLog);
    }
    if (btnResetarPontos) {
        btnResetarPontos.addEventListener('click', resetarPontos);
    }
    
    // Fechar modal clicando fora
    if (modalConfiguracoes) {
        modalConfiguracoes.addEventListener('click', function(e) {
            if (e.target === modalConfiguracoes) {
                fecharModalConfiguracoes();
            }
        });
    }
    
    // Tabs do modal
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            ativarTab(tabId);
        });
    });
    
    // Botão adicionar pontos
    const btnAdicionar = document.getElementById('btn-adicionar');
    if (btnAdicionar) {
        btnAdicionar.addEventListener('click', handleAdicionarPontos);
        console.log('✅ Event listener adicionado para btn-adicionar');
    }
    
    // Botão remover pontos
    const btnRemover = document.getElementById('btn-remover');
    if (btnRemover) {
        btnRemover.addEventListener('click', handleRemoverPontos);
        console.log('✅ Event listener adicionado para btn-remover');
    }
    
    // Pontos avulsos
    const btnAvulsoAdd = document.getElementById('btn-avulso-add');
    if (btnAvulsoAdd) {
        btnAvulsoAdd.addEventListener('click', handleAvulsoAdd);
        console.log('✅ Event listener adicionado para btn-avulso-add');
    }
    
    const btnAvulsoRemove = document.getElementById('btn-avulso-remove');
    if (btnAvulsoRemove) {
        btnAvulsoRemove.addEventListener('click', handleAvulsoRemove);
        console.log('✅ Event listener adicionado para btn-avulso-remove');
    }
    
    // Botões de compartilhamento
    const btnCompartilhar = document.getElementById('btn-compartilhar');
    if (btnCompartilhar) {
        btnCompartilhar.addEventListener('click', handleCompartilharHistorico);
        console.log('✅ Event listener adicionado para btn-compartilhar');
    }
    
    // Filtro de histórico
    const filtroFilho = document.getElementById('filtro-filho');
    if (filtroFilho) {
        filtroFilho.addEventListener('change', handleFiltroHistorico);
        console.log('✅ Event listener adicionado para filtro-filho');
    }
    
    // Filtro de período
    const filtroPeriodo = document.getElementById('filtro-periodo');
    if (filtroPeriodo) {
        filtroPeriodo.addEventListener('change', handleFiltroPeriodo);
        console.log('✅ Event listener adicionado para filtro-periodo');
    }
    
    // Filtros de data personalizada
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');
    if (dataInicio && dataFim) {
        dataInicio.addEventListener('change', handleFiltroHistorico);
        dataFim.addEventListener('change', handleFiltroHistorico);
        console.log('✅ Event listeners adicionados para datas personalizadas');
    }
    
    console.log('✅ Configuração de eventos concluída');
}

// Configurar event listeners
function setupEventListeners() {
    // Event listeners para adicionar pontos
    document.getElementById('btn-adicionar').addEventListener('click', handleAdicionarPontos);
    document.getElementById('btn-remover').addEventListener('click', handleRemoverPontos);
    
    // Event listeners para pontos avulsos
    document.getElementById('btn-avulso-add').addEventListener('click', handleAvulsoAdd);
    document.getElementById('btn-avulso-remove').addEventListener('click', handleAvulsoRemove);
    
    // Event listeners para atividades
    document.getElementById('atividade-adicionar').addEventListener('change', handleAtividadeChange);
    document.getElementById('atividade-remover').addEventListener('change', handleAtividadeChange);
    
    // Event listeners para gerenciador de atividades
    document.getElementById('btn-adicionar-atividade').addEventListener('click', adicionarAtividade);
    document.getElementById('btn-editar-atividade').addEventListener('click', editarAtividade);
    document.getElementById('btn-excluir-atividade').addEventListener('click', excluirAtividade);
    
    // Event listeners para nomes
    document.getElementById('btn-salvar-nomes').addEventListener('click', salvarNomes);
    
    // Event listener para compartilhar histórico
    document.getElementById('btn-compartilhar').addEventListener('click', handleCompartilharHistorico);
    
    // Event listener para filtro do histórico
    document.getElementById('filtro-filho').addEventListener('change', handleFiltroHistorico);
}

// Carregar nomes do localStorage
function carregarNomes() {
    const nomesSalvos = localStorage.getItem('nomes');
    if (nomesSalvos) {
        nomes = JSON.parse(nomesSalvos);
    }
}

// Carregar atividades do localStorage
function carregarAtividades() {
    const atividadesPositivasSalvas = localStorage.getItem('atividadesPositivas');
    const atividadesNegativasSalvas = localStorage.getItem('atividadesNegativas');
    
    if (atividadesPositivasSalvas) {
        atividadesPositivas = JSON.parse(atividadesPositivasSalvas);
    }
    
    if (atividadesNegativasSalvas) {
        atividadesNegativas = JSON.parse(atividadesNegativasSalvas);
    }
}

// Salvar nomes no localStorage
function salvarNomes() {
    localStorage.setItem('nomes', JSON.stringify(nomes));
}

// Salvar atividades no localStorage
function salvarAtividades() {
    localStorage.setItem('atividadesPositivas', JSON.stringify(atividadesPositivas));
    localStorage.setItem('atividadesNegativas', JSON.stringify(atividadesNegativas));
}

// Renderizar dashboard de pontos dinâmico
function renderizarDashboard() {
    const container = document.querySelector('.pontos-display');
    if (!container) return;
    
    container.innerHTML = '';
    
    filhos.forEach(filho => {
        const filhoElement = document.createElement('div');
        filhoElement.className = 'filho-pontos';
        filhoElement.style.background = filho.cor.gradiente;
        filhoElement.innerHTML = `
            <h3><span>${filho.emoji} ${filho.nome}</span></h3>
            <span class="pontos">${filho.pontos}</span>
        `;
        container.appendChild(filhoElement);
    });
}

// Renderizar selects de filhos
function renderizarSelects() {
    const selects = [
        'filho-adicionar',
        'filho-remover', 
        'filho-avulso-add',
        'filho-avulso-remove',
        'filtro-filho'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Limpar opções existentes
        select.innerHTML = '';
        
        // Adicionar opção padrão para filtro
        if (selectId === 'filtro-filho') {
            select.innerHTML = '<option value="todos">👥 Todos os filhos</option>';
        }
        
        // Adicionar filhos
        filhos.forEach(filho => {
            const option = document.createElement('option');
            option.value = filho.id;
            option.textContent = `${filho.emoji} ${filho.nome}`;
            select.appendChild(option);
        });
    });
}

// Atualizar toda a interface
function atualizarInterface() {
    renderizarDashboard();
    renderizarSelects();
    renderizarListaFilhos();
}

// Encontrar filho por ID
function encontrarFilho(id) {
    return filhos.find(filho => filho.id == id);
}

// Gerar ID único para novo filho
function gerarNovoId() {
    return filhos.length > 0 ? Math.max(...filhos.map(f => f.id)) + 1 : 1;
}

// Atualizar atividades na interface
function atualizarAtividades() {
    // Atualizar selects de atividades
    const selectAdicionar = document.getElementById('atividade-adicionar');
    const selectRemover = document.getElementById('atividade-remover');
    
    // Limpar opções existentes (exceto a primeira)
    selectAdicionar.innerHTML = '<option value="">Selecione a atividade</option><option value="personalizada">➕ Nova atividade personalizada</option>';
    selectRemover.innerHTML = '<option value="">Selecione a atividade</option><option value="personalizada">➕ Nova atividade personalizada</option>';
    
    // Adicionar atividades positivas
    atividadesPositivas.forEach(atividade => {
        const option = document.createElement('option');
        option.value = atividade.id;
        option.textContent = `${atividade.nome} (+${atividade.pontos})`;
        selectAdicionar.appendChild(option);
    });
    
    // Adicionar atividades negativas
    atividadesNegativas.forEach(atividade => {
        const option = document.createElement('option');
        option.value = atividade.id;
        option.textContent = `${atividade.nome} (-${atividade.pontos})`;
        selectRemover.appendChild(option);
    });
    
    // Atualizar listas de atividades
    atualizarListaAtividades();
}

// Atualizar listas de atividades
function atualizarListaAtividades() {
    const listaPositivas = document.getElementById('lista-atividades-positivas');
    const listaNegativas = document.getElementById('lista-atividades-negativas');
    
    // Limpar listas
    listaPositivas.innerHTML = '';
    listaNegativas.innerHTML = '';
    
    // Adicionar atividades positivas
    atividadesPositivas.forEach(atividade => {
        const item = criarItemAtividade(atividade, 'positiva');
        listaPositivas.appendChild(item);
    });
    
    // Adicionar atividades negativas
    atividadesNegativas.forEach(atividade => {
        const item = criarItemAtividade(atividade, 'negativa');
        listaNegativas.appendChild(item);
    });
}

// Criar item de atividade
function criarItemAtividade(atividade, tipo) {
    const item = document.createElement('div');
    item.className = 'atividade-item';
    item.dataset.id = atividade.id;
    
    item.innerHTML = `
        <div class="atividade-info">
            <div class="atividade-nome">${atividade.nome}</div>
            <div class="atividade-pontos">${tipo === 'positiva' ? '+' : '-'}${atividade.pontos} pontos</div>
        </div>
        <div class="atividade-acoes">
            <button class="btn-edit" onclick="editarAtividade(${atividade.id}, '${tipo}')">✏️</button>
            <button class="btn-delete" onclick="deletarAtividade(${atividade.id}, '${tipo}')">🗑️</button>
        </div>
    `;
    
    return item;
}

// Editar atividade
function editarAtividade(id, tipo) {
    const atividades = tipo === 'positiva' ? atividadesPositivas : atividadesNegativas;
    const atividade = atividades.find(a => a.id === id);
    
    if (!atividade) return;
    
    const novoNome = prompt('Novo nome da atividade:', atividade.nome);
    if (!novoNome) return;
    
    const novosPontos = parseInt(prompt('Novos pontos:', atividade.pontos));
    if (isNaN(novosPontos) || novosPontos < 1) return;
    
    atividade.nome = novoNome;
    atividade.pontos = novosPontos;
    
    salvarAtividades();
    atualizarAtividades();
    mostrarNotificacao('✅ Atividade editada com sucesso!', 'success');
}

// Deletar atividade
function deletarAtividade(id, tipo) {
    if (!confirm('Tem certeza que quer deletar esta atividade?')) return;
    
    if (tipo === 'positiva') {
        atividadesPositivas = atividadesPositivas.filter(a => a.id !== id);
    } else {
        atividadesNegativas = atividadesNegativas.filter(a => a.id !== id);
    }
    
    salvarAtividades();
    atualizarAtividades();
    mostrarNotificacao('🗑️ Atividade deletada!', 'warning');
}

// Nova atividade positiva
function handleNovaAtividadePositiva(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nova-atividade-positiva').value;
    const pontos = parseInt(document.getElementById('pontos-atividade-positiva').value);
    
    if (!nome || isNaN(pontos) || pontos < 1) {
        alert('Por favor, preencha todos os campos corretamente!');
        return;
    }
    
    const novaAtividade = {
        id: Date.now(),
        nome: nome,
        pontos: pontos
    };
    
    atividadesPositivas.push(novaAtividade);
    salvarAtividades();
    atualizarAtividades();
    
    // Limpar formulário
    e.target.reset();
    document.getElementById('pontos-atividade-positiva').value = '10';
    
    mostrarNotificacao('✅ Atividade positiva adicionada!', 'success');
}

// Nova atividade negativa
function handleNovaAtividadeNegativa(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nova-atividade-negativa').value;
    const pontos = parseInt(document.getElementById('pontos-atividade-negativa').value);
    
    if (!nome || isNaN(pontos) || pontos < 1) {
        alert('Por favor, preencha todos os campos corretamente!');
        return;
    }
    
    const novaAtividade = {
        id: Date.now(),
        nome: nome,
        pontos: pontos
    };
    
    atividadesNegativas.push(novaAtividade);
    salvarAtividades();
    atualizarAtividades();
    
    // Limpar formulário
    e.target.reset();
    document.getElementById('pontos-atividade-negativa').value = '5';
    
    mostrarNotificacao('✅ Atividade negativa adicionada!', 'success');
}

// Atividade selecionada para adicionar
function handleAtividadeAdicionar(e) {
    const atividadeId = e.target.value;
    
    if (atividadeId === 'personalizada') {
        document.getElementById('motivo-adicionar').focus();
        return;
    }
    
    const atividade = atividadesPositivas.find(a => a.id === parseInt(atividadeId));
    if (atividade) {
        document.getElementById('pontos-adicionar').value = atividade.pontos;
        document.getElementById('motivo-adicionar').value = atividade.nome;
    }
}

// Atividade selecionada para remover
function handleAtividadeRemover(e) {
    const atividadeId = e.target.value;
    
    if (atividadeId === 'personalizada') {
        document.getElementById('motivo-remover').focus();
        return;
    }
    
    const atividade = atividadesNegativas.find(a => a.id === parseInt(atividadeId));
    if (atividade) {
        document.getElementById('pontos-remover').value = atividade.pontos;
        document.getElementById('motivo-remover').value = atividade.nome;
    }
}

// Salvar nomes
function handleSalvarNomes(e) {
    e.preventDefault();
    
    nomes.filho1 = document.getElementById('nome1').value;
    nomes.filho2 = document.getElementById('nome2').value;
    nomes.filho3 = document.getElementById('nome3').value;
    
    salvarNomes();
    atualizarNomes();
    
    mostrarNotificacao('✅ Nomes salvos com sucesso!', 'success');
}

// Adicionar pontos
async function handleAdicionarPontos(e) {
    e.preventDefault();
    
    const filhoId = document.getElementById('filho-adicionar').value;
    const atividadeSelect = document.getElementById('atividade-adicionar');
    
    if (!filhoId || !atividadeSelect.value) {
        mostrarNotificacao('❌ Por favor, selecione um filho e uma atividade!', 'error');
        return;
    }
    
    const atividade = JSON.parse(atividadeSelect.value);
    const filho = encontrarFilho(filhoId);
    
    if (!filho) {
        mostrarNotificacao('❌ Filho não encontrado!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/pontos/adicionar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nome: filho.nome,
                pontos: atividade.pontos,
                motivo: atividade.nome,
                tipo: 'adicionar'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Atualizar pontos localmente
            const pontosAntes = filho.pontos;
            filho.pontos += atividade.pontos;
            
            // Adicionar log da ação
            adicionarLog('adicionar_pontos', {
                filho: filho.nome,
                atividade: atividade.nome,
                pontos: atividade.pontos,
                pontos_antes: pontosAntes,
                pontos_depois: filho.pontos,
                tipo: 'positiva'
            });
            
            // Limpar formulário
            atividadeSelect.value = '';
            
            // Atualizar interface
            atualizarInterface();
            await salvarDados();
            
            mostrarNotificacao(`✅ +${atividade.pontos} pontos para ${filho.nome}!`, 'success');
        } else {
            throw new Error(data.error || 'Erro ao adicionar pontos');
        }
    } catch (error) {
        console.error('Erro ao adicionar pontos:', error);
        mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
    }
}

// Remover pontos
async function handleRemoverPontos(e) {
    e.preventDefault();
    
    const filhoId = document.getElementById('filho-remover').value;
    const atividadeSelect = document.getElementById('atividade-remover');
    
    if (!filhoId || !atividadeSelect.value) {
        mostrarNotificacao('❌ Por favor, selecione um filho e uma atividade!', 'error');
        return;
    }
    
    const atividade = JSON.parse(atividadeSelect.value);
    const filho = encontrarFilho(filhoId);
    
    if (!filho) {
        mostrarNotificacao('❌ Filho não encontrado!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/pontos/remover', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nome: filho.nome,
                pontos: atividade.pontos,
                motivo: atividade.nome,
                tipo: 'remover'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Atualizar pontos localmente (permitir pontos negativos)
            const pontosAntes = filho.pontos;
            filho.pontos -= atividade.pontos;
            
            // Adicionar log da ação
            adicionarLog('remover_pontos', {
                filho: filho.nome,
                atividade: atividade.nome,
                pontos: atividade.pontos,
                pontos_antes: pontosAntes,
                pontos_depois: filho.pontos,
                tipo: 'negativa'
            });
            
            // Limpar formulário
            atividadeSelect.value = '';
            
            // Atualizar interface
            atualizarInterface();
            await salvarDados();
            
            mostrarNotificacao(`✅ -${atividade.pontos} pontos para ${filho.nome}!`, 'success');
        } else {
            throw new Error(data.error || 'Erro ao remover pontos');
        }
    } catch (error) {
        console.error('Erro ao remover pontos:', error);
        mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
    }
}

// Resetar pontos
            
            // Atualizar histórico
// Resetar pontos
function adicionarAoHistorico(filho, pontos, motivo, tipo) {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const item = {
        data: dataFormatada,
        filho: filho,
        pontos: pontos,
        motivo: motivo,
        tipo: tipo
    };
    
    historico.unshift(item);
    
    // Manter apenas os últimos 20 itens
    if (historico.length > 20) {
        historico = historico.slice(0, 20);
    }
    
    const filtroAtual = document.getElementById('filtro-filho').value;
    atualizarHistorico(filtroAtual);
    salvarHistorico();
}

// Atualizar exibição do histórico
function atualizarHistorico(filtro = 'todos') {
    const historicoContainer = document.getElementById('historico');
    
    if (!historicoContainer) {
        console.error('Container de histórico não encontrado');
        return;
    }
    
    historicoContainer.innerHTML = '';
    
    // Filtrar histórico baseado no filtro selecionado
    let historicoFiltrado = historico;
    
    if (filtro !== 'todos') {
        const filho = encontrarFilho(filtro);
        if (filho) {
            historicoFiltrado = historico.filter(item => item.nome === filho.nome);
        }
    }
    
    if (historicoFiltrado.length === 0) {
        historicoContainer.innerHTML = `
            <div class="historico-item historico-vazio">
                <span>📝 Nenhum registro encontrado para este filtro</span>
            </div>
        `;
        return;
    }
    
    // Mostrar apenas os últimos 10 registros
    const ultimosRegistros = historicoFiltrado.slice(0, 10);
    
    ultimosRegistros.forEach(item => {
        const historicoItem = document.createElement('div');
        historicoItem.className = 'historico-item';
        
        const data = new Date(item.data);
        const dataFormatada = data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const icone = item.tipo === 'adicionar' ? '➕' : '➖';
        const acao = item.tipo === 'adicionar' ? 'ganhou' : 'perdeu';
        
        historicoItem.innerHTML = `
            <span class="data">${dataFormatada}</span>
            <span class="acao">${icone} ${item.nome} ${acao} ${item.pontos} pontos</span>
            <span class="motivo">${item.motivo}</span>
        `;
        
        historicoContainer.appendChild(historicoItem);
    });
}

// Função para lidar com o filtro do histórico
function handleFiltroHistorico() {
    aplicarFiltrosHistorico();
}

// Função para lidar com o filtro de período
function handleFiltroPeriodo() {
    const periodo = document.getElementById('filtro-periodo').value;
    const datasPersonalizadas = document.getElementById('filtro-datas-personalizadas');
    
    if (periodo === 'personalizado') {
        datasPersonalizadas.style.display = 'block';
        // Definir data padrão (últimos 30 dias)
        const hoje = new Date();
        const umMesAtras = new Date();
        umMesAtras.setDate(hoje.getDate() - 30);
        
        document.getElementById('data-fim').value = hoje.toISOString().split('T')[0];
        document.getElementById('data-inicio').value = umMesAtras.toISOString().split('T')[0];
    } else {
        datasPersonalizadas.style.display = 'none';
    }
    
    aplicarFiltrosHistorico();
}

// Função principal para aplicar todos os filtros
function aplicarFiltrosHistorico() {
    const filtroFilho = document.getElementById('filtro-filho').value;
    const filtroPeriodo = document.getElementById('filtro-periodo').value;
    
    console.log('🔍 Aplicando filtros:', { filtroFilho, filtroPeriodo });
    
    if (!historico || historico.length === 0) {
        atualizarListaHistorico([]);
        return;
    }
    
    let historicoFiltrado = [...historico];
    
    // Filtrar por filho
    if (filtroFilho !== 'todos') {
        const filhoId = parseInt(filtroFilho);
        const filhoSelecionado = filhos.find(f => f.id === filhoId);
        if (filhoSelecionado) {
            historicoFiltrado = historicoFiltrado.filter(item => 
                item.nome === filhoSelecionado.nome || 
                item.acao.includes(filhoSelecionado.nome)
            );
        }
    }
    
    // Filtrar por período
    if (filtroPeriodo !== 'todos') {
        const hoje = new Date();
        
        console.log('🗓️ Filtrando por período:', filtroPeriodo);
        console.log('📅 Data atual:', hoje);
        
        switch (filtroPeriodo) {
            case 'hoje':
                const inicioHoje = new Date();
                inicioHoje.setHours(0, 0, 0, 0);
                const fimHoje = new Date();
                fimHoje.setHours(23, 59, 59, 999);
                
                console.log('🌅 Início do dia:', inicioHoje);
                console.log('🌇 Fim do dia:', fimHoje);
                
                historicoFiltrado = historicoFiltrado.filter(item => {
                    const dataItem = new Date(item.data || item.timestamp);
                    console.log('⏰ Item data:', item.data || item.timestamp, '→ Data:', dataItem);
                    const dentroDoIntervalo = dataItem >= inicioHoje && dataItem <= fimHoje;
                    console.log('✅ Dentro do intervalo?', dentroDoIntervalo);
                    return dentroDoIntervalo;
                });
                break;
                
            case 'ontem':
                const inicioOntem = new Date();
                inicioOntem.setDate(hoje.getDate() - 1);
                inicioOntem.setHours(0, 0, 0, 0);
                const fimOntem = new Date();
                fimOntem.setDate(hoje.getDate() - 1);
                fimOntem.setHours(23, 59, 59, 999);
                
                console.log('🌅 Início de ontem:', inicioOntem);
                console.log('🌇 Fim de ontem:', fimOntem);
                
                historicoFiltrado = historicoFiltrado.filter(item => {
                    const dataItem = new Date(item.data || item.timestamp);
                    return dataItem >= inicioOntem && dataItem <= fimOntem;
                });
                break;
                
            case 'semana':
                const inicioSemana = new Date();
                inicioSemana.setDate(hoje.getDate() - 7);
                inicioSemana.setHours(0, 0, 0, 0);
                
                console.log('📅 Início da semana:', inicioSemana);
                
                historicoFiltrado = historicoFiltrado.filter(item => {
                    const dataItem = new Date(item.data || item.timestamp);
                    return dataItem >= inicioSemana;
                });
                break;
                
            case 'mes':
                const inicioMes = new Date();
                inicioMes.setDate(hoje.getDate() - 30);
                inicioMes.setHours(0, 0, 0, 0);
                
                console.log('📅 Início do mês:', inicioMes);
                
                historicoFiltrado = historicoFiltrado.filter(item => {
                    const dataItem = new Date(item.data || item.timestamp);
                    return dataItem >= inicioMes;
                });
                break;
                
            case 'personalizado':
                const dataInicio = document.getElementById('data-inicio').value;
                const dataFim = document.getElementById('data-fim').value;
                
                console.log('📅 Período personalizado:', dataInicio, 'até', dataFim);
                
                if (dataInicio && dataFim) {
                    const inicio = new Date(dataInicio);
                    inicio.setHours(0, 0, 0, 0);
                    const fim = new Date(dataFim);
                    fim.setHours(23, 59, 59, 999);
                    
                    console.log('📅 Data início:', inicio);
                    console.log('📅 Data fim:', fim);
                    
                    historicoFiltrado = historicoFiltrado.filter(item => {
                        const dataItem = new Date(item.data || item.timestamp);
                        const dentroDoIntervalo = dataItem >= inicio && dataItem <= fim;
                        console.log('⏰ Item:', dataItem, '→ Dentro?', dentroDoIntervalo);
                        return dentroDoIntervalo;
                    });
                }
                break;
        }
    }
    
    console.log('📊 Histórico filtrado:', historicoFiltrado.length, 'itens');
    atualizarListaHistorico(historicoFiltrado);
}

// Função para atualizar a lista visual do histórico
function atualizarListaHistorico(historicoFiltrado) {
    const container = document.getElementById('historico');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (historicoFiltrado.length === 0) {
        container.innerHTML = `
            <div class="historico-vazio">
                <p>📝 Nenhum registro encontrado para os filtros selecionados</p>
                <small>Tente ajustar os filtros ou adicionar novas atividades</small>
            </div>
        `;
        return;
    }
    
    // Ordenar por data (mais recente primeiro)
    historicoFiltrado.sort((a, b) => {
        const dataA = new Date(a.data || a.timestamp);
        const dataB = new Date(b.data || b.timestamp);
        return dataB - dataA;
    });
    
    historicoFiltrado.forEach(item => {
        console.log('📄 Processando item do histórico:', item);
        
        // Usar o campo correto de data
        const dataString = item.data || item.timestamp;
        const data = new Date(dataString);
        
        console.log('📅 Data string:', dataString, '→ Data objeto:', data);
        
        // Verificar se a data é válida
        if (isNaN(data.getTime())) {
            console.warn('⚠️ Data inválida encontrada:', dataString);
            return; // Pular este item
        }
        
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Criar ação formatada
        const icone = item.tipo === 'adicionar' ? '➕' : '➖';
        const acao = item.tipo === 'adicionar' ? 'ganhou' : 'perdeu';
        const acaoTexto = `${icone} ${item.nome} ${acao} ${item.pontos} pontos`;
        
        const historicoItem = document.createElement('div');
        historicoItem.className = 'historico-item';
        historicoItem.innerHTML = `
            <span class="data">${dataFormatada} ${horaFormatada}</span>
            <span class="acao">${acaoTexto}</span>
            <span class="motivo">${item.motivo || ''}</span>
        `;
        container.appendChild(historicoItem);
    });
}

// Função para compartilhar histórico - Mostra modal com opções
async function handleCompartilharHistorico() {
    try {
        // Buscar histórico completo do servidor
        await carregarHistoricoServidor();
        
        if (!historico || historico.length === 0) {
            mostrarNotificacao('📝 Nenhum histórico para compartilhar!', 'warning');
            return;
        }
        
        // Mostrar modal com opções de compartilhamento
        mostrarModalCompartilhamento();
        
    } catch (error) {
        console.error('Erro ao compartilhar histórico:', error);
        mostrarNotificacao('❌ Erro ao compartilhar histórico!', 'error');
    }
}

// Mostrar modal com opções de compartilhamento
function mostrarModalCompartilhamento() {
    // Criar modal se não existir
    let modal = document.getElementById('modal-compartilhamento');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-compartilhamento';
        modal.className = 'modal-compartilhamento';
        modal.innerHTML = `
            <div class="modal-compartilhamento-content">
                <div class="modal-compartilhamento-header">
                    <h3>📤 Compartilhar Histórico</h3>
                    <button class="modal-close" onclick="fecharModalCompartilhamento()">&times;</button>
                </div>
                <div class="modal-compartilhamento-body">
                    <p>Escolha o formato para compartilhar o histórico:</p>
                    <div class="opcoes-compartilhamento">
                        <button class="btn-opcao-compartilhamento" onclick="compartilharWhatsApp()">
                            <span class="icone">📱</span>
                            <span class="texto">WhatsApp</span>
                        </button>
                        <button class="btn-opcao-compartilhamento" onclick="compartilharTexto()">
                            <span class="icone">📋</span>
                            <span class="texto">Texto</span>
                        </button>
                        <button class="btn-opcao-compartilhamento" onclick="compartilharPDF()">
                            <span class="icone">📄</span>
                            <span class="texto">PDF</span>
                        </button>
                        <button class="btn-opcao-compartilhamento" onclick="compartilharJSON()">
                            <span class="icone">💾</span>
                            <span class="texto">JSON</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
}

// Fechar modal de compartilhamento
function fecharModalCompartilhamento() {
    const modal = document.getElementById('modal-compartilhamento');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Compartilhar via WhatsApp
async function compartilharWhatsApp() {
    try {
        const relatorio = criarRelatorioHistorico(historico);
        const texto = encodeURIComponent(relatorio.texto);
        const url = `https://wa.me/?text=${texto}`;
        window.open(url, '_blank');
        fecharModalCompartilhamento();
        mostrarNotificacao('📱 Compartilhando via WhatsApp!', 'success');
    } catch (error) {
        mostrarNotificacao('❌ Erro ao compartilhar via WhatsApp', 'error');
    }
}

// Compartilhar como texto
async function compartilharTexto() {
    try {
        const relatorio = criarRelatorioHistorico(historico);
        
        if (navigator.share) {
            await navigator.share({
                title: '📊 Relatório de Pontos - Meus Filhos',
                text: relatorio.texto
            });
        } else {
            await copiarParaAreaTransferencia(relatorio.texto);
            mostrarNotificacao('📋 Texto copiado para área de transferência!', 'success');
        }
        
        fecharModalCompartilhamento();
    } catch (error) {
        mostrarNotificacao('❌ Erro ao compartilhar texto', 'error');
    }
}

// Compartilhar como PDF
async function compartilharPDF() {
    try {
        console.log('🔍 Iniciando geração de PDF...');
        console.log('📊 Filhos:', filhos);
        console.log('📝 Histórico:', historico);
        
        // Verificar se temos dados básicos
        if (!filhos || filhos.length === 0) {
            console.log('⚠️ Nenhum filho encontrado');
            mostrarNotificacao('� Nenhum filho cadastrado para gerar PDF!', 'warning');
            return;
        }
        
        console.log('✅ Dados encontrados, gerando PDF...');
        gerarPDFSimples();
        fecharModalCompartilhamento();
        
    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        mostrarNotificacao('❌ Erro ao gerar PDF: ' + error.message, 'error');
    }
}

// Função simplificada para gerar PDF
function gerarPDFSimples() {
    try {
        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString('pt-BR');
        const horaFormatada = hoje.toLocaleTimeString('pt-BR');
        
        // Criar conteúdo HTML simplificado
        let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Relatório de Pontos - ${dataFormatada}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #4299e1;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #4299e1;
            margin: 0;
            font-size: 24px;
        }
        .pontos-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        .pontos-section h2 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .filho-linha {
            padding: 8px 12px;
            margin: 5px 0;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #4299e1;
            display: flex;
            justify-content: space-between;
        }
        .historico-section h2 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .historico-linha {
            padding: 8px 12px;
            margin: 5px 0;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid #28a745;
            font-size: 14px;
        }
        .historico-linha.negativo {
            border-left-color: #dc3545;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
            border-top: 1px solid #dee2e6;
            padding-top: 15px;
        }
        @media print {
            body { margin: 0; font-size: 12px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏆 Relatório de Pontos dos Filhos</h1>
        <p><strong>Data:</strong> ${dataFormatada} às ${horaFormatada}</p>
    </div>
    
    <div class="pontos-section">
        <h2>📊 Pontos Atuais</h2>`;
        
        // Adicionar pontos atuais
        if (filhos && filhos.length > 0) {
            filhos.forEach(filho => {
                htmlContent += `
        <div class="filho-linha">
            <span><strong>${filho.emoji || '👤'} ${filho.nome || 'Sem nome'}</strong></span>
            <span><strong>${filho.pontos || 0} pontos</strong></span>
        </div>`;
            });
        } else {
            htmlContent += '<p>Nenhum filho cadastrado</p>';
        }
        
        htmlContent += `
    </div>
    
    <div class="historico-section">
        <h2>📝 Histórico de Atividades (Últimas 20)</h2>`;
        
        // Adicionar histórico
        if (historico && historico.length > 0) {
            const ultimosRegistros = historico.slice(0, 20);
            ultimosRegistros.forEach(item => {
                try {
                    const data = item.timestamp ? new Date(item.timestamp) : new Date();
                    const dataStr = data.toLocaleDateString('pt-BR');
                    const horaStr = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const acao = item.acao || 'Ação não especificada';
                    const isNegativo = acao.includes('perdeu') || acao.includes('removeu') || acao.includes('Remove');
                    
                    htmlContent += `
        <div class="historico-linha ${isNegativo ? 'negativo' : ''}">
            <strong>${dataStr} ${horaStr}</strong> - ${acao}
            ${item.motivo ? '<br><em>' + item.motivo + '</em>' : ''}
        </div>`;
                } catch (e) {
                    console.warn('Erro ao processar item do histórico:', e);
                }
            });
        } else {
            htmlContent += '<p>Nenhum histórico disponível</p>';
        }
        
        htmlContent += `
    </div>
    
    <div class="footer">
        <p>Relatório gerado pelo Sistema de Pontos</p>
        <p>${filhos.length} filhos cadastrados • ${historico.length} atividades registradas</p>
    </div>
</body>
</html>`;
        
        // Abrir nova janela para impressão
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Aguardar carregamento e imprimir
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.print();
                    // Não fechar automaticamente para permitir salvar como PDF
                }, 500);
            };
            
            mostrarNotificacao('📄 PDF aberto para impressão/salvamento!', 'success');
        } else {
            throw new Error('Não foi possível abrir janela de impressão');
        }
        
    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        mostrarNotificacao('❌ Erro ao gerar PDF: ' + error.message, 'error');
    }
}

// Compartilhar como JSON
async function compartilharJSON() {
    try {
        salvarArquivoJSON(historico);
        fecharModalCompartilhamento();
        mostrarNotificacao('💾 Arquivo JSON baixado!', 'success');
    } catch (error) {
        mostrarNotificacao('❌ Erro ao gerar JSON', 'error');
    }
}

// Criar relatório formatado do histórico
function criarRelatorioHistorico(historico) {
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR');
    
    let texto = `📊 RELATÓRIO DE PONTOS - ${dataFormatada}\n\n`;
    texto += `🏆 PONTOS ATUAIS:\n`;
    
    filhos.forEach(filho => {
        texto += `${filho.emoji} ${filho.nome}: ${filho.pontos} pontos\n`;
    });
    
    texto += `\n📝 HISTÓRICO RECENTE:\n`;
    
    // Mostrar últimos 10 registros
    const ultimosRegistros = historico.slice(0, 10);
    ultimosRegistros.forEach(registro => {
        const data = new Date(registro.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const hora = data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const icone = registro.tipo === 'adicionar' ? '➕' : '➖';
        
        texto += `${dataFormatada} ${hora} - ${icone} ${registro.nome}: ${registro.pontos} pontos\n`;
        texto += `   Motivo: ${registro.motivo}\n\n`;
    });
    
    return { texto };
}

// Copiar texto para área de transferência
async function copiarParaAreaTransferencia(texto) {
    try {
        await navigator.clipboard.writeText(texto);
    } catch (error) {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = texto;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

// Salvar arquivo JSON
function salvarArquivoJSON(dados) {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { 
        type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-pontos-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Função para gerar e baixar PDF do histórico
async function handleCompartilharPDF() {
    try {
        await carregarHistoricoServidor();
        
        if (!historico || historico.length === 0) {
            mostrarNotificacao('📝 Nenhum histórico para gerar PDF!', 'warning');
            return;
        }
        
        gerarPDFSimples(historico);
    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        mostrarNotificacao('❌ Erro ao gerar PDF', 'error');
    }
}

// Função para gerar PDF real usando HTML
function gerarPDFReal(historico) {
    try {
        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString('pt-BR');
        const horaFormatada = hoje.toLocaleTimeString('pt-BR');
        
        // Criar conteúdo HTML para o PDF
        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Pontos - ${dataFormatada}</title>
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        margin: 20px;
                        color: #333;
                        line-height: 1.6;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #667eea;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        color: #667eea;
                        margin: 0;
                        font-size: 28px;
                    }
                    .header p {
                        margin: 5px 0;
                        color: #666;
                    }
                    .pontos-atuais {
                        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                        padding: 20px;
                        border-radius: 10px;
                        margin-bottom: 30px;
                    }
                    .pontos-atuais h2 {
                        color: #495057;
                        margin-bottom: 15px;
                        font-size: 20px;
                    }
                    .filho-item {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 15px;
                        margin: 8px 0;
                        background: white;
                        border-radius: 8px;
                        border-left: 4px solid #667eea;
                    }
                    .filho-nome {
                        font-weight: bold;
                        font-size: 16px;
                    }
                    .filho-pontos {
                        color: #667eea;
                        font-weight: bold;
                        font-size: 16px;
                    }
                    .historico-section {
                        margin-top: 30px;
                    }
                    .historico-section h2 {
                        color: #495057;
                        margin-bottom: 20px;
                        font-size: 20px;
                    }
                    .historico-item {
                        display: flex;
                        justify-content: space-between;
                        padding: 12px 15px;
                        margin: 5px 0;
                        background: #f8f9fa;
                        border-radius: 8px;
                        border-left: 3px solid #28a745;
                    }
                    .historico-item.negativo {
                        border-left-color: #dc3545;
                    }
                    .historico-data {
                        font-size: 12px;
                        color: #6c757d;
                    }
                    .historico-acao {
                        font-weight: 500;
                        flex: 1;
                        margin: 0 15px;
                    }
                    .historico-pontos {
                        font-weight: bold;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        color: #6c757d;
                        font-size: 12px;
                        border-top: 1px solid #dee2e6;
                        padding-top: 20px;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🏆 Relatório de Pontos</h1>
                    <p><strong>Data:</strong> ${dataFormatada} às ${horaFormatada}</p>
                    <p><strong>Sistema:</strong> Gerenciamento de Pontos dos Filhos</p>
                </div>
                
                <div class="pontos-atuais">
                    <h2>📊 Pontos Atuais</h2>`;
        
        // Adicionar pontos atuais de cada filho
        filhos.forEach(filho => {
            htmlContent += `
                    <div class="filho-item">
                        <span class="filho-nome">${filho.emoji} ${filho.nome}</span>
                        <span class="filho-pontos">${filho.pontos} pontos</span>
                    </div>`;
        });
        
        htmlContent += `
                </div>
                
                <div class="historico-section">
                    <h2>📝 Histórico de Atividades</h2>`;
        
        // Adicionar histórico
        if (historico && historico.length > 0) {
            historico.slice(0, 50).forEach(item => { // Limitar a 50 itens mais recentes
                const data = new Date(item.timestamp).toLocaleDateString('pt-BR');
                const hora = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const isNegativo = item.acao.includes('perdeu') || item.acao.includes('removeu');
                
                htmlContent += `
                    <div class="historico-item ${isNegativo ? 'negativo' : ''}">
                        <span class="historico-data">${data} ${hora}</span>
                        <span class="historico-acao">${item.acao}</span>
                        <span class="historico-pontos">${item.motivo || ''}</span>
                    </div>`;
            });
        } else {
            htmlContent += '<p style="text-align: center; color: #6c757d;">Nenhum histórico disponível</p>';
        }
        
        htmlContent += `
                </div>
                
                <div class="footer">
                    <p>Relatório gerado automaticamente pelo Sistema de Pontos</p>
                    <p>Total de ${filhos.length} filhos • ${historico.length} atividades registradas</p>
                </div>
            </body>
            </html>`;
        
        // Abrir nova janela e imprimir
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Aguardar carregamento e imprimir
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        };
        
        mostrarNotificacao('📄 PDF sendo gerado para impressão/salvamento!', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        mostrarNotificacao('❌ Erro ao gerar PDF', 'error');
    }
}

// Carregar pontos do servidor
async function carregarPontos() {
    try {
        const response = await fetch('/api/pontos');
        const data = await response.json();
        
        pontosFilho1 = data.joao || 0;
        pontosFilho2 = data.maria || 0;
        pontosFilho3 = data.pedro || 0;
        
        document.getElementById('pontos-filho1').textContent = pontosFilho1;
        document.getElementById('pontos-filho2').textContent = pontosFilho2;
        document.getElementById('pontos-filho3').textContent = pontosFilho3;
        
        // Salvar no localStorage como backup
        localStorage.setItem('pontosFilho1', pontosFilho1.toString());
        localStorage.setItem('pontosFilho2', pontosFilho2.toString());
        localStorage.setItem('pontosFilho3', pontosFilho3.toString());
    } catch (error) {
        console.error('Erro ao carregar pontos:', error);
        // Fallback para localStorage
        const pontosFilho1Salvo = localStorage.getItem('pontosFilho1');
        const pontosFilho2Salvo = localStorage.getItem('pontosFilho2');
        const pontosFilho3Salvo = localStorage.getItem('pontosFilho3');
        
        if (pontosFilho1Salvo) {
            pontosFilho1 = parseInt(pontosFilho1Salvo);
            document.getElementById('pontos-filho1').textContent = pontosFilho1;
        }
        
        if (pontosFilho2Salvo) {
            pontosFilho2 = parseInt(pontosFilho2Salvo);
            document.getElementById('pontos-filho2').textContent = pontosFilho2;
        }
        
        if (pontosFilho3Salvo) {
            pontosFilho3 = parseInt(pontosFilho3Salvo);
            document.getElementById('pontos-filho3').textContent = pontosFilho3;
        }
    }
}

// Salvar pontos no localStorage
function salvarPontos() {
    localStorage.setItem('pontosFilho1', pontosFilho1.toString());
    localStorage.setItem('pontosFilho2', pontosFilho2.toString());
    localStorage.setItem('pontosFilho3', pontosFilho3.toString());
}

// Carregar histórico do localStorage
function carregarHistorico() {
    const historicoSalvo = localStorage.getItem('historico');
    if (historicoSalvo) {
        historico = JSON.parse(historicoSalvo);
        const filtroAtual = document.getElementById('filtro-filho').value;
        atualizarHistorico(filtroAtual);
    }
}

// Salvar histórico no localStorage
function salvarHistorico() {
    localStorage.setItem('historico', JSON.stringify(historico));
}

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo) {
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    notificacao.textContent = mensagem;
    
    // Estilos da notificação
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    
    // Cores baseadas no tipo
    if (tipo === 'success') {
        notificacao.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    } else if (tipo === 'warning') {
        notificacao.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    } else {
        notificacao.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)';
    }
    
    document.body.appendChild(notificacao);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notificacao.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notificacao.parentNode) {
                notificacao.parentNode.removeChild(notificacao);
            }
        }, 300);
    }, 3000);
}

// Adicionar estilos CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Função para lidar com o filtro do histórico
function handleFiltroHistorico() {
    const filtroSelecionado = document.getElementById('filtro-filho').value;
    atualizarHistorico(filtroSelecionado);
}

// Criar relatório formatado do histórico
function criarRelatorioHistorico(historico) {
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR');
    
    let texto = `📊 RELATÓRIO DE PONTOS - ${dataFormatada}\n\n`;
    texto += `🏆 PONTOS ATUAIS:\n`;
    
    // Usar o array dinâmico de filhos
    filhos.forEach(filho => {
        texto += `${filho.emoji} ${filho.nome}: ${filho.pontos} pontos\n`;
    });
    
    texto += `\n📝 HISTÓRICO RECENTE:\n`;
    
    // Mostrar últimos 10 registros
    const ultimosRegistros = historico.slice(0, 10);
    ultimosRegistros.forEach(registro => {
        const data = new Date(registro.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const hora = data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const icone = registro.tipo === 'adicionar' ? '➕' : '➖';
        
        texto += `${dataFormatada} ${hora} - ${icone} ${registro.nome}: ${registro.pontos} pontos\n`;
        texto += `   Motivo: ${registro.motivo}\n\n`;
    });
    
    return { texto };
}

// Copiar texto para área de transferência
async function copiarParaAreaTransferencia(texto) {
    try {
        await navigator.clipboard.writeText(texto);
    } catch (error) {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = texto;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

// Salvar arquivo JSON
function salvarArquivoJSON(dados) {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { 
        type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-pontos-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Função para lidar com pontos avulsos - adicionar
async function handleAvulsoAdd() {
    const filhoId = document.getElementById('filho-avulso-add').value;
    const pontosValor = parseInt(document.getElementById('pontos-avulso-add').value) || 1;
    const motivo = document.getElementById('motivo-avulso-add').value.trim();
    
    if (!motivo) {
        mostrarNotificacao('❌ Por favor, informe um motivo', 'error');
        return;
    }
    
    const filho = encontrarFilho(filhoId);
    if (!filho) {
        mostrarNotificacao('❌ Filho não encontrado!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/pontos/adicionar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: filho.nome,
                pontos: pontosValor,
                motivo: motivo
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Atualizar pontos localmente
            filho.pontos += pontosValor;
            
            // Limpar campos
            document.getElementById('motivo-avulso-add').value = '';
            document.getElementById('pontos-avulso-add').value = '1';
            
            // Atualizar interface
            atualizarInterface();
            salvarDados();
            
            // Atualizar histórico
            await carregarHistoricoServidor();
            atualizarHistorico(document.getElementById('filtro-filho').value);
            
            mostrarNotificacao(`✅ ${pontosValor} pontos adicionados para ${filho.nome}!`, 'success');
        } else {
            mostrarNotificacao(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        // Fallback local
        filho.pontos += pontosValor;
        atualizarInterface();
        salvarDados();
        mostrarNotificacao(`✅ ${pontosValor} pontos adicionados para ${filho.nome}! (modo offline)`, 'success');
    }
}

// Função para lidar com pontos avulsos - remover
async function handleAvulsoRemove() {
    const filhoId = document.getElementById('filho-avulso-remove').value;
    const pontosValor = parseInt(document.getElementById('pontos-avulso-remove').value) || 1;
    const motivo = document.getElementById('motivo-avulso-remove').value.trim();
    
    if (!motivo) {
        mostrarNotificacao('❌ Por favor, informe um motivo', 'error');
        return;
    }
    
    const filho = encontrarFilho(filhoId);
    if (!filho) {
        mostrarNotificacao('❌ Filho não encontrado!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/pontos/remover', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: filho.nome,
                pontos: pontosValor,
                motivo: motivo
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Atualizar pontos localmente (permitir pontos negativos)
            filho.pontos -= pontosValor;
            
            // Limpar campos
            document.getElementById('motivo-avulso-remove').value = '';
            document.getElementById('pontos-avulso-remove').value = '1';
            
            // Atualizar interface
            atualizarInterface();
            salvarDados();
            
            // Atualizar histórico
            await carregarHistoricoServidor();
            atualizarHistorico(document.getElementById('filtro-filho').value);
            
            mostrarNotificacao(`➖ ${pontosValor} pontos removidos de ${filho.nome}!`, 'warning');
        } else {
            mostrarNotificacao(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        // Fallback local (permitir pontos negativos)
        filho.pontos -= pontosValor;
        atualizarInterface();
        salvarDados();
        mostrarNotificacao(`➖ ${pontosValor} pontos removidos de ${filho.nome}! (modo offline)`, 'warning');
    }
}

// Função para gerar e baixar PDF do histórico
function handleCompartilharPDF() {
    // Usar dados locais se disponíveis, senão tentar servidor
    if (historico && historico.length > 0) {
        gerarPDF(historico);
    } else {
        fetch('/api/historico')
            .then(response => response.json())
            .then(historicoServidor => {
                if (historicoServidor && historicoServidor.length > 0) {
                    gerarPDF(historicoServidor);
                } else {
                    mostrarNotificacao('📝 Nenhum histórico para gerar PDF!', 'warning');
                }
            })
            .catch(error => {
                console.error('Erro ao obter histórico:', error);
                mostrarNotificacao('❌ Erro ao conectar com servidor. Usando dados locais...', 'warning');
                
                if (historico && historico.length > 0) {
                    gerarPDF(historico);
                } else {
                    mostrarNotificacao('📝 Nenhum histórico disponível!', 'error');
                }
            });
    }
}

// Função para gerar PDF
function gerarPDF(historico) {
    try {
        // Criar conteúdo do relatório usando a mesma função que funciona
        const relatorio = criarRelatorioHistorico(historico);
        
        // Como jsPDF pode não estar disponível, vamos criar um PDF simples em HTML
        const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Relatório de Pontos</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .pontos-atuais { 
            background: #f5f5f5; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px;
        }
        .historico { 
            margin-top: 20px;
        }
        .historico-item { 
            margin-bottom: 10px; 
            padding: 8px; 
            border-left: 3px solid #007bff;
            background: #f8f9fa;
        }
        h1 { color: #333; margin: 0; }
        h2 { color: #666; }
        .data { font-size: 0.9em; color: #666; }
        @media print {
            button { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 RELATÓRIO DE PONTOS</h1>
        <p class="data">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    </div>
    
    <div class="pontos-atuais">
        <h2>🏆 PONTOS ATUAIS:</h2>
        ${filhos.map(filho => 
            `<p><strong>${filho.emoji} ${filho.nome}:</strong> ${filho.pontos} pontos</p>`
        ).join('')}
    </div>
    
    <div class="historico">
        <h2>📝 HISTÓRICO RECENTE:</h2>
        ${historico.slice(0, 15).map(registro => {
            const data = new Date(registro.data);
            const dataFormatada = data.toLocaleDateString('pt-BR');
            const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const icone = registro.tipo === 'adicionar' ? '➕' : '➖';
            
            return `
                <div class="historico-item">
                    <strong>${dataFormatada} ${hora}</strong> - ${icone} ${registro.nome}: ${registro.pontos} pontos<br>
                    <em>Motivo: ${registro.motivo}</em>
                </div>
            `;
        }).join('')}
    </div>
    
    <div style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🖨️ Imprimir PDF
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            ❌ Fechar
        </button>
    </div>
</body>
</html>
        `;
        
        // Criar uma nova janela para o PDF
        const pdfWindow = window.open('', '_blank');
        pdfWindow.document.write(pdfContent);
        pdfWindow.document.close();
        
        mostrarNotificacao('📄 PDF aberto em nova aba! Use Ctrl+P para imprimir.', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        mostrarNotificacao('❌ Erro ao gerar PDF', 'error');
    }
}

// Salvar pontos automaticamente quando alterados
setInterval(() => {
    if (typeof salvarDados === 'function') {
        salvarDados();
    }
}, 5000);

// Funções de atividades (escopo global)
function adicionarAtividade(tipo) {
    console.log('Função adicionarAtividade chamada com tipo:', tipo);
    const nomeInput = document.getElementById(tipo === 'positiva' ? 'nova-atividade-positiva' : 'nova-atividade-negativa');
    const pontosInput = document.getElementById(tipo === 'positiva' ? 'pontos-atividade-positiva' : 'pontos-atividade-negativa');
    console.log('Elementos encontrados:', nomeInput, pontosInput);
    
    if (!nomeInput || !pontosInput) {
        mostrarNotificacao('Erro: Elementos do formulário não encontrados', 'error');
        return;
    }
    
    const nome = nomeInput.value.trim();
    const pontos = parseInt(pontosInput.value);
    
    if (!nome || isNaN(pontos) || pontos <= 0) {
        mostrarNotificacao('Por favor, preencha todos os campos corretamente', 'error');
        return;
    }
    
    const array = tipo === 'positiva' ? atividadesPositivas : atividadesNegativas;
    const novaAtividade = {
        id: Date.now(),
        nome: nome,
        pontos: pontos
    };
    
    array.push(novaAtividade);
    
    // Limpar campos
    nomeInput.value = '';
    pontosInput.value = '';
    
    atualizarListaAtividades(tipo);
    atualizarSelectsAtividades();
    salvarDados();
    mostrarNotificacao(`✅ Atividade ${tipo} "${nome}" adicionada com sucesso!`, 'success');
}

function removerAtividade(tipo, id) {
    const array = tipo === 'positiva' ? atividadesPositivas : atividadesNegativas;
    const index = array.findIndex(atividade => atividade.id === id);
    
    if (index !== -1) {
        array.splice(index, 1);
        atualizarListaAtividades(tipo);
        atualizarSelectsAtividades();
        salvarDados();
        mostrarNotificacao(`✅ Atividade ${tipo} removida`, 'success');
    }
}

// Função para atualizar os selects de atividades
function atualizarSelectsAtividades() {
    const selectAdicionar = document.getElementById('atividade-adicionar');
    const selectRemover = document.getElementById('atividade-remover');
    
    if (selectAdicionar) {
        // Limpar e recriar options
        selectAdicionar.innerHTML = '<option value="">Selecione uma atividade</option>';
        
        atividadesPositivas.forEach(atividade => {
            const option = document.createElement('option');
            option.value = JSON.stringify(atividade);
            option.textContent = `${atividade.nome} (+${atividade.pontos} pts)`;
            selectAdicionar.appendChild(option);
        });
    }
    
    if (selectRemover) {
        // Limpar e recriar options
        selectRemover.innerHTML = '<option value="">Selecione uma atividade</option>';
        
        atividadesNegativas.forEach(atividade => {
            const option = document.createElement('option');
            option.value = JSON.stringify(atividade);
            option.textContent = `${atividade.nome} (-${atividade.pontos} pts)`;
            selectRemover.appendChild(option);
        });
    }
}

// Inicialização final - garantir que tudo está carregado
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Sistema de Pontos Inicializando...');
    
    // Funções de atividades
function atualizarListaAtividades(tipo) {
    const lista = document.getElementById(tipo === 'positiva' ? 'lista-atividades-positivas' : 'lista-atividades-negativas');
    const array = tipo === 'positiva' ? atividadesPositivas : atividadesNegativas;
    
    if (!lista) return;
    
    lista.innerHTML = '';
    
    if (array.length === 0) {
        lista.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px; font-style: italic;">
                ${tipo === 'positiva' ? '🌟' : '⚠️'} Nenhuma atividade ${tipo} cadastrada ainda.
                <br><small>Use o formulário acima ou as sugestões para adicionar.</small>
            </div>
        `;
        return;
    }
    
    array.forEach((atividade, index) => {
        const item = document.createElement('div');
        item.className = 'atividade-item';
        
        // Destacar item recém-adicionado
        if (index === array.length - 1) {
            item.classList.add('nova');
            setTimeout(() => item.classList.remove('nova'), 1000);
        }
        
        item.innerHTML = `
            <span>${atividade.nome} (${atividade.pontos} pts)</span>
            <button onclick="removerAtividade('${tipo}', ${atividade.id})" 
                    class="btn-remover" 
                    title="Remover atividade">✕</button>
        `;
        lista.appendChild(item);
    });
}

function atualizarSelectsAtividades() {
    const selectAdicionar = document.getElementById('atividade-adicionar');
    const selectRemover = document.getElementById('atividade-remover');
    
    if (!selectAdicionar || !selectRemover) return;
    
    // Limpar selects
    selectAdicionar.innerHTML = '<option value="">Selecione uma atividade positiva</option>';
    selectRemover.innerHTML = '<option value="">Selecione uma atividade negativa</option>';
    
    // Adicionar atividades positivas no select de adicionar
    atividadesPositivas.forEach(atividade => {
        const option = document.createElement('option');
        option.value = JSON.stringify(atividade);
        option.textContent = `${atividade.nome} (+${atividade.pontos} pts)`;
        selectAdicionar.appendChild(option);
    });
    
    // Adicionar atividades negativas no select de remover
    atividadesNegativas.forEach(atividade => {
        const option = document.createElement('option');
        option.value = JSON.stringify(atividade);
        option.textContent = `${atividade.nome} (-${atividade.pontos} pts)`;
        selectRemover.appendChild(option);
    });
}

function mostrarToast(message, type = 'success') {
    if (window.ToastUtils) {
        window.ToastUtils.showToast('Sistema', message, type);
    } else {
        // Fallback para console se ToastUtils não estiver disponível
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}
    
    // Configurar todos os eventos
    configurarEventos();
    
    // Carregar dados do servidor e atualizar interface
    await atualizarTela();
    
    // Atualizar selects de atividades após carregamento
    atualizarSelectsAtividades();
    
    // Atualizar listas de atividades no modal se existirem
    if (document.getElementById('lista-atividades-positivas')) {
        atualizarListaAtividades('positiva');
    }
    if (document.getElementById('lista-atividades-negativas')) {
        atualizarListaAtividades('negativa');
    }
    
    console.log('✅ Sistema de Pontos Iniciado com Sucesso!');
});

// ============== SISTEMA DE LOG E UTILITÁRIOS ==============

// Função para baixar log
function baixarLog() {
    if (logs.length === 0) {
        mostrarNotificacao('📋 Nenhum log disponível para download!', 'warning');
        return;
    }
    
    // Criar cabeçalho do CSV
    const cabecalho = ['Data/Hora', 'Ação', 'Filho', 'Atividade', 'Pontos', 'Pontos Antes', 'Pontos Depois', 'Tipo'];
    
    // Converter logs para CSV
    const csvContent = [
        cabecalho.join(','),
        ...logs.map(log => [
            log.data,
            log.acao.replace('_', ' ').toUpperCase(),
            log.detalhes.filho || '',
            log.detalhes.atividade || '',
            log.detalhes.pontos || '',
            log.detalhes.pontos_antes || '',
            log.detalhes.pontos_depois || '',
            log.detalhes.tipo || ''
        ].join(','))
    ].join('\n');
    
    // Criar arquivo para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `log_pontos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    adicionarLog('download_log', {
        total_registros: logs.length,
        formato: 'CSV'
    });
    
    mostrarNotificacao(`📋 Log baixado com ${logs.length} registros!`, 'success');
}

// Função para resetar pontos
function resetarPontos() {
    if (filhos.length === 0) {
        mostrarNotificacao('👨‍👩‍👧‍👦 Nenhuma criança cadastrada para resetar!', 'warning');
        return;
    }
    
    const confirmacao = confirm(`🔄 Tem certeza que deseja resetar todos os pontos?\n\nIsto irá:\n• Zerar os pontos de todas as crianças\n• Manter o histórico preservado\n• Registrar esta ação no log\n\nEsta ação não pode ser desfeita!`);
    
    if (!confirmacao) {
        return;
    }
    
    // Salvar pontos atuais antes do reset
    const pontosAnteriores = {};
    filhos.forEach(filho => {
        pontosAnteriores[filho.nome] = filho.pontos;
        filho.pontos = 0;
    });
    
    // Adicionar log do reset
    adicionarLog('resetar_pontos', {
        total_criancas: filhos.length,
        pontos_anteriores: pontosAnteriores,
        motivo: 'Reset mensal/manual'
    });
    
    // Atualizar interface e salvar
    atualizarInterface();
    salvarDados();
    
    mostrarNotificacao(`🔄 Pontos resetados para ${filhos.length} crianças!`, 'success');
}

// Atualizar função de inicialização para carregar logs
document.addEventListener('DOMContentLoaded', function() {
    carregarLogs();
}); 