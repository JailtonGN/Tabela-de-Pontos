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
    let isLoggedIn = AuthUtils.isLoggedIn();
    console.log('🔐 Status de autenticação:', isLoggedIn);
    
    // Obter dados do usuário se logado, senão redirecionar para login
    let currentUser;
    if (!isLoggedIn) {
        // Se não estiver logado, redirecionar para página de login
        console.log('🔐 Usuário não logado, redirecionando para login...');
        window.location.href = '/login.html';
        return;
    } else {
        currentUser = AuthUtils.getCurrentUser();
    }

    // Obter dados do usuário
    console.log('👤 Usuário logado:', currentUser);

    if (!currentUser) {
        console.error('❌ Dados do usuário inválidos, redirecionando para login...');
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            window.location.href = 'https://tabela-de-pontos.onrender.com/login';
        } else {
            window.location.href = '/login.html';
        }
        return;
    }

    console.log('👤 Tipo de usuário:', currentUser.type);
    console.log('🔑 Permissões:', currentUser.permissions);

    // Configurar interface baseado nas permissões
    configurarInterfacePorPermissao(currentUser);

    // ✨ NOVA: Migrar dados antigos se necessário
    migrarDadosAntigos();

    // ✨ NOVA: Verificar e limpar dados corrompidos
    verificarELimparDadosCorrompidos();
    
    // ✨ NOVA: Verificar integridade dos dados
    verificarIntegridadeDados();

    // Inicializar aplicação
    inicializarApp();
});

// ✨ NOVAS FUNÇÕES: Gerenciamento de bloqueio de sincronização
function bloquearSincronizacaoComTimeout() {
    bloqueiarSincronizacao = true;
    console.log('🔒 Sincronização bloqueada (com timeout de segurança)');
    
    // Timeout de segurança: 2 minutos máximo
    setTimeout(() => {
        if (bloqueiarSincronizacao) {
            bloqueiarSincronizacao = false;
            console.log('⏰ Timeout: Sincronização desbloqueada automaticamente após 2 minutos');
        }
    }, 120000); // 2 minutos
}

function desbloquearSincronizacao() {
    bloqueiarSincronizacao = false;
    console.log('🔓 Sincronização desbloqueada');
}

// Configurar interface baseado no tipo de usuário
function configurarInterfacePorPermissao(user) {
    const { type, permissions } = user;

    // Mostrar informações do usuário no cabeçalho
    const headerTitle = DomUtils.getElement('.header-title p');
    if (headerTitle) {
        const tipoTexto = type === 'admin' ? '🔧 Administrador' : 
                         type === 'pai' ? `👨‍👩‍👧‍👦 ${user.nome}` : 
                         '👀 Visualização';
        headerTitle.innerHTML = `${tipoTexto} - Gerenciando os pontos dos filhos`;
    }
    
    // Verificar permissões para botão de configurações - Movido para cima para priorizar
    const configBtn = DomUtils.getElement('btn-configuracoes');
    if (configBtn) {
        if (type === 'guest') {
            // Sempre esconder botão de configurações para visitantes
            configBtn.style.display = 'none';
            console.log('🚫 Botão de configurações escondido para visitante');
        } else if (!permissions.includes('manage_children') || !permissions.includes('manage_activities')) {
            // Pais podem ver configurações mas com limitações
            configBtn.title = 'Configurações (Limitadas)';
        }
    }

    // Adicionar botão de logout
    const headerControls = DomUtils.getElement('.header-controls');
    if (headerControls) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn-logout';
        
        if (type === 'guest') {
            logoutBtn.innerHTML = '� Fazer Login';
            logoutBtn.title = 'Fazer login para gerenciar pontos';
            logoutBtn.style.cssText = `
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                margin-left: 10px;
                transition: all 0.3s ease;
            `;
        } else {
            logoutBtn.innerHTML = '🚪 Sair';
            logoutBtn.title = 'Fazer logout';
            logoutBtn.style.cssText = `
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                margin-left: 10px;
                transition: all 0.3s ease;
            `;
        }
        
        // Botão para trocar usuário
        const trocarUsuarioBtn = document.createElement('button');
        trocarUsuarioBtn.textContent = '🔄 Trocar Usuário';
        trocarUsuarioBtn.className = 'btn-trocar-usuario';
        trocarUsuarioBtn.style.cssText = `
            background: linear-gradient(135deg, #FFA726 0%, #FF7043 100%);
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            margin-left: 10px;
            transition: all 0.3s ease;
        `;
        trocarUsuarioBtn.onclick = () => {
            // ✨ NOVO: Adicionar log de logout/troca de usuário
            const session = JSON.parse(localStorage.getItem('userSession') || '{}');
            adicionarLog('trocar_usuario', {
                perfil_anterior: session.type,
                nome_anterior: session.nome,
                timestamp_logout: new Date().toISOString()
            });
            
            localStorage.removeItem('userSession');
            location.reload();
        };
        
        logoutBtn.onclick = () => AuthUtils.logout();
        headerControls.appendChild(trocarUsuarioBtn);
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

    // Controlar visibilidade de elementos admin-only
    controlarElementosAdmin(type);

    // Para visitantes, mostrar apenas a visualização
    if (type === 'guest') {
        console.log('👀 Configurando modo visitante...');
        
        // Esconder TODA a seção de ações (adicionar/remover pontos)
        const acoesSection = document.querySelector('.acoes-section');
        if (acoesSection) {
            acoesSection.style.display = 'none';
            console.log('🚫 Seção de ações escondida');
        }
        
        // ✨ NOVO: Mostrar histórico para visitantes (versão simplificada)
        const historicoSection = document.querySelector('.historico-section');
        if (historicoSection) {
            // Manter a seção visível, mas simplificar para visitantes
            console.log('✅ Seção de histórico mantida para visitantes');
            
            // Esconder botões de compartilhamento para visitantes
            const botoesCompartilhar = historicoSection.querySelector('.botoes-compartilhar');
            if (botoesCompartilhar) {
                botoesCompartilhar.style.display = 'none';
                console.log('🚫 Botões de compartilhamento escondidos para visitantes');
            }
            
            // Modificar o título para indicar que é modo visualização
            const historicoTitulo = historicoSection.querySelector('h2');
            if (historicoTitulo) {
                historicoTitulo.innerHTML = '📝 Histórico Recente - Modo Visualização';
                historicoTitulo.style.color = '#4a5568';
            }
            
            // Adicionar aviso no histórico para visitantes
            const historicoCard = historicoSection.querySelector('.historico-card');
            if (historicoCard) {
                const avisoHistorico = document.createElement('div');
                avisoHistorico.className = 'aviso-historico-visitante';
                avisoHistorico.style.cssText = `
                    margin: 10px 0;
                    padding: 10px;
                    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                    border-radius: 8px;
                    color: #1976d2;
                    text-align: center;
                    font-size: 0.9em;
                    border-left: 4px solid #2196f3;
                `;
                avisoHistorico.innerHTML = `
                    <strong>👀 Modo Visualização:</strong> Você pode visualizar o histórico, mas não pode compartilhar ou exportar dados.
                `;
                
                // Inserir após o título
                const historicoHeader = historicoSection.querySelector('.historico-header');
                if (historicoHeader) {
                    historicoCard.insertBefore(avisoHistorico, historicoHeader);
                }
            }
        }
        
        // O botão de configurações já foi escondido na verificação de permissões acima
        // Não precisamos escondê-lo novamente aqui
        
        // Adicionar aviso para visitantes
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const avisoDiv = document.createElement('div');
            avisoDiv.className = 'aviso-visitante';
            avisoDiv.style.cssText = `
                margin: 20px 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 15px;
                color: white;
                text-align: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            `;
            avisoDiv.innerHTML = `
                <h3 style="margin: 0 0 10px 0; font-size: 1.4em; color: white;">👀 Modo Visitante</h3>
                <p style="margin: 0; color: white; opacity: 0.9;">Você pode visualizar os pontos atuais e o histórico recente. Para gerenciar pontos, faça login como responsável.</p>
            `;
            
            // Inserir após o dashboard
            const dashboardSection = document.querySelector('.dashboard-section');
            if (dashboardSection && dashboardSection.nextSibling) {
                mainContent.insertBefore(avisoDiv, dashboardSection.nextSibling);
            } else {
                mainContent.appendChild(avisoDiv);
            }
            console.log('✅ Aviso de visitante adicionado');
        }
        
        // Melhorar o dashboard para visitantes
        const dashboardCard = document.querySelector('.pontos-card');
        if (dashboardCard) {
            dashboardCard.style.cssText += `
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border: 2px solid #e0e6ed;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            `;
            
            const titulo = dashboardCard.querySelector('h2');
            if (titulo) {
                titulo.innerHTML = '👀 📊 Pontos Atuais - Modo Visualização';
                titulo.style.color = '#4a5568';
            }
        }
        
        // ✨ NOVO: Configurar interface de lembretes por tipo de usuário
        configurarInterfaceLembretes(user);
        document.body.classList.add('modo-visualizacao'); // Ativa cor diferenciada
    } else {
        document.body.classList.remove('modo-visualizacao'); // Remove se não for visitante
        // Configurar interface de lembretes para pais/admin
        configurarInterfaceLembretes(user);
    }
}

// ✨ NOVA: Função para configurar interface de lembretes
function configurarInterfaceLembretes(user) {
    const { type } = user;
    
    // Elementos da seção de lembretes
    const lembretesSection = document.querySelector('.lembretes-section');
    const areaCriancas = document.getElementById('area-lembretes-criancas');
    const areaPais = document.getElementById('area-lembretes-pais');
    
    if (!lembretesSection) {
        console.log('⚠️ Seção de lembretes não encontrada');
        return;
    }
    
    if (type === 'guest') {
        // Modo Visitante: Mostrar área para crianças escreverem lembretes
        console.log('👀 Configurando lembretes para visitante...');
        
        if (areaCriancas) {
            areaCriancas.style.display = 'block';
            console.log('✅ Área de lembretes para crianças ativada');
        }
        
        if (areaPais) {
            areaPais.style.display = 'none';
            console.log('🚫 Área de lembretes para pais escondida');
        }
        
        // ✨ CORREÇÃO: Aguardar carregamento das crianças antes de preencher o select
        if (filhos.length > 0) {
            carregarSelectCriancas();
        } else {
            // Se as crianças ainda não foram carregadas, aguardar
            console.log('⏳ Aguardando carregamento das crianças...');
            setTimeout(() => {
                if (filhos.length > 0) {
                    carregarSelectCriancas();
                } else {
                    console.log('⚠️ Crianças ainda não carregadas, tentando novamente...');
                    // Tentar novamente após mais tempo
                    setTimeout(carregarSelectCriancas, 2000);
                }
            }, 1000);
        }
        
        // Configurar eventos para crianças
        configurarEventosLembretesCriancas();
        
    } else {
        // Modo Pais/Admin: Mostrar área para visualizar e gerenciar lembretes
        console.log('👨‍👩‍👧‍👦 Configurando lembretes para pais/admin...');
        
        if (areaCriancas) {
            areaCriancas.style.display = 'none';
            console.log('🚫 Área de lembretes para crianças escondida');
        }
        
        if (areaPais) {
            areaPais.style.display = 'block';
            console.log('✅ Área de lembretes para pais ativada');
            
            // Verificar se o elemento lista-lembretes existe dentro da área de pais
            const listaLembretes = areaPais.querySelector('#lista-lembretes');
            console.log('🎯 Elemento lista-lembretes encontrado na área de pais:', !!listaLembretes);
        } else {
            console.error('❌ Área de lembretes para pais não encontrada!');
        }
        
        // Carregar lembretes do servidor com pequeno delay para garantir que a área esteja visível
        console.log('⏰ Agendando carregamento de lembretes...');
        setTimeout(() => {
            console.log('🔍 Executando carregarLembretes()...');
            carregarLembretes();
        }, 100);
        
        // Configurar eventos para pais/admin
        configurarEventosLembretesPais();
    }
}

// ✨ NOVAS FUNÇÕES: Gerenciamento de Lembretes

// Carregar lista de crianças no select para visitantes
function carregarSelectCriancas() {
    const selectCrianca = document.getElementById('lembrete-crianca');
    if (!selectCrianca) {
        console.log('⚠️ Select de crianças não encontrado');
        return;
    }
    
    // Verificar se há crianças disponíveis
    if (!filhos || filhos.length === 0) {
        console.log('⚠️ Nenhuma criança disponível para carregar no select');
        selectCrianca.innerHTML = '<option value="">Nenhuma criança cadastrada...</option>';
        return;
    }
    
    // Limpar opções existentes
    selectCrianca.innerHTML = '<option value="">Selecione uma criança...</option>';
    
    // Adicionar opções baseadas nas crianças disponíveis
    filhos.forEach(filho => {
        const option = document.createElement('option');
        option.value = filho.nome;
        option.textContent = `${filho.emoji} ${filho.nome}`;
        selectCrianca.appendChild(option);
    });
    
    console.log('✅ Select de crianças carregado:', filhos.length, 'crianças');
    
    // Atualizar estado do botão de enviar
    const btnEnviar = document.getElementById('btn-enviar-lembrete');
    const textareaMensagem = document.getElementById('lembrete-mensagem');
    if (btnEnviar && textareaMensagem) {
        const temCrianca = selectCrianca.value;
        const temMensagem = textareaMensagem.value.length > 0;
        btnEnviar.disabled = !(temCrianca && temMensagem);
    }
}

// Configurar eventos para crianças (modo visitante)
function configurarEventosLembretesCriancas() {
    const btnEnviar = document.getElementById('btn-enviar-lembrete');
    const textareaMensagem = document.getElementById('lembrete-mensagem');
    const charCount = document.querySelector('.char-count');
    
    if (btnEnviar) {
        btnEnviar.addEventListener('click', handleEnviarLembrete);
    }
    
    if (textareaMensagem && charCount) {
        textareaMensagem.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = `${length}/500 caracteres`;
            
            // Desabilitar botão se não há texto ou criança selecionada
            const selectCrianca = document.getElementById('lembrete-crianca');
            const temCrianca = selectCrianca && selectCrianca.value;
            const temMensagem = length > 0;
            
            if (btnEnviar) {
                btnEnviar.disabled = !(temCrianca && temMensagem);
            }
        });
    }
    
    // Atualizar botão quando criança for selecionada
    const selectCrianca = document.getElementById('lembrete-crianca');
    if (selectCrianca) {
        selectCrianca.addEventListener('change', function() {
            if (btnEnviar && textareaMensagem) {
                const temCrianca = this.value;
                const temMensagem = textareaMensagem.value.length > 0;
                btnEnviar.disabled = !(temCrianca && temMensagem);
            }
        });
    }
    
    console.log('✅ Eventos de lembretes para crianças configurados');
}

// Enviar lembrete (modo visitante)
async function handleEnviarLembrete() {
    const selectCrianca = document.getElementById('lembrete-crianca');
    const textareaMensagem = document.getElementById('lembrete-mensagem');
    const btnEnviar = document.getElementById('btn-enviar-lembrete');
    
    if (!selectCrianca || !textareaMensagem) return;
    
    const crianca = selectCrianca.value;
    const mensagem = textareaMensagem.value.trim();
    
    if (!crianca || !mensagem) {
        mostrarNotificacao('❌ Selecione uma criança e escreva uma mensagem!', 'error');
        return;
    }
    
    if (mensagem.length > 500) {
        mostrarNotificacao('❌ A mensagem deve ter no máximo 500 caracteres!', 'error');
        return;
    }
    
    try {
        // Desabilitar botão durante envio
        if (btnEnviar) {
            btnEnviar.disabled = true;
            btnEnviar.textContent = '📤 Enviando...';
        }
        
        const response = await ApiService.post('/api/lembretes', {
            crianca: crianca,
            mensagem: mensagem
        });
        
        if (response && response.success) {
            mostrarNotificacao('✅ Lembrete enviado com sucesso!', 'success');
            
            // Limpar formulário
            selectCrianca.value = '';
            textareaMensagem.value = '';
            document.querySelector('.char-count').textContent = '0/500 caracteres';
            
            // Reabilitar botão
            if (btnEnviar) {
                btnEnviar.disabled = true; // Desabilitado até preencher novamente
                btnEnviar.textContent = '📤 Enviar Lembrete';
            }
        } else {
            throw new Error(response?.error || 'Erro ao enviar lembrete');
        }
        
    } catch (error) {
        console.error('❌ Erro ao enviar lembrete:', error);
        mostrarNotificacao(`❌ Erro ao enviar lembrete: ${error.message}`, 'error');
        
        // Reabilitar botão
        if (btnEnviar) {
            btnEnviar.disabled = false;
            btnEnviar.textContent = '📤 Enviar Lembrete';
        }
    }
}

// Carregar lembretes do servidor (modo pais/admin)
async function carregarLembretes() {
    console.log('🚀 FUNÇÃO carregarLembretes() INICIADA');
    try {
        console.log('🔍 Carregando lembretes do servidor...');
        const response = await ApiService.get('/api/lembretes');
        
        console.log('📡 Resposta da API de lembretes:', response);
        
        console.log('🔍 Verificando resposta...');
        console.log('📡 Response completo:', response);
        console.log('📡 Response.success:', response?.success);
        console.log('📡 Response.data:', response?.data);
        console.log('📡 Response.lembretes:', response?.lembretes);
        
        // Verificar se os lembretes estão em response.data ou response.lembretes
        let lembretesData = null;
        if (response?.data?.lembretes) {
            lembretesData = response.data.lembretes;
            console.log('📝 Lembretes encontrados em response.data.lembretes');
        } else if (response?.lembretes) {
            lembretesData = response.lembretes;
            console.log('📝 Lembretes encontrados em response.lembretes');
        }
        
        if (response && response.success && lembretesData) {
            lembretes = lembretesData;
            console.log('📝 Lembretes carregados:', lembretes.length);
            console.log('📊 Dados dos lembretes:', lembretes);
            renderizarLembretes();
            atualizarContadorLembretes();
        } else {
            console.error('❌ Erro ao carregar lembretes:', response?.error || 'Estrutura de resposta inválida');
            console.log('❌ Response não tem success ou lembretes válidos');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar lembretes:', error);
    }
}

// Renderizar lista de lembretes
function renderizarLembretes() {
    console.log('🔍 Renderizando lembretes...');
    console.log('📊 Estado atual dos lembretes:', lembretes);
    
    const listaLembretes = document.getElementById('lista-lembretes');
    console.log('🎯 Elemento lista-lembretes encontrado:', !!listaLembretes);
    
    if (!listaLembretes) {
        console.error('❌ Elemento #lista-lembretes não encontrado no DOM');
        return;
    }
    
    if (lembretes.length === 0) {
        console.log('📝 Nenhum lembrete para renderizar');
        listaLembretes.innerHTML = `
            <div class="lembrete-vazio">
                <p>📝 Nenhum lembrete encontrado</p>
                <small>As crianças ainda não enviaram lembretes</small>
            </div>
        `;
        return;
    }
    
    console.log('🎨 Renderizando', lembretes.length, 'lembretes...');
    
    // Ordenar lembretes: não lidos primeiro, depois por data (mais recente primeiro)
    const lembretesOrdenados = [...lembretes].sort((a, b) => {
        if (a.lido !== b.lido) return a.lido ? 1 : -1; // Não lidos primeiro
        return new Date(b.dataEnvio) - new Date(a.dataEnvio); // Mais recente primeiro
    });
    
    listaLembretes.innerHTML = lembretesOrdenados.map(lembrete => {
        const data = new Date(lembrete.dataEnvio);
        const dataFormatada = data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const statusClass = lembrete.lido ? 'lido' : '';
        const statusText = lembrete.lido ? '✅ Lido' : '📝 Novo';
        const statusIcon = lembrete.lido ? '✅' : '📝';
        
        return `
            <div class="lembrete-item ${statusClass}" data-id="${lembrete.id}">
                <div class="lembrete-header">
                    <div class="lembrete-info">
                        <div class="lembrete-crianca">${lembrete.crianca}</div>
                        <div class="lembrete-data">${dataFormatada}</div>
                    </div>
                    <div class="lembrete-acoes">
                        <button class="btn btn-marcar-lido ${lembrete.lido ? 'lido' : ''}" 
                                onclick="marcarLembreteComoLido(${lembrete.id})" 
                                ${lembrete.lido ? 'disabled' : ''}>
                            ${statusIcon} ${statusText}
                        </button>
                    </div>
                </div>
                <div class="lembrete-mensagem">${lembrete.mensagem}</div>
            </div>
        `;
    }).join('');
    
    console.log('✅ Lista de lembretes renderizada:', lembretesOrdenados.length);
}

// Atualizar contador de lembretes não lidos
function atualizarContadorLembretes() {
    const contador = document.getElementById('contador-lembretes');
    if (!contador) return;
    
    const naoLidos = lembretes.filter(l => !l.lido).length;
    contador.textContent = `${naoLidos} não lidos`;
    
    // Adicionar animação se há lembretes não lidos
    if (naoLidos > 0) {
        contador.style.animation = 'pulse 2s infinite';
    } else {
        contador.style.animation = 'none';
    }
}

// Marcar lembrete como lido
async function marcarLembreteComoLido(id) {
    try {
        const response = await ApiService.put(`/api/lembretes/${id}/lido`, {
            lidoPor: 'Responsável'
        });
        
        if (response && response.success) {
            // Atualizar lembrete local
            const lembrete = lembretes.find(l => l.id === id);
            if (lembrete) {
                lembrete.lido = true;
                lembrete.dataLeitura = new Date();
                lembrete.lidoPor = 'Responsável';
            }
            
            mostrarNotificacao('✅ Lembrete marcado como lido!', 'success');
            renderizarLembretes();
            atualizarContadorLembretes();
        } else {
            throw new Error(response?.error || 'Erro ao marcar como lido');
        }
    } catch (error) {
        console.error('❌ Erro ao marcar lembrete como lido:', error);
        mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
    }
}

// Limpar lembretes lidos
async function limparLembretesLidos() {
    try {
        const response = await ApiService.delete('/api/lembretes/limpar-lidos');
        
        if (response && response.success) {
            // Remover lembretes lidos do array local
            lembretes = lembretes.filter(l => !l.lido);
            
            mostrarNotificacao(`🧹 ${response.removidos} lembretes lidos removidos!`, 'success');
            renderizarLembretes();
            atualizarContadorLembretes();
        } else {
            throw new Error(response?.error || 'Erro ao limpar lembretes');
        }
    } catch (error) {
        console.error('❌ Erro ao limpar lembretes:', error);
        mostrarNotificacao(`❌ Erro: ${error.message}`, 'error');
    }
}

// Configurar eventos para pais/admin
function configurarEventosLembretesPais() {
    const btnLimpar = document.getElementById('btn-limpar-lembretes');
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', limparLembretesLidos);
    }
    
    console.log('✅ Eventos de lembretes para pais configurados');
}

// ✨ NOVA: Função global para forçar atualização do select de crianças
window.atualizarSelectLembretes = function() {
    console.log('🔄 Forçando atualização do select de crianças para lembretes...');
    carregarSelectCriancas();
};

// Função para controlar elementos admin-only
function controlarElementosAdmin(userType) {
    const isAdmin = userType === 'admin';
    const adminElements = document.querySelectorAll('.admin-only');
    
    console.log(`🔐 CONTROLE ADMIN-ONLY:`);
    console.log(`- Tipo de usuário: ${userType}`);
    console.log(`- É admin: ${isAdmin}`);
    console.log(`- Elementos encontrados: ${adminElements.length}`);
    
    adminElements.forEach((element, index) => {
        const elementInfo = element.id || element.textContent?.trim() || `elemento-${index}`;
        
        if (isAdmin) {
            element.classList.add('visible');
            element.style.display = 'inline-block';
            console.log(`✅ LIBERADO: ${elementInfo}`);
        } else {
            element.classList.remove('visible');
            element.style.display = 'none';
            console.log(`❌ BLOQUEADO: ${elementInfo}`);
        }
    });
    
    console.log(`🔐 Controle finalizado para usuário tipo: ${userType}`);
}

// Função para solicitar tipo de usuário
// ✨ NOVO: Utilitário de autenticação
window.AuthUtils = {
    isLoggedIn: function() {
        const session = localStorage.getItem('userSession');
        if (!session) return false;
        
        try {
            const userData = JSON.parse(session);
            return userData && userData.type && userData.nome;
        } catch (error) {
            console.error('❌ Erro ao verificar sessão:', error);
            return false;
        }
    },
    
    getSession: function() {
        const session = localStorage.getItem('userSession');
        if (!session) return null;
        
        try {
            return JSON.parse(session);
        } catch (error) {
            console.error('❌ Erro ao obter sessão:', error);
            return null;
        }
    },
    
    getCurrentUser: function() {
        return this.getSession();
    },
    
    logout: function() {
        // Adicionar log de logout
        const session = JSON.parse(localStorage.getItem('userSession') || '{}');
        adicionarLog('logout', {
            perfil: session.type,
            nome_usuario: session.nome,
            timestamp_logout: new Date().toISOString()
        });
        
        // Remover sessão e redirecionar para login
        localStorage.removeItem('userSession');
        window.location.href = '/login.html';
    }
};

// Estado global
let filhos = []; // Array dinâmico de filhos
let atividadesPositivas = []; // Atividades que ganham pontos
let atividadesNegativas = []; // Atividades que perdem pontos
let historico = [];
let pontos = {}; // Objeto para armazenar pontos dos filhos
let logs = []; // Sistema de log para todas as ações
let lembretes = []; // ✨ NOVO: Array para lembretes das crianças

// ✨ NOVO: Flag para controlar sincronização
let bloqueiarSincronizacao = false;

// ✨ NOVO: Sistema de controle de notificações para evitar spam
let ultimaSincronizacao = 0;
let ultimoSalvamento = 0;
const INTERVALO_MINIMO_LOGS = 30000; // 30 segundos entre logs similares

// Sistema de Sincronização com Backend
const API_BASE = window.location.origin;

// Função para fazer requisições ao backend
// Sincronizar dados com o servidor
async function sincronizarDados() {
    // ✨ NOVO: Não sincronizar se há mudanças pendentes
    if (bloqueiarSincronizacao) {
        console.log('🚫 Sincronização pausada - editando configurações');
        return;
    }

    try {
        const agora = Date.now();
        // ✨ Log controlado para sincronização
        const mostrarLogs = agora - ultimaSincronizacao > INTERVALO_MINIMO_LOGS;
        
        if (mostrarLogs) {
            console.log('🔄 Iniciando sincronização de dados...');
        }
        
        // Carregar pontos do servidor
        const pontosServidor = await ApiService.get('/api/pontos');
        if (pontosServidor) {
            pontos = pontosServidor;
            if (mostrarLogs) {
                console.log('📊 Pontos carregados do servidor:', pontos);
            }
        }
        
        // Carregar e sincronizar crianças baseadas nos pontos
        const criancasServidor = await ApiService.get('/api/sincronizar-criancas');
        if (mostrarLogs) {
            console.log('🔍 Resposta do servidor para crianças:', criancasServidor);
        }
        
        // ✨ CORREÇÃO CRÍTICA: Verificar estrutura correta da resposta da API
        let criancasData = null;
        if (criancasServidor && criancasServidor.success) {
            // ApiService retorna {success: true, data: {...}}
            if (criancasServidor.data && criancasServidor.data.criancas) {
                criancasData = criancasServidor.data.criancas;
            } else if (criancasServidor.data && Array.isArray(criancasServidor.data)) {
                criancasData = criancasServidor.data;
            } else if (criancasServidor.criancas) {
                // Fallback: resposta direta do servidor
                criancasData = criancasServidor.criancas;
            }
        }
        
        if (criancasData && criancasData.length > 0) {
            if (mostrarLogs) {
                console.log('🔍 Crianças encontradas no servidor:', criancasData.length);
            }
            
            // ✨ CORREÇÃO CRÍTICA: Merge inteligente preservando mudanças locais
            const filhosAnteriores = [...filhos];
            const filhosServidor = criancasData.map(crianca => {
                // Se a cor for uma string simples, criar o objeto cor completo
                if (typeof crianca.cor === 'string') {
                    const corObj = coresDisponiveis.find(c => c.valor === crianca.cor) || 
                                   coresDisponiveis[0]; // fallback para primeira cor
                    
                    return {
                        ...crianca,
                        cor: corObj
                    };
                }
                return crianca;
            });
            
            // ✨ NOVA LÓGICA: Preservar crianças locais que não existem no servidor
            const nomesServidor = filhosServidor.map(f => f.nome.toLowerCase());
            const filhosLocaisNaoSalvos = filhosAnteriores.filter(filho => 
                !nomesServidor.includes(filho.nome.toLowerCase())
            );
            
            if (filhosLocaisNaoSalvos.length > 0 && mostrarLogs) {
                console.log('🔄 Preservando crianças locais não salvas:', filhosLocaisNaoSalvos.map(f => f.nome));
            }
            
            // Merge: servidor + locais não salvos
            filhos = [...filhosServidor, ...filhosLocaisNaoSalvos];
            
            if (mostrarLogs) {
                console.log('👨‍👩‍👧‍👦 Crianças após merge (servidor + locais):', filhos.length);
            }
            
            // Salvar no localStorage para manter consistência
            localStorage.setItem('filhos', JSON.stringify(filhos));
            if (mostrarLogs) {
                console.log('💾 Crianças salvas no localStorage');
            }
            
            // ✨ NOVO: Atualizar select de crianças para lembretes se necessário
            if (typeof carregarSelectCriancas === 'function') {
                carregarSelectCriancas();
            }
        } else {
            if (mostrarLogs) {
                console.log('⚠️ Nenhuma criança retornada do servidor ou erro na resposta');
                console.log('🔍 Debug - resposta completa:', criancasServidor);
            }
            
            // ✨ FALLBACK: Carregar do localStorage se não há dados no servidor
            const filhosLocalStorage = localStorage.getItem('filhos');
            if (filhosLocalStorage) {
                try {
                    filhos = JSON.parse(filhosLocalStorage);
                    if (mostrarLogs) {
                        console.log('📱 Usando dados do localStorage como fallback:', filhos.length, 'filhos');
                    }
                } catch (error) {
                    console.error('❌ Erro ao parsear filhos do localStorage:', error);
                    filhos = [];
                }
            } else {
                if (mostrarLogs) {
                    console.log('📱 Nenhum dado no localStorage também');
                }
                filhos = [];
            }
        }
        
        if (mostrarLogs) {
            console.log('✅ Dados sincronizados com o servidor');
        }
        return true;
    } catch (error) {
        console.error('❌ Erro ao sincronizar dados:', error);
        return false;
    }
}

// ✨ NOVA FUNÇÃO: Sincronização manual com feedback visual
async function sincronizarManualmente() {
    console.log('🔄 === INICIANDO SINCRONIZAÇÃO MANUAL ===');
    
    // ✨ REFATORADO: Usar DomUtils para acesso DOM
    const btnAtualizar = DomUtils.getElement('btn-atualizar');
    console.log('🔍 Elemento btn-atualizar encontrado:', !!btnAtualizar);
    
    try {
        // ✨ VISUAL: Feedback no botão se existir
        if (btnAtualizar) {
            btnAtualizar.classList.add('sincronizando');
            btnAtualizar.innerHTML = '🔄 Sincronizando...';
            btnAtualizar.disabled = true;
        }
        
        mostrarNotificacao('🔄 Sincronizando dados...', 'info');
        
        // Forçar sincronização completa
        console.log('🔄 === SINCRONIZAÇÃO MANUAL INICIADA ===');
        const sincronizado = await sincronizarDados();
        
        if (sincronizado) {
            // Atualizar interface
            atualizarInterface();
            
            // Salvar dados também
            await salvarDados();
            
            mostrarNotificacao('✅ Dados sincronizados com sucesso!', 'success');
            console.log('✅ === SINCRONIZAÇÃO MANUAL CONCLUÍDA ===');
        } else {
            mostrarNotificacao('❌ Erro na sincronização', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro na sincronização manual:', error);
        mostrarNotificacao('❌ Erro na sincronização', 'error');
    } finally {
        // ✨ LIMPEZA: Restaurar botão se existir
        if (btnAtualizar) {
            btnAtualizar.classList.remove('sincronizando');
            btnAtualizar.innerHTML = '🔄 Atualizar';
            btnAtualizar.disabled = false;
        }
        
        console.log('🔄 === SINCRONIZAÇÃO MANUAL FINALIZADA ===');
    }
}

// ✨ NOVA FUNÇÃO: Sincronização inteligente após cada ação
async function sincronizarAposAcao(acao) {
    try {
        // Não sincronizar se já está sincronizando ou se há bloqueio
        if (bloqueiarSincronizacao) {
            console.log('🚫 Sincronização pós-ação cancelada - já em andamento');
            return;
        }
        
        // Log controlado para ações
        console.log(`🔄 Sincronizando após: ${acao}`);
        
        // Sincronizar silenciosamente (sem logs excessivos)
        const resultado = await sincronizarDados();
        
        if (resultado) {
            // Atualizar interface apenas se a sincronização foi bem-sucedida
            atualizarInterface();
            console.log(`✅ Sincronização pós-ação concluída: ${acao}`);
        } else {
            console.log(`⚠️ Sincronização pós-ação falhou: ${acao}`);
        }
        
    } catch (error) {
        console.error(`❌ Erro na sincronização pós-ação (${acao}):`, error);
    }
}

// Salvar dados no servidor
async function salvarNoServidor() {
    try {
        // ✨ PROTEÇÃO CRÍTICA: Não salvar se não há filhos carregados
        if (!filhos || filhos.length === 0) {
            console.log('⚠️ Nenhum filho carregado, não há dados para salvar');
            return true; // Retornar sucesso para não bloquear o fluxo
        }
        
        // ✨ CORREÇÃO CRÍTICA: Sincronizar pontos dos filhos para objeto global
        const pontosLimpos = {};
        
        // Primeiro, atualizar objeto pontos global com dados dos filhos
        filhos.forEach(filho => {
            if (filho.nome && typeof filho.pontos === 'number') {
                pontos[filho.nome.toLowerCase()] = filho.pontos;
                pontosLimpos[filho.nome.toLowerCase()] = filho.pontos;
            }
        });
        
        // Se ainda não temos dados dos filhos, usar dados do objeto pontos
        if (Object.keys(pontosLimpos).length === 0) {
            for (const [nome, valor] of Object.entries(pontos)) {
                // Apenas incluir se for um nome válido e valor numérico
                if (typeof nome === 'string' && typeof valor === 'number' && nome !== 'success') {
                    pontosLimpos[nome] = valor;
                }
            }
        }
        
        // ✨ PROTEÇÃO: Não enviar se não temos dados válidos
        if (Object.keys(pontosLimpos).length === 0) {
            console.log('⚠️ Nenhum dado válido para salvar no servidor');
            return true; // Retornar sucesso para não bloquear o fluxo
        }
        
        console.log('💾 Salvando dados válidos:', pontosLimpos);
        
        // Salvar pontos limpos
        await ApiService.post('/api/pontos', pontosLimpos);
        
        // ✅ IMPLEMENTADO: Salvamento individual de histórico via ApiService.salvarHistorico()
        // (Chamado automaticamente nas operações de pontos)
        
        console.log('✅ Dados salvos no servidor');
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar no servidor:', error);
        return false;
    }
}

// Sistema de Log
function adicionarLog(acao, detalhes = {}) {
    // Obter informações da sessão do usuário
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    
    // Criar timestamp detalhado
    const agora = new Date();
    const timestamp = agora.toISOString();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR');
    
    // Determinar perfil e responsável
    let perfil = 'Visitante';
    let responsavel = 'Não identificado';
    
    if (session.type) {
        perfil = session.type === 'admin' ? 'Administrador' : 
                session.type === 'pai' ? 'Pai/Mãe' : 
                session.type === 'crianca' ? 'Criança' : 'Visitante';
        
        responsavel = session.nome || session.type || 'Usuário sem nome';
    }
    
    const log = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        timestamp: timestamp,
        data: dataFormatada,
        horario: horaFormatada,
        data_completa: agora.toLocaleString('pt-BR'),
        acao: acao,
        perfil: perfil,
        responsavel: responsavel,
        usuario_id: session.userId || null,
        detalhes: detalhes,
        ip: 'local', // Para app local
        versao_app: '2.0',
        dispositivo: navigator.userAgent || 'Desconhecido'
    };
    
    logs.push(log);
    
    // ✨ NOVO: Salvar logs localmente e no MongoDB
    salvarLogs();
    
    console.log('📋 Log detalhado adicionado:', {
        acao: log.acao,
        perfil: log.perfil,
        responsavel: log.responsavel,
        data: log.data,
        horario: log.horario
    });
}

// ✨ REMOVIDO: salvarLogs() e carregarLogs() antigos (substituídos pelas versões MongoDB)

// ✨ CORREÇÃO: Sincronização automática mais inteligente (executa a cada 2 minutos)
let intervalId = null;

function iniciarSincronizacaoAutomatica() {
    // Evitar múltiplos intervalos
    if (intervalId) {
        clearInterval(intervalId);
    }
    
    intervalId = setInterval(async () => {
        // ✨ NOVO: Não sincronizar se há mudanças pendentes ou se está editando
        if (bloqueiarSincronizacao) {
            console.log('🚫 Sincronização automática pausada - editando dados');
            return;
        }
        
        if (navigator.onLine) {
            const agora = Date.now();
            // ✨ Log controlado para sincronização automática
            if (agora - ultimaSincronizacao > INTERVALO_MINIMO_LOGS) {
                console.log('🔄 Sincronização automática iniciada...');
                ultimaSincronizacao = agora;
            }
            
            const sincronizado = await sincronizarDados();
            if (sincronizado) {
                // Atualizar pontos dos filhos com dados do servidor
                filhos.forEach(filho => {
                    if (pontos[filho.nome] !== undefined && pontos[filho.nome] !== filho.pontos) {
                        filho.pontos = pontos[filho.nome];
                    }
                });
                atualizarInterface();
                
                // ✨ Log controlado para conclusão
                if (agora - ultimaSincronizacao <= INTERVALO_MINIMO_LOGS) {
                    console.log('✅ Sincronização automática concluída');
                }
            }
        } else {
            console.log('📱 Offline - sincronização automática pulada');
        }
    }, 120000); // 2 minutos ao invés de 30 segundos
}

// Detectar quando volta a ter internet
window.addEventListener('online', async () => {
    console.log('🌐 Conexão restaurada, sincronizando dados...');
    mostrarNotificacao('🌐 Sincronizando dados...', 'info');
    await sincronizarDados();
    await salvarDados();
    mostrarNotificacao('✅ Dados sincronizados!', 'success');
}, 'Conexão online restaurada');

window.addEventListener('offline', () => {
    console.log('📱 Modo offline - dados salvos localmente');
    // Removida notificação redundante de modo offline
}, 'Modo offline');

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
    
    try {
        await carregarDados();
        console.log('📊 Dados carregados, filhos encontrados:', filhos.length);
        
        configurarEventos();
        console.log('⚙️ Eventos configurados');

        // Controlar elementos admin-only
        const currentUser = JSON.parse(localStorage.getItem('userSession') || '{}');
        controlarElementosAdmin(currentUser.type || 'guest');
        console.log('🔐 Controle de elementos admin aplicado');

        await atualizarTela();
        console.log('📺 Interface atualizada');
        
        // ✨ CORREÇÃO: Logs já são carregados na função carregarDados() via sincronizarLogs()
        console.log('📋 Logs já sincronizados na inicialização');
        
        // Inicializar sincronização automática inteligente
        setTimeout(() => {
            console.log('🔌 Inicializando sincronização automática...');
            iniciarSincronizacaoAutomatica();
        }, 5000); // Delay de 5 segundos para evitar conflitos na inicialização
        
        // Comentado para evitar inicialização duplicada do WebSocket
        // O WebSocket já é inicializado pelo websocket-sync.js
        // setTimeout(() => {
        //     console.log('🔌 Inicializando WebSocket...');
        //     inicializarWebSocket();
        // }, 6000);
        
        // ✨ NOVO: Sincronização inicial automática após login
        setTimeout(async () => {
            console.log('🔄 Sincronização inicial após login...');
            await sincronizarAposAcao('login inicial');
        }, 7000);
        
        console.log('✅ Aplicação inicializada com sucesso!');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
    }
}

// Inicialização original (será removida pela nova estrutura de autenticação)
// Inicialização original (desativada - agora controlada por autenticação)
// ✨ ATUALIZADA: Carregar dados com sincronização de atividades e logs
async function carregarDados() {
    console.log('🔍 Carregando dados...');
    
    // Tentar sincronizar com o servidor primeiro
    const sincronizado = await sincronizarDados();
    
    if (!sincronizado) {
        console.log('⚠️ Usando dados locais (localStorage) como fallback');
        carregarDoLocalStorage();
    } else {
        console.log('✅ Dados sincronizados com o servidor');
    }
    
    // ✨ NOVA: Carregar atividades do MongoDB ou localStorage
    await sincronizarAtividades();
    
    // ✨ NOVA: Carregar logs do MongoDB ou localStorage
    await sincronizarLogs();
    
    // Ordem alfabética para atividades
    atividadesPositivas.sort((a, b) => a.nome.localeCompare(b.nome));
    atividadesNegativas.sort((a, b) => a.nome.localeCompare(b.nome));
    
    // Atualizar interface
    atualizarInterface();
    atualizarListaAtividades();
    atualizarSelectsAtividades();
    console.log('📊 Tabela de pontos carregada');
}

// Função auxiliar para carregar dados do localStorage
function carregarDoLocalStorage() {
    console.log('📱 Carregando dados do localStorage...');
    
    const filhosSalvos = localStorage.getItem('filhos');
    const historicoSalvo = localStorage.getItem('historico');
    const pontosSalvos = localStorage.getItem('pontos');
    
    if (filhosSalvos) {
        filhos = JSON.parse(filhosSalvos);
        console.log('👨‍👩‍👧‍👦 Filhos carregados do localStorage:', filhos);
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
    
    if (historicoSalvo) {
        historico = JSON.parse(historicoSalvo);
        console.log('📋 Histórico carregado do localStorage');
    }
    
    if (pontosSalvos) {
        pontos = JSON.parse(pontosSalvos);
        console.log('📊 Pontos carregados do localStorage');
        
        // Sincronizar pontos dos filhos
        filhos.forEach(filho => {
            if (pontos[filho.nome] !== undefined) {
                filho.pontos = pontos[filho.nome];
            }
        });
    }
}

// Salvar dados
async function salvarDados(forcado = false) {
    const agora = Date.now();
    
    // Salvar no localStorage (backup local)
    localStorage.setItem('filhos', JSON.stringify(filhos));
    localStorage.setItem('atividadesPositivas', JSON.stringify(atividadesPositivas));
    localStorage.setItem('atividadesNegativas', JSON.stringify(atividadesNegativas));
    localStorage.setItem('historico', JSON.stringify(historico));
    
    // ✨ Log controlado - só mostrar se passou tempo suficiente ou foi forçado
    if (forcado || agora - ultimoSalvamento > INTERVALO_MINIMO_LOGS) {
        console.log('💾 Dados salvos no localStorage');
        ultimoSalvamento = agora;
    }
    
    // Atualizar pontos baseado nos filhos (SEMPRE usar minúsculo para consistência)
    filhos.forEach(filho => {
        pontos[filho.nome.toLowerCase()] = filho.pontos || 0;
    });
    
    // Tentar salvar no servidor
    const salvouServidor = await salvarNoServidor();
    if (salvouServidor && (forcado || agora - ultimoSalvamento > INTERVALO_MINIMO_LOGS)) {
        console.log('☁️ Dados sincronizados com o servidor');
    } else if (!salvouServidor && (forcado || agora - ultimoSalvamento > INTERVALO_MINIMO_LOGS)) {
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
    console.log('🎯 Chamando atualizarSelectsAtividades()...');
    atualizarSelectsAtividades();
    
    // ✨ CORREÇÃO: Histórico já é carregado via sincronizarLogs() na inicialização
    // Apenas aplicar filtros se necessário
    aplicarFiltrosHistorico();
}

// Carregar pontos do servidor
async function carregarPontosServidor() {
    try {
        const data = await ApiService.get('/api/pontos');
        
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
// Flag para controlar carregamento do histórico
let carregandoHistorico = false;

async function carregarHistoricoServidor() {
    if (carregandoHistorico) {
        console.log('🔄 Carregamento de histórico já em andamento, ignorando...');
        return;
    }
    
    carregandoHistorico = true;
    
    try {
        const data = await ApiService.get('/api/historico');
        
        // ✨ CORREÇÃO: Verificar estrutura correta da resposta da API
        let historicoData = null;
        if (data && data.success && data.data) {
            // ApiService retorna {success: true, data: [...]}
            historicoData = data.data;
        } else if (Array.isArray(data)) {
            // Resposta direta como array
            historicoData = data;
        } else if (data && data.historico && Array.isArray(data.historico)) {
            // Resposta com propriedade historico
            historicoData = data.historico;
        } else {
            console.warn('⚠️ Formato de histórico inesperado:', data);
            historicoData = [];
        }
        
        if (Array.isArray(historicoData)) {
            historico = historicoData.map(item => ({
                id: item.id || Date.now(),
                data: new Date(item.data).toLocaleString('pt-BR'),
                nome: item.nome,
                pontos: item.pontos,
                motivo: item.motivo,
                tipo: item.tipo
            }));
        } else {
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
    } finally {
        carregandoHistorico = false;
    }
}

// Funções do Modal de Configurações
function abrirModalConfiguracoes() {
    console.log('🔧 Abrindo modal de configurações...');
    
    // Verificar se o usuário é do tipo 'guest' (visitante)
    const currentUser = JSON.parse(localStorage.getItem('userSession') || '{}');
    const userType = currentUser.type || 'guest';
    
    // Bloquear acesso para visitantes
    if (userType === 'guest') {
        console.log('🚫 Acesso ao modal de configurações bloqueado para visitantes');
        mostrarNotificacao('🚫 Acesso não permitido no modo visitante', 'error');
        return;
    }
    
    const modal = DomUtils.getElementById('modal-configuracoes');
    
    if (modal) {
        // ✨ FORÇAR: Usar display diretamente se a classe não funcionar
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '15000';
        
        console.log('🔍 Estado do modal:', {
            classes: modal.classList.toString(),
            display: modal.style.display,
            zIndex: modal.style.zIndex,
            visible: modal.offsetWidth > 0 && modal.offsetHeight > 0
        });
        
        carregarConfiguracoesNoModal();
        
        // Garantir que elementos admin-only sejam controlados ao abrir o modal
        setTimeout(() => {
            controlarElementosAdmin(userType);
        }, 100); // Pequeno delay para garantir que o DOM esteja renderizado
        
        console.log('✅ Modal de configurações aberto');
    } else {
        console.error('❌ Modal não encontrado no DOM!');
    }
}

function fecharModalConfiguracoes() {
    console.log('🔄 fecharModalConfiguracoes() chamada');
    const modal = DomUtils.getElementById('modal-configuracoes');
    console.log('📋 Modal encontrado:', modal);
    if (modal) {
        console.log('📋 Classes antes de remover:', modal.className);
        modal.classList.remove('active');
        // ✨ CORREÇÃO: Remover estilos inline que impedem o fechamento
        modal.style.display = '';
        modal.style.alignItems = '';
        modal.style.justifyContent = '';
        modal.style.zIndex = '';
        console.log('📋 Classes após remover:', modal.className);
        console.log('✅ Modal de configurações fechado');
    } else {
        console.error('❌ Modal de configurações não encontrado!');
    }
}

function carregarConfiguracoesNoModal() {
    console.log('🔧 carregarConfiguracoesNoModal() chamada');
    
    // Renderizar lista de filhos na aba de filhos
    renderizarListaFilhos();
    
    // ✨ NOVO: Carregar atividades do localStorage/servidor primeiro
    carregarAtividades();
    
    // ✨ DESABILITADO: Não adicionar atividades padrão automaticamente
    // garantirAtividadesPadrao();
    
    // ✨ CORREÇÃO: Usar timeout maior para garantir DOM renderizado
    setTimeout(() => {
        console.log('🔄 Atualizando lista de atividades com delay...');
        atualizarListaAtividades();
        console.log('✅ Lista de atividades atualizada');
    }, 500); // Delay maior para garantir DOM renderizado
    
    // Ativar a aba filhos por padrão
    ativarTab('filhos');
}

function ativarTab(tabId) {
    console.log('🎯 ativarTab() chamada com ID:', tabId);
    // Remover classe active de todos os botões e conteúdos
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Ativar botão e conteúdo selecionados
    const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
    const tabContent = DomUtils.getElementById(`tab-${tabId}`);
    
    console.log('🔍 Tab button encontrado:', tabButton);
    console.log('🔍 Tab content encontrado:', tabContent);
    
    if (tabButton) {
        tabButton.classList.add('active');
        console.log('✅ Tab button ativado');
    } else {
        console.log(`⚠️ Botão da tab "${tabId}" não encontrado`);
    }
    
    if (tabContent) {
        tabContent.classList.add('active');
        console.log('✅ Tab content ativado');
        
        // ✨ CORREÇÃO: Atualizar aba atividades quando ela for selecionada
        if (tabId === 'atividades') {
            console.log('🎯 Aba atividades ativada - atualizando lista...');
            setTimeout(() => {
                console.log('🔄 Executando carregamento de atividades...');
                
                // ✨ NOVA: Sempre forçar sincronização para garantir dados atualizados
                console.log('🔄 Forçando sincronização de atividades...');
                    sincronizarAtividades().then(() => {
                        console.log('✅ Sincronização concluída - tentando renderizar novamente...');
                        setTimeout(() => {
                        console.log('🔄 Renderizando lista de atividades...');
                            atualizarListaAtividades();
                        }, 200);
                }).catch(error => {
                    console.error('❌ Erro na sincronização:', error);
                    console.log('📱 Fallback: carregando do localStorage...');
                    carregarAtividadesLocal();
                    atualizarListaAtividades();
                });
                
                console.log('✅ Lista de atividades atualizada');
            }, 300); // Delay para garantir renderização
        }
        
        // ✨ NOVO: Atualizar histórico quando aba histórico for ativada
        if (tabId === 'historico') {
            console.log('🎯 Aba histórico ativada - atualizando histórico...');
            setTimeout(() => {
                console.log('🔄 Executando carregamento de histórico...');
                atualizarHistorico('todos');
                console.log('✅ Histórico atualizado');
            }, 300); // Delay para garantir renderização
        }
    } else {
        console.log(`⚠️ Conteúdo da tab "${tabId}" não encontrado`);
    }
}

// Renderizar lista de filhos no modal
function renderizarListaFilhos() {
    const container = DomUtils.getElementById('lista-filhos');
    if (!container) {
        console.log('📦 Container lista-filhos não encontrado');
        
        // Verificar se estamos no modal de configurações
        const tabFilhos = DomUtils.getElementById('tab-filhos');
        if (!tabFilhos) {
            console.log('⚠️ Modal não está aberto, não é necessário renderizar lista de filhos');
            return;
        }
        
        // Criar container se não existir
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
        
        // Buscar o novo container criado
        const novoContainer = DomUtils.getElementById('lista-filhos');
        if (!novoContainer) {
            console.error('❌ Erro: Não foi possível criar container lista-filhos');
            return;
        }
        
        // Continuar com o novo container
        renderizarListaFilhosContainer(novoContainer);
        return;
    }
    
    // Se o container existe, renderizar diretamente
    renderizarListaFilhosContainer(container);
}

// Função auxiliar para renderizar conteúdo na lista de filhos
function renderizarListaFilhosContainer(container) {
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
                <div class="filho-acoes">
                    <button onclick="editarFilho(${filho.id})" class="btn btn-sm btn-primary">✏️</button>
                    <button onclick="removerFilho(${filho.id})" class="btn btn-sm btn-danger">🗑️</button>
                </div>
            </div>
        `;
        container.appendChild(filhoItem);
    });
}

// Adicionar novo filho
async function adicionarNovoFilho() {
    console.log('👶 Iniciando cadastro de novo filho...');
    
    // 1. Captura dos elementos do formulário
    const nomeInput = DomUtils.getElementById('novo-filho-nome');
    const emojiSelect = DomUtils.getElementById('novo-filho-emoji');
    const corSelect = DomUtils.getElementById('novo-filho-cor');
    
    if (!nomeInput || !emojiSelect || !corSelect) {
        mostrarNotificacao('❌ Erro: Formulário não encontrado', 'error');
        return;
    }
    
    const nome = nomeInput.value?.trim();
    const emoji = emojiSelect.value;
    const corIndex = parseInt(corSelect.value);
    
    // 2. Validações
    if (!nome) {
        mostrarNotificacao('❌ Por favor, insira um nome para o filho', 'error');
        return;
    }
    
    if (filhos.some(f => f.nome.toLowerCase() === nome.toLowerCase())) {
        mostrarNotificacao('❌ Já existe um filho com este nome', 'error');
        return;
    }
    
    if (isNaN(corIndex) || corIndex < 0 || corIndex >= coresDisponiveis.length) {
        mostrarNotificacao('❌ Erro na cor selecionada', 'error');
        return;
    }
    
    // 3. Criação do novo filho
    const novoFilho = {
        id: gerarNovoId(),
        nome: nome,
        emoji: emoji,
        cor: coresDisponiveis[corIndex],
        pontos: 0
    };
    
    console.log('👶 Novo filho criado:', novoFilho);
    
    // 4. Bloquear sincronização durante operação
    bloquearSincronizacaoComTimeout();
    
    try {
        // 5. Salvar no servidor PRIMEIRO
        console.log('☁️ Salvando no servidor...');
        const response = await ApiService.post('/api/salvar-criancas', { 
            criancas: [...filhos, novoFilho] 
        });
        
        if (response.success) {
            // 6. Se servidor OK, adicionar localmente
            filhos.push(novoFilho);
            console.log('✅ Filho adicionado com sucesso:', nome);
            mostrarNotificacao(`✅ ${nome} foi adicionado com sucesso!`, 'success');
        } else {
            throw new Error('Falha na resposta do servidor');
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar no servidor:', error);
        
        // 7. Fallback: salvar apenas localmente
        filhos.push(novoFilho);
        console.log('📱 Filho salvo apenas localmente:', nome);
        mostrarNotificacao(`⚠️ ${nome} adicionado localmente, erro ao sincronizar com servidor!`, 'warning');
    }
    
    // 8. Atualizar interface
    renderizarListaFilhos();
    atualizarInterface();
    
    // 9. Log do cadastro
    adicionarLog('cadastrar_filho', {
        nome_filho: nome,
        emoji: emoji,
        cor: coresDisponiveis[corIndex].nome,
        total_filhos: filhos.length
    });
    
    // 10. Salvar dados localmente
    await salvarDados(true);
    
    // 11. Limpar formulário
    nomeInput.value = '';
    emojiSelect.value = '👦';
    corSelect.value = '0';
    
    // 12. Desbloquear sincronização
    desbloquearSincronizacao();
    
    // 13. Sincronizar após adicionar filho
    await sincronizarAposAcao('adicionar filho');
    
    console.log('👶 Cadastro de filho concluído:', nome);
}

// Editar filho
async function editarFilho(id) {
    const filho = encontrarFilho(id);
    if (!filho) return;
    
    // ✨ NOVO: Bloquear sincronização durante edição
    bloquearSincronizacaoComTimeout();
    
    const novoNome = prompt('Novo nome:', filho.nome);
    if (!novoNome || novoNome.trim() === '') {
        // ✨ NOVO: Desbloquear se cancelar
        desbloquearSincronizacao();
        return;
    }
    
    // Verificar se já existe outro filho com este nome
    if (filhos.some(f => f.id !== id && f.nome.toLowerCase() === novoNome.toLowerCase())) {
        mostrarNotificacao('❌ Já existe um filho com este nome', 'error');
        // ✨ NOVO: Desbloquear se erro
        desbloquearSincronizacao();
        return;
    }
    
    const novoEmoji = prompt('Novo emoji:', filho.emoji);
    if (!novoEmoji) {
        // ✨ NOVO: Desbloquear se cancelar
        desbloquearSincronizacao();
        return;
    }
    
    const corOptions = coresDisponiveis.map((cor, index) => `${index}: ${cor.nome}`).join('\n');
    const novaCor = prompt(`Nova cor (0-${coresDisponiveis.length-1}):\n${corOptions}`, coresDisponiveis.findIndex(c => c.nome === filho.cor.nome));
    if (novaCor === null) {
        // ✨ NOVO: Desbloquear se cancelar
        desbloquearSincronizacao();
        return;
    }
    
    const corIndex = parseInt(novaCor);
    if (isNaN(corIndex) || corIndex < 0 || corIndex >= coresDisponiveis.length) {
        mostrarNotificacao('❌ Cor inválida', 'error');
        // ✨ NOVO: Desbloquear se erro
        desbloquearSincronizacao();
        return;
    }
    
    filho.nome = novoNome.trim();
    filho.emoji = novoEmoji;
    filho.cor = coresDisponiveis[corIndex];
    
    // Salvar dados localmente
    await salvarDados();
    
    // Salvar configurações no servidor
    try {
        const response = await ApiService.post('/api/salvar-criancas', { criancas: filhos });
        if (response.success) {
            console.log('👨‍👩‍👧‍👦 Configurações das crianças salvas no servidor após edição');
            // ✨ NOVO: Desbloquear após salvar com sucesso
            desbloquearSincronizacao();
        }
    } catch (error) {
        console.error('❌ Erro ao salvar configurações após edição:', error);
        // ✨ NOVO: Desbloquear mesmo em caso de erro
        desbloquearSincronizacao();
        // Não mostrar erro para o usuário, apenas log
    }
    
    renderizarListaFilhos();
    atualizarInterface();
    
    // ✨ NOVO: Sincronizar após editar filho
    await sincronizarAposAcao('editar filho');
    
    mostrarNotificacao(`✅ ${filho.nome} foi editado com sucesso!`, 'success');
}

// Remover filho
async function removerFilho(id) {
    const filho = encontrarFilho(id);
    if (!filho) return;
    
    if (!confirm(`Tem certeza que deseja remover ${filho.nome}? Esta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        // ✨ NOVO: Remover do MongoDB primeiro
        const response = await ApiService.delete(`/api/criancas/${id}`);
        
        if (response.success) {
            console.log(`✅ Criança ${filho.nome} removida do MongoDB`);
            
            // Adicionar log da remoção
    adicionarLog('remover_filho', {
        filho: filho.nome,
        pontos_finais: filho.pontos,
        cor: filho.cor
    });
    
            // Remover filho da lista local
    filhos = filhos.filter(f => f.id !== id);
    
    // Remover do histórico também
    historico = historico.filter(h => h.nome !== filho.nome);
    
            // Salvar dados locais
    await salvarDados();
            
            // Atualizar interface
    renderizarListaFilhos();
    atualizarInterface();
    
            // Sincronizar após remover filho
    await sincronizarAposAcao('remover filho');
    
    mostrarNotificacao(`🗑️ ${filho.nome} foi removido do sistema`, 'warning');
        } else {
            throw new Error(response.error || 'Erro ao remover criança do servidor');
        }
    } catch (error) {
        console.error('❌ Erro ao remover criança:', error);
        mostrarNotificacao(`❌ Erro ao remover ${filho.nome}: ${error.message}`, 'error');
    }
}

async function salvarConfiguracoes() {
    // ✨ NOVO: Bloquear sincronização durante salvamento
    bloquearSincronizacaoComTimeout();
    
    // Salvar dados locais
    await salvarDados();
    
    // Salvar configurações das crianças no servidor
    try {
        const response = await ApiService.post('/api/salvar-criancas', { criancas: filhos });
        if (response.success) {
            console.log('👨‍👩‍👧‍👦 Configurações das crianças salvas no servidor');
            // ✨ NOVO: Desbloquear após salvar com sucesso
            desbloquearSincronizacao();
        }
    } catch (error) {
        console.error('❌ Erro ao salvar configurações das crianças:', error);
        // ✨ NOVO: Desbloquear mesmo em caso de erro
        desbloquearSincronizacao();
    }
    
    // Fechar modal
    fecharModalConfiguracoes();
    
    // ✨ NOVO: Sincronizar após salvar configurações
    await sincronizarAposAcao('salvar configurações');
    
    // Mostrar notificação
    mostrarNotificacao('✅ Configurações salvas com sucesso!', 'success');
}

// Configurar eventos
function configurarEventos() {
    console.log('⚙️ Configurando eventos...');
    
    // Botão configurações
    EventManager.addClickHandler('btn-configuracoes', function(e) {
        console.log('⚙️ Botão de configurações clicado!');
        e.preventDefault();
        
        // Verificar se o usuário é do tipo 'guest' (visitante)
        const currentUser = JSON.parse(localStorage.getItem('userSession') || '{}');
        const userType = currentUser.type || 'guest';
        
        // Bloquear acesso para visitantes
        if (userType === 'guest') {
            console.log('🚫 Acesso ao modal de configurações bloqueado para visitantes');
            mostrarNotificacao('🚫 Acesso não permitido no modo visitante', 'error');
            return;
        }
        
        try {
            abrirModalConfiguracoes();
        } catch (error) {
            console.error('❌ Erro ao abrir modal:', error);
        }
    }, 'Configurar botão de configurações');
    
    // ✨ NOVO: Botão de atualização manual
    EventManager.addClickHandler('btn-atualizar', async function(e) {
        console.log('🔄 Sincronização manual iniciada!');
        e.preventDefault();
        
        // ✨ DEBUG: Verificar se o elemento existe no momento do clique
        const elementoTeste = DomUtils.getElement('btn-atualizar');
        console.log('🔍 DEBUG - Elemento no momento do clique:', elementoTeste);
        console.log('🔍 DEBUG - DomUtils.getElement:', DomUtils.getElement('btn-atualizar'));
        
        await sincronizarManualmente();
    }, 'Configurar botão de atualização manual');
    
    // ✨ NOVO: Botão de sincronização manual de atividades
    EventManager.addClickHandler('btn-sync-atividades', async function(e) {
        console.log('🔄 Sincronização manual de atividades iniciada!');
        e.preventDefault();
        
        // Mostrar loading no botão
        const btn = e.target;
        const textoOriginal = btn.textContent;
        btn.textContent = 'Sincronizando...';
        btn.disabled = true;
        
        try {
            // Executar sincronização completa das atividades
            console.log('📤 Iniciando sincronização das atividades...');
            const sucesso = await salvarAtividades();
            
            if (sucesso) {
                // Mostrar notificação de sucesso
                mostrarNotificacao('✅ Atividades sincronizadas com sucesso!', 'success');
                console.log('✅ Sincronização manual das atividades concluída com sucesso!');
                
                // Atualizar a tela
                carregarAtividades();
            } else {
                // Mostrar notificação de erro
                mostrarNotificacao('❌ Erro na sincronização das atividades. Tente novamente.', 'error');
                console.log('❌ Erro na sincronização manual das atividades');
            }
        } catch (error) {
            console.error('❌ Erro durante sincronização manual das atividades:', error);
            
            // Mostrar notificação de erro com detalhes
            mostrarNotificacao('❌ Erro na sincronização: ' + error.message, 'error');
        } finally {
            // Restaurar botão
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }
    }, 'Configurar botão de sincronização manual de atividades');
    
    // ✨ NOVO: Botão de sair do sistema
    EventManager.addClickHandler('btn-sair', function(e) {
        console.log('🚪 Saindo do sistema...');
        e.preventDefault();
        
        // Confirmar antes de sair
        if (confirm('🤔 Deseja realmente sair do sistema?')) {
            window.AuthUtils.logout();
        }
    }, 'Configurar botão de sair');
    
    // Modal de configurações - event listeners
    console.log('🔧 Registrando event listener para fechar-modal');
    EventManager.addClickHandler('fechar-modal', function(e) {
        console.log('🎯 Botão fechar-modal clicado!', e);
        fecharModalConfiguracoes();
    }, 'Fechar modal - X');
    EventManager.addClickHandler('btn-cancelar-config', fecharModalConfiguracoes, 'Cancelar configurações');
    EventManager.addClickHandler('btn-salvar-config', salvarConfiguracoes, 'Salvar configurações');
    EventManager.addClickHandler('btn-baixar-log', baixarLog, 'Baixar log');
    EventManager.addClickHandler('btn-resetar-pontos', resetarPontos, 'Resetar pontos');
    EventManager.addClickHandler('btn-limpar-historico', limparHistorico, 'Limpar histórico');
    
    // Fechar modal clicando fora
    EventManager.addEventListener('#modal-configuracoes', 'click', function(e) {
        if (e.target.id === 'modal-configuracoes') {
            fecharModalConfiguracoes();
        }
    }, 'Fechar modal clicando fora');
    
    // Tabs do modal
    EventManager.delegateEvent('body', '.tab-btn', 'click', function(e) {
        console.log('🎯 Tab clicada:', e.target);
        const tabId = e.target.dataset.tab;
        console.log('📑 Tab ID:', tabId);
        ativarTab(tabId);
    }, 'Tabs do modal');
    
    // Botões principais
    EventManager.addClickHandler('btn-adicionar', handleAdicionarPontos, 'Adicionar pontos');
    EventManager.addClickHandler('btn-remover', handleRemoverPontos, 'Remover pontos');
    
    // ✨ REFATORADO: Migrar para EventManager (eliminar addEventListener duplicados)
    EventManager.addClickHandler('btn-avulso-add', handleAvulsoAdd, 'Adicionar pontos avulsos');
    EventManager.addClickHandler('btn-avulso-remove', handleAvulsoRemove, 'Remover pontos avulsos');
    EventManager.addClickHandler('btn-compartilhar', handleCompartilharHistorico, 'Compartilhar histórico');
    
    // Filtros e controles adicionais
    EventManager.addChangeHandler('filtro-filho', handleFiltroHistorico, 'Filtro por filho');
    EventManager.addChangeHandler('filtro-periodo', handleFiltroPeriodo, 'Filtro por período');
    EventManager.addChangeHandler('data-inicio', handleFiltroHistorico, 'Data início personalizada');
    EventManager.addChangeHandler('data-fim', handleFiltroHistorico, 'Data fim personalizada');
    
    // ✨ NOVA: Configurar eventos dos dropdowns customizados
    configurarEventosDropdown();
    
    console.log('✅ Configuração de eventos concluída');
}

// Configurar event listeners
// Carregar nomes do localStorage
function carregarNomes() {
    const nomesSalvos = localStorage.getItem('nomes');
    if (nomesSalvos) {
        nomes = JSON.parse(nomesSalvos);
    }
}

// Carregar atividades do localStorage
function carregarAtividades() {
    console.log('🔄 carregarAtividades() chamada');
    
    const atividadesPositivasSalvas = localStorage.getItem('atividadesPositivas');
    const atividadesNegativasSalvas = localStorage.getItem('atividadesNegativas');
    
    console.log('📱 Dados do localStorage:', {
        positivas: atividadesPositivasSalvas,
        negativas: atividadesNegativasSalvas
    });
    
    if (atividadesPositivasSalvas) {
        try {
            atividadesPositivas = JSON.parse(atividadesPositivasSalvas);
            console.log('✅ Atividades positivas carregadas:', atividadesPositivas);
        } catch (error) {
            console.error('❌ Erro ao carregar atividades positivas:', error);
            atividadesPositivas = [];
        }
    } else {
        console.log('⚠️ Nenhuma atividade positiva no localStorage');
        atividadesPositivas = [];
    }
    
    if (atividadesNegativasSalvas) {
        try {
            atividadesNegativas = JSON.parse(atividadesNegativasSalvas);
            console.log('✅ Atividades negativas carregadas:', atividadesNegativas);
        } catch (error) {
            console.error('❌ Erro ao carregar atividades negativas:', error);
            atividadesNegativas = [];
        }
    } else {
        console.log('⚠️ Nenhuma atividade negativa no localStorage');
        atividadesNegativas = [];
    }
    
    console.log('📊 Total de atividades carregadas:', {
        positivas: atividadesPositivas.length,
        negativas: atividadesNegativas.length
    });
}

// ✨ NOVA: Função para migrar dados antigos
function migrarDadosAntigos() {
    console.log('🔄 Verificando se há dados antigos para migrar...');
    
    // Verificar atividades positivas
    const positivasAntigas = JSON.parse(localStorage.getItem('atividadesPositivas') || '[]');
    let positivasAtualizadas = false;
    
    for (let i = 0; i < positivasAntigas.length; i++) {
        if (!positivasAntigas[i].tipo) {
            positivasAntigas[i].tipo = 'positiva';
            positivasAtualizadas = true;
        }
    }
    
    // Verificar atividades negativas
    const negativasAntigas = JSON.parse(localStorage.getItem('atividadesNegativas') || '[]');
    let negativasAtualizadas = false;
    
    for (let i = 0; i < negativasAntigas.length; i++) {
        if (!negativasAntigas[i].tipo) {
            negativasAntigas[i].tipo = 'negativa';
            negativasAtualizadas = true;
        }
    }
    
    // Salvar de volta se houve atualizações
    if (positivasAtualizadas) {
        localStorage.setItem('atividadesPositivas', JSON.stringify(positivasAntigas));
        console.log('✅ Migradas', positivasAntigas.length, 'atividades positivas');
    }
    
    if (negativasAtualizadas) {
        localStorage.setItem('atividadesNegativas', JSON.stringify(negativasAntigas));
        console.log('✅ Migradas', negativasAntigas.length, 'atividades negativas');
    }
    
    if (positivasAtualizadas || negativasAtualizadas) {
        console.log('🎉 Migração de dados concluída!');
        // ✨ NOVO: Forçar sincronização após migração usando sincronizarAposAcao
        setTimeout(async () => {
            console.log('🔄 Forçando sincronização após migração...');
            await salvarAtividades();
            await sincronizarAposAcao('migração de dados');
        }, 1000);
    } else {
        console.log('✅ Nenhuma migração necessária');
    }
}

// ✨ NOVA: Verificar e limpar dados corrompidos
function verificarELimparDadosCorrompidos() {
    console.log('🔍 Verificando dados corrompidos...');
    
    try {
        // Verificar atividades positivas
        const positivas = JSON.parse(localStorage.getItem('atividadesPositivas') || '[]');
        const positivasValidas = positivas.filter(atividade => {
            return atividade && atividade.nome && atividade.pontos !== undefined && atividade.tipo;
        });
        
        if (positivasValidas.length !== positivas.length) {
            console.warn('⚠️ Atividades positivas corrompidas detectadas. Limpando...');
            localStorage.setItem('atividadesPositivas', JSON.stringify(positivasValidas));
        }
        
        // Verificar atividades negativas
        const negativas = JSON.parse(localStorage.getItem('atividadesNegativas') || '[]');
        const negativasValidas = negativas.filter(atividade => {
            return atividade && atividade.nome && atividade.pontos !== undefined && atividade.tipo;
        });
        
        if (negativasValidas.length !== negativas.length) {
            console.warn('⚠️ Atividades negativas corrompidas detectadas. Limpando...');
            localStorage.setItem('atividadesNegativas', JSON.stringify(negativasValidas));
        }
        
        console.log('✅ Verificação de dados concluída', {
            positivasValidas: positivasValidas.length,
            negativasValidas: negativasValidas.length
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar dados:', error);
        // Em caso de erro grave, limpar tudo
        localStorage.removeItem('atividadesPositivas');
        localStorage.removeItem('atividadesNegativas');
        console.log('🧹 Dados corrompidos removidos - sistema limpo');
    }
}

// Salvar nomes no localStorage
function salvarNomes() {
    localStorage.setItem('nomes', JSON.stringify(nomes));
}

// ✨ ATUALIZADO: Salvar atividades no localStorage E MongoDB
async function salvarAtividades() {
    // ✨ NOVA: Validar dados antes de salvar
    console.log('🔄 Salvando atividades...', {
        positivas: atividadesPositivas.length,
        negativas: atividadesNegativas.length
    });
    
    // Validar e limpar atividades antes de salvar
    atividadesPositivas = atividadesPositivas.filter(atividade => 
        atividade && atividade.nome && atividade.pontos !== undefined
    ).map(atividade => ({
        ...atividade,
        tipo: atividade.tipo || 'positiva'
    }));
    
    atividadesNegativas = atividadesNegativas.filter(atividade => 
        atividade && atividade.nome && atividade.pontos !== undefined
    ).map(atividade => ({
        ...atividade,
        tipo: atividade.tipo || 'negativa'
    }));
    
    // Salvar no localStorage (backup local)
    localStorage.setItem('atividadesPositivas', JSON.stringify(atividadesPositivas));
    localStorage.setItem('atividadesNegativas', JSON.stringify(atividadesNegativas));
    
    // Salvar no MongoDB (sincronização entre dispositivos)
    if (socket && socket.connected) {
        try {
            const todasAtividades = [...atividadesPositivas, ...atividadesNegativas];
            
            console.log('☁️ Enviando para MongoDB:', todasAtividades.length, 'atividades');
            
            const response = await fetch('/api/salvar-atividades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ atividades: todasAtividades })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const resultado = await response.json();
            if (resultado.success) {
                console.log('✅ Atividades sincronizadas com MongoDB:', {
                    positivas: atividadesPositivas.length,
                    negativas: atividadesNegativas.length,
                    total: todasAtividades.length
                });
                return true; // ✨ NOVO: Retornar sucesso
            } else {
                console.error('❌ Erro ao sincronizar atividades:', resultado.error);
                throw new Error(resultado.error);
            }
        } catch (error) {
            console.error('❌ Erro na sincronização de atividades:', error);
            // Mostrar notificação de erro
            mostrarNotificacao('⚠️ Erro ao sincronizar atividades com servidor', 'error');
            return false; // ✨ NOVO: Retornar erro
        }
    } else {
        console.log('📱 Sem conexão - atividades salvas apenas localmente');
        mostrarNotificacao('📱 Atividades salvas localmente (sem conexão)', 'warning');
        return true; // ✨ NOVO: Considerar sucesso local
    }
    
    console.log('💾 Atividades salvas localmente:', {
        positivas: atividadesPositivas.length,
        negativas: atividadesNegativas.length
    });
    
    return true; // ✨ NOVO: Retornar sucesso por padrão
}

// ✨ NOVA: Sincronizar atividades do MongoDB
async function sincronizarAtividades() {
    console.log('� sincronizarAtividades() chamada');
    
    try {
        console.log('🔄 Sincronizando atividades do MongoDB...');
        const response = await fetch('/api/sincronizar-atividades');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const resultado = await response.json();
        console.log('📊 Resposta do servidor:', resultado);
        
        if (resultado.success && resultado.atividades) {
            console.log('📊 DEBUG: Atividades recebidas do servidor:', resultado.atividades);
            
            // ✨ CORREÇÃO: Garantir que todas as atividades tenham ID válido
            const atividadesComId = resultado.atividades.map(atividade => ({
                ...atividade,
                id: atividade.id || atividade._id || Date.now() + Math.random()
            }));
            
            console.log('📊 DEBUG: Atividades após normalização de ID:', atividadesComId);
            
            // Separar atividades por tipo
            console.log('🔍 DEBUG: Separando atividades por tipo...');
            
            atividadesPositivas = atividadesComId
                .filter(atividade => {
                    const isPositiva = atividade.tipo === 'positiva';
                    console.log(`📊 Atividade "${atividade.nome}" - tipo: "${atividade.tipo}" - é positiva: ${isPositiva}`);
                    return isPositiva;
                })
                .sort((a, b) => a.nome.localeCompare(b.nome));
            
            atividadesNegativas = atividadesComId
                .filter(atividade => {
                    const isNegativa = atividade.tipo === 'negativa';
                    console.log(`📊 Atividade "${atividade.nome}" - tipo: "${atividade.tipo}" - é negativa: ${isNegativa}`);
                    return isNegativa;
                })
                .sort((a, b) => a.nome.localeCompare(b.nome));
            
            console.log('📊 DEBUG: Resultados da separação:', {
                totalRecebidas: atividadesComId.length,
                positivasEncontradas: atividadesPositivas.length,
                negativasEncontradas: atividadesNegativas.length,
                listaPositivas: atividadesPositivas,
                listaNegativas: atividadesNegativas
            });
            
            // Salvar no localStorage como backup
            localStorage.setItem('atividadesPositivas', JSON.stringify(atividadesPositivas));
            localStorage.setItem('atividadesNegativas', JSON.stringify(atividadesNegativas));
            
            // Atualizar interface
            console.log('🔄 DEBUG: Forçando atualização da interface...');
            console.log('📋 DEBUG: Atividades carregadas:', {
                positivas: atividadesPositivas,
                negativas: atividadesNegativas
            });
            
            atualizarSelectsAtividades();
            
            // ✨ NOVA: Forçar atualização da lista com delay
            setTimeout(() => {
                console.log('🔄 DEBUG: Forçando atualização da lista de atividades...');
                atualizarListaAtividades();
            }, 100);
            
            console.log('☁️ Atividades sincronizadas do MongoDB:', {
                positivas: atividadesPositivas.length,
                negativas: atividadesNegativas.length,
                total: resultado.atividades.length
            });
        } else {
            console.log('📱 Nenhuma atividade no MongoDB - carregando do localStorage');
            carregarAtividadesLocal();
        }
    } catch (error) {
        console.error('❌ Erro ao sincronizar atividades do MongoDB:', error);
        console.log('📱 Fallback: carregando atividades do localStorage');
        carregarAtividadesLocal();
    }
}

// ✨ NOVA: Carregar atividades apenas do localStorage
function carregarAtividadesLocal() {
    console.log('📱 carregarAtividadesLocal() chamada');
    
    const positivas = JSON.parse(localStorage.getItem('atividadesPositivas') || '[]');
    const negativas = JSON.parse(localStorage.getItem('atividadesNegativas') || '[]');
    
    console.log('📱 Dados brutos do localStorage:', {
        positivas: positivas,
        negativas: negativas
    });
    
    // ✨ CORREÇÃO: Garantir que atividades tenham o campo 'tipo'
    atividadesPositivas = positivas.map(atividade => ({
        ...atividade,
        tipo: atividade.tipo || 'positiva'
    })).sort((a, b) => a.nome.localeCompare(b.nome));
    
    atividadesNegativas = negativas.map(atividade => ({
        ...atividade,
        tipo: atividade.tipo || 'negativa'
    })).sort((a, b) => a.nome.localeCompare(b.nome));
    
    console.log('📱 Atividades processadas:', {
        atividadesPositivas: atividadesPositivas,
        atividadesNegativas: atividadesNegativas
    });
    
    atualizarSelectsAtividades();
    atualizarListaAtividades();
    
    console.log('📱 Atividades carregadas do localStorage:', {
        positivas: atividadesPositivas.length,
        negativas: atividadesNegativas.length
    });
}

// ✨ DEBUG: Função global para testar atividades
window.debugAtividades = function() {
    console.log('🔍 === DEBUG ATIVIDADES ===');
    console.log('📊 Arrays atuais:', {
        atividadesPositivas: atividadesPositivas,
        atividadesNegativas: atividadesNegativas,
        positivasLength: atividadesPositivas.length,
        negativasLength: atividadesNegativas.length
    });
    
    console.log('📱 localStorage:', {
        positivas: localStorage.getItem('atividadesPositivas'),
        negativas: localStorage.getItem('atividadesNegativas')
    });
    
    console.log('🎯 Elementos DOM:', {
        listaPositivas: DomUtils.getElementById('lista-atividades-positivas'),
        listaNegativas: DomUtils.getElementById('lista-atividades-negativas')
    });
    
    console.log('🔄 Forçando atualização...');
    atualizarListaAtividades();
}

// ✨ TESTE DIRETO: Função para forçar carregamento das atividades do MongoDB
window.forcarCarregamentoMongoDB = async function() {
    console.log('🔄 === FORÇANDO CARREGAMENTO DO MONGODB ===');
    
    try {
        const response = await fetch('/api/sincronizar-atividades');
        const resultado = await response.json();
        
        console.log('📊 Dados recebidos:', resultado);
        
        if (resultado.success && resultado.atividades) {
            // Limpar arrays primeiro
            atividadesPositivas = [];
            atividadesNegativas = [];
            
            // Processar atividades
            resultado.atividades.forEach(atividade => {
                console.log('📝 Processando:', atividade);
                if (atividade.tipo === 'positiva') {
                    atividadesPositivas.push(atividade);
                } else if (atividade.tipo === 'negativa') {
                    atividadesNegativas.push(atividade);
                }
            });
            
            // Ordenar
            atividadesPositivas.sort((a, b) => a.nome.localeCompare(b.nome));
            atividadesNegativas.sort((a, b) => a.nome.localeCompare(b.nome));
            
            console.log('✅ Arrays atualizados:', {
                positivas: atividadesPositivas,
                negativas: atividadesNegativas
            });
            
            // Salvar no localStorage
            localStorage.setItem('atividadesPositivas', JSON.stringify(atividadesPositivas));
            localStorage.setItem('atividadesNegativas', JSON.stringify(atividadesNegativas));
            
            // Forçar atualização da interface
            atualizarListaAtividades();
            
            return true;
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        return false;
    }
};

// ✨ DESABILITADO: Função que adicionava atividades padrão automaticamente
// Esta função estava causando problema de atividades voltando após F5
/*
function garantirAtividadesPadrao() {
    console.log('🔄 Verificando atividades padrão...');
    
    // Verificar se as atividades mencionadas existem
    const temGuardouLouca = atividadesPositivas.some(a => a.nome.toLowerCase().includes('guardou a louça'));
    const temLavouLouca = atividadesPositivas.some(a => a.nome.toLowerCase().includes('lavou a louça'));
    
    if (!temGuardouLouca) {
        console.log('➕ Adicionando "guardou a louça"');
        const novaAtividade = {
            id: Date.now() + Math.random(),
            nome: 'guardou a louça',
            pontos: 10,
            tipo: 'positiva'
        };
        atividadesPositivas.push(novaAtividade);
    }
    
    if (!temLavouLouca) {
        console.log('➕ Adicionando "lavou a louça"');
        const novaAtividade = {
            id: Date.now() + Math.random(),
            nome: 'lavou a louça',
            pontos: 15,
            tipo: 'positiva'
        };
        atividadesPositivas.push(novaAtividade);
    }
    
    // Salvar no localStorage
    localStorage.setItem('atividadesPositivas', JSON.stringify(atividadesPositivas));
    localStorage.setItem('atividadesNegativas', JSON.stringify(atividadesNegativas));
    
    console.log('✅ Atividades padrão verificadas e salvas');
}
*/

// ✨ TESTE: Função para adicionar atividades de teste
window.adicionarAtividadesTeste = function() {
    console.log('🧪 Adicionando atividades de teste...');
    
    const atividadesTestePositivas = [
        { id: Date.now() + 1, nome: 'guardou a louça', pontos: 10, tipo: 'positiva' },
        { id: Date.now() + 2, nome: 'lavou a louça', pontos: 15, tipo: 'positiva' },
        { id: Date.now() + 3, nome: 'arrumou o quarto', pontos: 20, tipo: 'positiva' }
    ];
    
    const atividadesTesteNegativas = [
        { id: Date.now() + 4, nome: 'não guardou a louça', pontos: 5, tipo: 'negativa' },
        { id: Date.now() + 5, nome: 'brigou com irmão', pontos: 10, tipo: 'negativa' }
    ];
    
    // Salvar no localStorage
    localStorage.setItem('atividadesPositivas', JSON.stringify(atividadesTestePositivas));
    localStorage.setItem('atividadesNegativas', JSON.stringify(atividadesTesteNegativas));
    
    // Atualizar variáveis globais
    atividadesPositivas = atividadesTestePositivas;
    atividadesNegativas = atividadesTesteNegativas;
    
    console.log('✅ Atividades de teste adicionadas');
    console.log('🔄 Forçando atualização da interface...');
    
    atualizarSelectsAtividades();
    atualizarListaAtividades();
    
    return { positivas: atividadesTestePositivas, negativas: atividadesTesteNegativas };
};









// ✨ NOVA: Sincronizar logs do MongoDB
async function sincronizarLogs() {
    try {
        console.log('🔄 Sincronizando logs do MongoDB...');
        const response = await fetch('/api/sincronizar-logs');
        const resultado = await response.json();
        
        if (resultado.success && resultado.logs) {
            // Atualizar logs globais
            logs = resultado.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Salvar no localStorage como backup
            localStorage.setItem('logs', JSON.stringify(logs));
            
            console.log('☁️ Logs sincronizados do MongoDB:', {
                total: logs.length
            });
        } else {
            console.log('📱 Nenhum log no MongoDB - carregando do localStorage');
            carregarLogsLocal();
        }
    } catch (error) {
        console.error('❌ Erro ao sincronizar logs do MongoDB:', error);
        console.log('📱 Fallback: carregando logs do localStorage');
        carregarLogsLocal();
    }
}

// ✨ NOVA: Carregar logs apenas do localStorage
function carregarLogsLocal() {
    const logsLocal = JSON.parse(localStorage.getItem('logs') || '[]');
    logs = logsLocal.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log('📱 Logs carregados do localStorage:', {
        total: logs.length
    });
}

// ✨ NOVA: Salvar logs no MongoDB e localStorage
async function salvarLogs() {
    // Salvar no localStorage (backup local)
    localStorage.setItem('logs', JSON.stringify(logs));
    
    // Salvar no MongoDB (sincronização entre dispositivos)
    if (socket && socket.connected && logs.length > 0) {
        try {
            const response = await fetch('/api/salvar-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ logs })
            });
            
            const resultado = await response.json();
            if (resultado.success) {
                console.log('☁️ Logs sincronizados com MongoDB:', {
                    total: logs.length
                });
            } else {
                console.error('❌ Erro ao sincronizar logs:', resultado.error);
            }
        } catch (error) {
            console.error('❌ Erro na sincronização de logs:', error);
        }
    }
    
    console.log('💾 Logs salvos localmente:', {
        total: logs.length
    });
}

// ✨ NOVA: Limpar cache de atividades (para debug)
function limparCacheAtividades() {
    localStorage.removeItem('atividadesPositivas');
    localStorage.removeItem('atividadesNegativas');
    atividadesPositivas = [];
    atividadesNegativas = [];
    atualizarSelectsAtividades();
    atualizarListaAtividades();
    console.log('🧹 Cache de atividades limpo');
}

// Renderizar dashboard de pontos dinâmico
function renderizarDashboard() {
    console.log('🎯 RENDERIZAR DASHBOARD CHAMADO');
    console.log('📊 Array filhos:', filhos);
    console.log('📊 Quantidade de filhos:', filhos.length);
    
    const container = DomUtils.getElement('.pontos-display');
    console.log('📦 Container encontrado:', container);
    
    if (!container) {
        console.error('❌ Container .pontos-display não encontrado!');
        return;
    }
    
    container.innerHTML = '';
    console.log('🧹 Container limpo');
    
    if (filhos.length === 0) {
        console.warn('⚠️ Array filhos está vazio!');
        container.innerHTML = '<p>Nenhuma criança encontrada. Verifique a sincronização.</p>';
        return;
    }
    
    filhos.forEach((filho, index) => {
        console.log(`👶 Renderizando filho ${index}:`, filho);
        
        const filhoElement = document.createElement('div');
        filhoElement.className = 'filho-pontos';
        
        // Verificar se a cor existe e tem gradiente
        let background = '#ccc'; // cor padrão
        if (filho.cor && filho.cor.gradiente) {
            background = filho.cor.gradiente;
        } else if (filho.cor && typeof filho.cor === 'string') {
            background = filho.cor;
        }
        
        filhoElement.style.background = background;
        filhoElement.innerHTML = `
            <h3><span>${filho.emoji || '👶'} ${filho.nome || 'Sem nome'}</span></h3>
            <span class="pontos">${filho.pontos || 0}</span>
        `;
        
        container.appendChild(filhoElement);
        console.log(`✅ Filho ${filho.nome} adicionado ao container`);
    });
    
    console.log('🎯 DASHBOARD RENDERIZADO COM SUCESSO');
}

// Renderizar selects de filhos
function renderizarSelects() {
    console.log('🔄 Renderizando selects de filhos...');
    
    const selects = [
        'filho-adicionar',
        'filho-remover', 
        'filho-avulso-add',
        'filho-avulso-remove',
        'filtro-filho'
    ];
    
    selects.forEach(selectId => {
        const select = DomUtils.getElementById(selectId);
        console.log(`🔍 Select ${selectId}:`, select);
        
        if (select) {
            // Salvar valor atual
            const valorAtual = select.value;
            
            // Limpar opções
            select.innerHTML = '';
            
            // Adicionar opção padrão
            if (selectId === 'filtro-filho') {
                select.innerHTML = '<option value="">Todos os filhos</option>';
            } else {
                select.innerHTML = '<option value="">Selecione o filho</option>';
            }
            
            // Adicionar filhos
            filhos.forEach(filho => {
                const option = document.createElement('option');
                option.value = filho.id;
                option.textContent = `${filho.emoji} ${filho.nome}`;
                select.appendChild(option);
            });
            
            // Restaurar valor se ainda existir
            if (valorAtual && select.querySelector(`option[value="${valorAtual}"]`)) {
                select.value = valorAtual;
            }
            
            console.log(`✅ Select ${selectId} atualizado com ${filhos.length} filhos`);
        } else {
            console.log(`⚠️ Select ${selectId} não encontrado no DOM`);
        }
    });
}

// Atualizar toda a interface
function atualizarInterface() {
    console.log('🎨 Atualizando interface com', filhos.length, 'filhos');
    renderizarDashboard();
    renderizarSelects();
    
    // ✨ CORREÇÃO: Só renderizar lista de filhos se o modal estiver aberto
    const modalConfiguracao = DomUtils.getElementById('modal-configuracoes');
    if (modalConfiguracao && modalConfiguracao.classList.contains('active')) {
        renderizarListaFilhos();
    }
    
    // Atualizar histórico também
    const filtroAtual = DomUtils.getElement('filtro-filho')?.value || 'todos';
    atualizarHistorico(filtroAtual);
    
    // ✨ NOVO: Atualizar select de crianças para lembretes
    if (typeof carregarSelectCriancas === 'function') {
        carregarSelectCriancas();
    }
    
    console.log('✅ Interface atualizada (incluindo histórico e lembretes)');
}

// Encontrar filho por ID
function encontrarFilho(id) {
    return filhos.find(filho => filho.id == id);
}

// Gerar ID único para novo filho
function gerarNovoId() {
    return filhos.length > 0 ? Math.max(...filhos.map(f => f.id)) + 1 : 1;
}

// Atualizar listas de atividades
function atualizarListaAtividades() {
    console.log('🔄 atualizarListaAtividades() chamada');
    
    // 1. Buscar elementos DOM
    const listaPositivas = DomUtils.getElementById('lista-atividades-positivas');
    const listaNegativas = DomUtils.getElementById('lista-atividades-negativas');
    
    console.log('🔍 Elementos DOM encontrados:', {
        listaPositivas: !!listaPositivas,
        listaNegativas: !!listaNegativas
    });
    
    // 2. Se elementos não existem, tentar novamente com retry
    if (!listaPositivas || !listaNegativas) {
        console.log('📋 Listas de atividades não encontradas - tentando novamente...');
        
        // Retry com múltiplas tentativas
        let tentativas = 0;
        const maxTentativas = 3;
        
        const tentarNovamente = () => {
            tentativas++;
            console.log(`🔄 Tentativa ${tentativas} de carregar lista de atividades...`);
            
            const listaPositivas2 = DomUtils.getElementById('lista-atividades-positivas');
            const listaNegativas2 = DomUtils.getElementById('lista-atividades-negativas');
            
            if (listaPositivas2 && listaNegativas2) {
                console.log('✅ Elementos encontrados na tentativa', tentativas);
                renderizarAtividades(listaPositivas2, listaNegativas2);
            } else if (tentativas < maxTentativas) {
                setTimeout(tentarNovamente, 500);
            } else {
                console.log('⚠️ Elementos não disponíveis após', maxTentativas, 'tentativas');
                console.log('💡 Modal de configurações pode não estar aberto');
            }
        };
        
        setTimeout(tentarNovamente, 500);
        return;
    }
    
    // 3. Renderizar atividades
    renderizarAtividades(listaPositivas, listaNegativas);
}

// ✨ NOVA: Função auxiliar para renderizar atividades
function renderizarAtividades(listaPositivas, listaNegativas) {
    console.log('🎨 DEBUG: renderizarAtividades() chamada');
    console.log('📋 DEBUG: Arrays de atividades:', {
        atividadesPositivas: atividadesPositivas,
        atividadesNegativas: atividadesNegativas,
        positivasLength: atividadesPositivas.length,
        negativasLength: atividadesNegativas.length
    });
    
    // Limpar listas
    listaPositivas.innerHTML = '';
    listaNegativas.innerHTML = '';
    
    // ✨ NOVO: Ordenar atividades alfabeticamente antes de exibir
    const positivasOrdenadas = [...atividadesPositivas].sort((a, b) => a.nome.localeCompare(b.nome));
    const negativasOrdenadas = [...atividadesNegativas].sort((a, b) => a.nome.localeCompare(b.nome));
    
    console.log('📊 DEBUG: Atividades ordenadas:', {
        positivasOrdenadas: positivasOrdenadas,
        negativasOrdenadas: negativasOrdenadas,
        positivasLength: positivasOrdenadas.length,
        negativasLength: negativasOrdenadas.length
    });
    
    // Verificar se há atividades para mostrar
    if (positivasOrdenadas.length === 0) {
        console.log('⚠️ DEBUG: Nenhuma atividade positiva encontrada - mostrando mensagem vazia');
        listaPositivas.innerHTML = '<p class="no-activities">📝 Nenhuma atividade positiva cadastrada ainda.</p>';
    } else {
        console.log(`✅ DEBUG: ${positivasOrdenadas.length} atividades positivas encontradas - criando elementos`);
        // Adicionar atividades positivas em ordem alfabética
        positivasOrdenadas.forEach(atividade => {
            console.log('➕ DEBUG: Criando item para atividade positiva:', atividade);
            const item = criarItemAtividade(atividade, 'positiva');
            console.log('➕ DEBUG: Item criado:', item);
            listaPositivas.appendChild(item);
            console.log('➕ DEBUG: Item adicionado à lista');
        });
    }
    
    if (negativasOrdenadas.length === 0) {
        listaNegativas.innerHTML = '<p class="no-activities">📝 Nenhuma atividade negativa cadastrada ainda.</p>';
    } else {
        // Adicionar atividades negativas em ordem alfabética
        negativasOrdenadas.forEach(atividade => {
            console.log('➖ Criando item para atividade negativa:', atividade.nome);
            const item = criarItemAtividade(atividade, 'negativa');
            listaNegativas.appendChild(item);
        });
    }
    
    console.log('📋 Listas de atividades atualizadas:', {
        positivas: positivasOrdenadas.length,
        negativas: negativasOrdenadas.length
    });
}

// Criar item de atividade
function criarItemAtividade(atividade, tipo) {
    const item = document.createElement('div');
    item.className = `atividade-item atividade-${tipo}`;
    item.dataset.id = atividade.id;
    
    // ✨ MELHORADO: Visual mais claro com ícones e cores
    const icone = tipo === 'positiva' ? '✅' : '❌';
    const sinal = tipo === 'positiva' ? '+' : '-';
    const corClasse = tipo === 'positiva' ? 'text-success' : 'text-danger';
    
    item.innerHTML = `
        <div class="atividade-info">
            <div class="atividade-header">
                <span class="atividade-icone">${icone}</span>
                <div class="atividade-nome">${atividade.nome}</div>
            </div>
            <div class="atividade-pontos ${corClasse}">
                <strong>${sinal}${atividade.pontos}</strong> pontos
            </div>
        </div>
        <div class="atividade-acoes">
            <button class="btn-edit btn btn-sm btn-primary" onclick="editarAtividade(${atividade.id}, '${tipo}')" title="Editar atividade">
                ✏️
            </button>
            <button class="btn-delete btn btn-sm btn-danger" onclick="deletarAtividade(${atividade.id}, '${tipo}')" title="Deletar atividade">
                🗑️
            </button>
        </div>
    `;
    
    return item;
}

// Editar atividade
async function editarAtividade(id, tipo) {
    const atividades = tipo === 'positiva' ? atividadesPositivas : atividadesNegativas;
    const atividade = atividades.find(a => a.id === id);
    
    if (!atividade) return;
    
    const novoNome = prompt('Novo nome da atividade:', atividade.nome);
    if (!novoNome) return;
    
    const novosPontos = parseInt(prompt('Novos pontos:', atividade.pontos));
    if (isNaN(novosPontos) || novosPontos < 1) return;
    
    atividade.nome = novoNome;
    atividade.pontos = novosPontos;
    
    await salvarAtividades();
    atualizarSelectsAtividades();
    atualizarListaAtividades();
    
    // ✨ NOVO: Sincronizar após editar atividade
    await sincronizarAposAcao('editar atividade');
    
    mostrarNotificacao('✅ Atividade editada com sucesso!', 'success');
}

// Deletar atividade
// Deletar atividade
async function deletarAtividade(id, tipo) {
    if (!confirm('Tem certeza que quer deletar esta atividade?')) return;
    
    if (tipo === 'positiva') {
        atividadesPositivas = atividadesPositivas.filter(a => a.id !== id);
    } else {
        atividadesNegativas = atividadesNegativas.filter(a => a.id !== id);
    }
    
    await salvarAtividades();
    atualizarSelectsAtividades();
    atualizarListaAtividades();
    
    // ✨ NOVO: Sincronizar após deletar atividade
    await sincronizarAposAcao('deletar atividade');
    
    mostrarNotificacao('🗑️ Atividade deletada!', 'warning');
}

// Nova atividade positiva
// Nova atividade positiva
async function handleNovaAtividadePositiva(e) {
    e.preventDefault();
    
    const nome = DomUtils.getValue('nova-atividade-positiva');
    const pontos = parseInt(DomUtils.getValue('pontos-atividade-positiva'));
    
    if (!nome || isNaN(pontos) || pontos < 1) {
        alert('Por favor, preencha todos os campos corretamente!');
        return;
    }
    
    const novaAtividade = {
        id: Date.now(),
        nome: nome,
        pontos: pontos,
        tipo: 'positiva'
    };
    
    atividadesPositivas.push(novaAtividade);
    
    // ✨ NOVO: Adicionar log do cadastro de atividade
    adicionarLog('cadastrar_atividade_positiva', {
        nome_atividade: nome,
        pontos: pontos,
        total_atividades_positivas: atividadesPositivas.length
    });
    
    await salvarAtividades();
    atualizarSelectsAtividades();
    atualizarListaAtividades();
    
    // ✨ NOVO: Sincronizar após adicionar atividade
    await sincronizarAposAcao('adicionar atividade positiva');
    
    // Limpar formulário
    e.target.reset();
    DomUtils.setValue('pontos-atividade-positiva', '10');
    
    mostrarNotificacao('✅ Atividade positiva adicionada!', 'success');
}

// Nova atividade negativa
async function handleNovaAtividadeNegativa(e) {
    e.preventDefault();
    
    const nome = DomUtils.getValue('nova-atividade-negativa');
    const pontos = parseInt(DomUtils.getValue('pontos-atividade-negativa'));
    
    if (!nome || isNaN(pontos) || pontos < 1) {
        alert('Por favor, preencha todos os campos corretamente!');
        return;
    }
    
    const novaAtividade = {
        id: Date.now(),
        nome: nome,
        pontos: pontos,
        tipo: 'negativa'
    };
    
    atividadesNegativas.push(novaAtividade);
    
    // ✨ NOVO: Adicionar log do cadastro de atividade
    adicionarLog('cadastrar_atividade_negativa', {
        nome_atividade: nome,
        pontos: pontos,
        total_atividades_negativas: atividadesNegativas.length
    });
    
    await salvarAtividades();
    atualizarSelectsAtividades();
    atualizarListaAtividades();
    
    // ✨ NOVO: Sincronizar após adicionar atividade
    await sincronizarAposAcao('adicionar atividade negativa');
    
    // Limpar formulário
    e.target.reset();
    DomUtils.setValue('pontos-atividade-negativa', '5');
    
    mostrarNotificacao('✅ Atividade negativa adicionada!', 'success');
}

// Atividade selecionada para adicionar
function handleAtividadeAdicionar(e) {
    const atividadeId = e.target.value;
    
    if (atividadeId === 'personalizada') {
        DomUtils.getElement('motivo-adicionar').focus();
        return;
    }
    
    const atividade = atividadesPositivas.find(a => a.id === parseInt(atividadeId));
    if (atividade) {
        DomUtils.setValue('pontos-adicionar', atividade.pontos);
        DomUtils.setValue('motivo-adicionar', atividade.nome);
    }
}

// Atividade selecionada para remover
function handleAtividadeRemover(e) {
    const atividadeId = e.target.value;
    
    if (atividadeId === 'personalizada') {
        DomUtils.getElement('motivo-remover').focus();
        return;
    }
    
    const atividade = atividadesNegativas.find(a => a.id === parseInt(atividadeId));
    if (atividade) {
        DomUtils.setValue('pontos-remover', atividade.pontos);
        DomUtils.setValue('motivo-remover', atividade.nome);
    }
}

// Salvar nomes
function handleSalvarNomes(e) {
    e.preventDefault();
    
    nomes.filho1 = DomUtils.getValue('nome1');
    nomes.filho2 = DomUtils.getValue('nome2');
    nomes.filho3 = DomUtils.getValue('nome3');
    
    salvarNomes();
    atualizarNomes();
    
    mostrarNotificacao('✅ Nomes salvos com sucesso!', 'success');
}

// Adicionar pontos
async function handleAdicionarPontos(e) {
    e.preventDefault();
    console.log('🎯 handleAdicionarPontos chamado');
    
    // ✨ ATUALIZADO: Usar dropdown customizado
    const filhoSelect = DomUtils.getElementById('filho-adicionar');
    const hiddenSelect = DomUtils.getElementById('atividade-adicionar');
    
    console.log('🔍 Elementos encontrados:', {
        filhoSelect,
        hiddenSelect,
        filhoValue: filhoSelect?.value,
        atividadeValue: hiddenSelect?.value
    });
    
    if (!filhoSelect || !hiddenSelect) {
        console.error('❌ Elementos do formulário não encontrados');
        mostrarNotificacao('❌ Erro: Elementos do formulário não encontrados!', 'error');
        return;
    }
    
    const filhoId = filhoSelect.value;
    const atividadeValue = hiddenSelect.value;
    
    console.log('🔍 DEBUG handleAdicionarPontos:', { filhoId, atividadeValue });
    
    if (!filhoId || !atividadeValue) {
        mostrarNotificacao('❌ Por favor, selecione um filho e uma atividade!', 'error');
        return;
    }
    
    // ✨ NOVA LÓGICA: Parsear atividade do JSON
    let atividade;
    try {
        atividade = JSON.parse(atividadeValue);
        console.log('🔍 DEBUG atividade encontrada:', atividade);
    } catch (error) {
        console.error('❌ Erro ao parsear atividade:', error);
        mostrarNotificacao('❌ Erro na atividade selecionada!', 'error');
        return;
    }
    
    const filho = encontrarFilho(filhoId);
    
    if (!filho) {
        mostrarNotificacao('❌ Filho não encontrado!', 'error');
        return;
    }
    
    // ✨ REFATORADO: Usar ApiService para chamada de API
    const result = await ApiService.pontosOperation('adicionar', {
        nome: filho.nome,
        pontos: atividade.pontos,
        atividade: atividade.nome,
        tipo: 'adicionar'
    });
    
    if (result.success) {
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
        
        // Notificar outros dispositivos via WebSocket
        // ✨ REFATORADO: Usar WebSocketSync em vez de notificarAlteracaoWebSocket
        WebSocketSync.sincronizarPontos({
            tipo: 'adicionar',
            nome: filho.nome,
            pontos: filho.pontos,
            atividade: atividade.nome,
            timestamp: new Date().toISOString()
        });
        
        // ✨ REFATORADO: Limpar dropdown customizado
        limparDropdown('adicionar');
        
        // Atualizar interface
        atualizarInterface();
        await salvarDados();
        
        // ✨ NOVO: Sincronizar após ação
        await sincronizarAposAcao('adicionar pontos');
        
        mostrarNotificacao(`✅ +${atividade.pontos} pontos para ${filho.nome}!`, 'success');
    } else if (result.fallbackOffline) {
        // Fallback offline - continuar operação localmente
        const pontosAntes = filho.pontos;
        filho.pontos += atividade.pontos;
        
        adicionarLog('adicionar_pontos', {
            filho: filho.nome,
            atividade: atividade.nome,
            pontos: atividade.pontos,
            pontos_antes: pontosAntes,
            pontos_depois: filho.pontos,
            tipo: 'positiva'
        });
        
        DomUtils.setValue('atividade-adicionar', '');
        atualizarInterface();
        await salvarDados();
        
        // ✨ NOVO: Sincronizar após ação offline
        await sincronizarAposAcao('adicionar pontos (offline)');
        
        // Notificação mais simples para operações offline
        mostrarNotificacao(`✅ +${atividade.pontos} pontos para ${filho.nome}!`, 'success');
    }
}

// Remover pontos
async function handleRemoverPontos(e) {
    e.preventDefault();
    console.log('🎯 handleRemoverPontos chamado');
    
    // ✨ ATUALIZADO: Usar dropdown customizado
    const filhoSelect = DomUtils.getElementById('filho-remover');
    const hiddenSelect = DomUtils.getElementById('atividade-remover');
    
    console.log('🔍 Elementos encontrados:', {
        filhoSelect,
        hiddenSelect,
        filhoValue: filhoSelect?.value,
        atividadeValue: hiddenSelect?.value
    });
    
    if (!filhoSelect || !hiddenSelect) {
        console.error('❌ Elementos do formulário não encontrados');
        mostrarNotificacao('❌ Erro: Elementos do formulário não encontrados!', 'error');
        return;
    }
    
    const filhoId = filhoSelect.value;
    const atividadeValue = hiddenSelect.value;
    
    if (!filhoId || !atividadeValue) {
        mostrarNotificacao('❌ Por favor, selecione um filho e uma atividade!', 'error');
        return;
    }
    
    // ✨ NOVA LÓGICA: Parsear atividade do JSON
    let atividade;
    try {
        atividade = JSON.parse(atividadeValue);
        console.log('🔍 DEBUG atividade encontrada:', atividade);
    } catch (error) {
        console.error('❌ Erro ao parsear atividade:', error);
        mostrarNotificacao('❌ Erro na atividade selecionada!', 'error');
        return;
    }
    const filho = encontrarFilho(filhoId);
    
    if (!filho) {
        mostrarNotificacao('❌ Filho não encontrado!', 'error');
        return;
    }
    
    // ✨ REFATORADO: Usar ApiService para chamada de API
    const result = await ApiService.pontosOperation('remover', {
        nome: filho.nome,
        pontos: atividade.pontos,
        atividade: atividade.nome,
        tipo: 'remover'
    });
    
    if (result.success) {
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
        
        // Notificar outros dispositivos via WebSocket
        // ✨ REFATORADO: Usar WebSocketSync em vez de notificarAlteracaoWebSocket
        WebSocketSync.sincronizarPontos({
            tipo: 'remover',
            nome: filho.nome,
            pontos: filho.pontos,
            atividade: atividade.nome,
            timestamp: new Date().toISOString()
        });
        
        // ✨ REFATORADO: Limpar dropdown customizado
        limparDropdown('remover');
        
        // Atualizar interface
        atualizarInterface();
        await salvarDados();
        
        // ✨ NOVO: Sincronizar após ação
        await sincronizarAposAcao('remover pontos');
        
        mostrarNotificacao(`✅ -${atividade.pontos} pontos para ${filho.nome}!`, 'success');
    } else if (result.fallbackOffline) {
        // Fallback offline - continuar operação localmente
        const pontosAntes = filho.pontos;
        filho.pontos -= atividade.pontos;
        
        adicionarLog('remover_pontos', {
            filho: filho.nome,
            atividade: atividade.nome,
            pontos: atividade.pontos,
            pontos_antes: pontosAntes,
            pontos_depois: filho.pontos,
            tipo: 'negativa'
        });
        
        limparDropdown('remover');
        atualizarInterface();
        await salvarDados();
        
        // ✨ NOVO: Sincronizar após ação offline
        await sincronizarAposAcao('remover pontos (offline)');
        
        // Notificação mais simples para operações offline
        mostrarNotificacao(`✅ -${atividade.pontos} pontos para ${filho.nome}!`, 'success');
    }
}

// Resetar pontos
            
            // Atualizar histórico
// Resetar pontos

// Atualizar exibição do histórico
function atualizarHistorico(filtro = 'todos') {
    // ✨ REFATORADO: Usar DomUtils.getElementById para acessar container do histórico
    let historicoContainer = DomUtils.getElementById('historico');
    
    // ✨ FALLBACK: Tentar encontrar por querySelector se DomUtils falhar
    if (!historicoContainer) {
        historicoContainer = DomUtils.getElement('historico');
    }
    
    if (!historicoContainer) {
        console.log('📋 Container de histórico não encontrado - tentando novamente em 500ms...');
        setTimeout(() => {
            console.log('� Segunda tentativa de carregar histórico...');
            const historicoContainer2 = DomUtils.getElement('historico');
            
            if (historicoContainer2) {
                console.log('✅ Container de histórico encontrado na segunda tentativa');
                renderizarHistorico(historicoContainer2, filtro);
            } else {
                console.log('⚠️ Container de histórico ainda não disponível - aba pode não estar aberta');
            }
        }, 500);
        return;
    }
    
    console.log('✅ Container de histórico encontrado:', historicoContainer);
    renderizarHistorico(historicoContainer, filtro);
}

// ✨ NOVA: Função auxiliar para renderizar histórico
function renderizarHistorico(historicoContainer, filtro = 'todos') {
    // ✨ CORREÇÃO: Usar logs ao invés de historico
    // Filtrar APENAS logs de pontos (excluindo TODOS os logs de sistema)
    const nomesCriancasAtivas = filhos.map(f => f.nome.toLowerCase());
    
    const logsDeHistorico = logs.filter(log => {
        // APENAS logs de pontos com crianças que ainda existem
        if ((log.acao === 'adicionar_pontos' || log.acao === 'remover_pontos') && 
            log.detalhes && log.detalhes.filho && log.detalhes.atividade) {
            return nomesCriancasAtivas.includes(log.detalhes.filho.toLowerCase());
        }
        
        // Excluir TODOS os outros logs (sistema, login, logout, cadastrar_filho, etc.)
        return false;
    });
    
    // Filtrar logs baseado no filtro selecionado
    let historicoFiltrado = logsDeHistorico;
    
    if (filtro !== 'todos') {
        const filho = encontrarFilho(filtro);
        if (filho) {
            historicoFiltrado = logsDeHistorico.filter(log => 
                log.detalhes.filho === filho.nome
            );
        }
    }
    
    console.log('📊 Histórico filtrado:', historicoFiltrado.length, 'itens');
    console.log('📋 Logs de pontos encontrados:', logsDeHistorico.map(log => ({
        acao: log.acao,
        filho: log.detalhes?.filho,
        atividade: log.detalhes?.atividade
    })));
    
    // ✨ CORREÇÃO: Usar a função de atualização de lista corrigida
    atualizarListaHistoricoComContainer(historicoContainer, historicoFiltrado);
}

// Função para lidar com o filtro do histórico
function handleFiltroHistorico() {
    aplicarFiltrosHistorico();
}

// Função para lidar com o filtro de período
function handleFiltroPeriodo() {
    // ✨ REFATORADO: Usar DomUtils para filtros
    const periodo = DomUtils.getValue('filtro-periodo');
    const datasPersonalizadas = DomUtils.getElement('filtro-datas-personalizadas');
    
    if (periodo === 'personalizado') {
        datasPersonalizadas.style.display = 'block';
        // Definir data padrão (últimos 30 dias)
        const hoje = new Date();
        const umMesAtras = new Date();
        umMesAtras.setDate(hoje.getDate() - 30);
        
        // ✨ REFATORADO: Usar DomUtils para definir datas
        DomUtils.setValue('data-fim', hoje.toISOString().split('T')[0]);
        DomUtils.setValue('data-inicio', umMesAtras.toISOString().split('T')[0]);
    } else {
        datasPersonalizadas.style.display = 'none';
    }
    
    aplicarFiltrosHistorico();
}

// Função principal para aplicar todos os filtros
function aplicarFiltrosHistorico() {
    // ✨ REFATORADO: Usar DomUtils para obter valores de filtros
    const filtroFilho = DomUtils.getValue('filtro-filho');
    const filtroPeriodo = DomUtils.getValue('filtro-periodo');
    
    console.log('🔍 Aplicando filtros:', { filtroFilho, filtroPeriodo });
    
    // ✨ CORREÇÃO: Usar logs ao invés de historico
    if (!logs || logs.length === 0) {
        atualizarListaHistorico([]);
        return;
    }
    
    // ✨ CORREÇÃO: Filtrar APENAS logs de pontos (excluindo TODOS os logs de sistema)
    const nomesCriancasAtivas = filhos.map(f => f.nome.toLowerCase());
    
    let historicoFiltrado = logs.filter(log => {
        // APENAS logs de pontos com crianças que ainda existem
        if ((log.acao === 'adicionar_pontos' || log.acao === 'remover_pontos') && 
            log.detalhes && log.detalhes.filho && log.detalhes.atividade) {
            return nomesCriancasAtivas.includes(log.detalhes.filho.toLowerCase());
        }
        
        // Excluir TODOS os outros logs (sistema, login, logout, cadastrar_filho, etc.)
        return false;
    });
    
    // Filtrar por filho
    if (filtroFilho !== 'todos') {
        const filhoId = parseInt(filtroFilho);
        const filhoSelecionado = filhos.find(f => f.id === filhoId);
        if (filhoSelecionado) {
            historicoFiltrado = historicoFiltrado.filter(item => 
                item.detalhes && (
                    item.detalhes.filho === filhoSelecionado.nome || 
                    item.acao.includes(filhoSelecionado.nome)
                )
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
                // ✨ REFATORADO: Usar DomUtils para obter datas personalizadas
                const dataInicio = DomUtils.getValue('data-inicio');
                const dataFim = DomUtils.getValue('data-fim');
                
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

// ✨ NOVA: Função para atualizar lista de histórico com container específico
function atualizarListaHistoricoComContainer(container, historicoFiltrado) {
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
        const dataA = new Date(a.timestamp);
        const dataB = new Date(b.timestamp);
        return dataB - dataA;
    });
    
    historicoFiltrado.forEach(item => {
        console.log('📄 Processando item do log:', item);
        
        // ✨ CORREÇÃO: Usar timestamp dos logs
        const data = new Date(item.timestamp);
        
        console.log('📅 Data timestamp:', item.timestamp, '→ Data objeto:', data);
        
        // Verificar se a data é válida
        if (isNaN(data.getTime())) {
            console.warn('⚠️ Data inválida encontrada:', item.timestamp);
            return; // Pular este item
        }
        
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // ✨ CORREÇÃO: Criar ação formatada baseada no tipo de log
        let icone = '📝';
        let acaoTexto = item.acao;
        
        if (item.acao.includes('adicionar_pontos')) {
            icone = '➕';
            if (item.detalhes && item.detalhes.filho) {
                acaoTexto = `${item.detalhes.filho} ganhou ${item.detalhes.pontos} pontos`;
            }
        } else if (item.acao.includes('remover_pontos')) {
            icone = '➖';
            if (item.detalhes && item.detalhes.filho) {
                acaoTexto = `${item.detalhes.filho} perdeu ${item.detalhes.pontos} pontos`;
            }
        }
        
        const motivo = item.detalhes && item.detalhes.atividade ? item.detalhes.atividade : '';
        
        const historicoItem = document.createElement('div');
        historicoItem.className = 'historico-item';
        historicoItem.innerHTML = `
            <span class="data">${dataFormatada} ${horaFormatada}</span>
            <span class="acao">${icone} ${acaoTexto}</span>
            <span class="motivo">${motivo}</span>
        `;
        container.appendChild(historicoItem);
    });
}

// Função para atualizar a lista visual do histórico (versão original)
function atualizarListaHistorico(historicoFiltrado) {
    // ✨ REFATORADO: Usar DomUtils.getElementById para container do histórico
    const container = DomUtils.getElementById('historico');
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
        const dataA = new Date(a.timestamp);
        const dataB = new Date(b.timestamp);
        return dataB - dataA;
    });
    
    historicoFiltrado.forEach(item => {
        console.log('📄 Processando item do log:', item);
        
        // ✨ CORREÇÃO: Usar timestamp dos logs
        const data = new Date(item.timestamp);
        
        console.log('📅 Data timestamp:', item.timestamp, '→ Data objeto:', data);
        
        // Verificar se a data é válida
        if (isNaN(data.getTime())) {
            console.warn('⚠️ Data inválida encontrada:', item.timestamp);
            return; // Pular este item
        }
        
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // ✨ CORREÇÃO: Criar ação formatada baseada no tipo de log
        let icone = '📝';
        let acaoTexto = item.acao;
        
        if (item.acao.includes('adicionar_pontos')) {
            icone = '➕';
            if (item.detalhes && item.detalhes.filho) {
                acaoTexto = `${item.detalhes.filho} ganhou ${item.detalhes.pontos} pontos`;
            }
        } else if (item.acao.includes('remover_pontos')) {
            icone = '➖';
            if (item.detalhes && item.detalhes.filho) {
                acaoTexto = `${item.detalhes.filho} perdeu ${item.detalhes.pontos} pontos`;
            }
        }
        
        const motivo = item.detalhes && item.detalhes.atividade ? item.detalhes.atividade : '';
        
        const historicoItem = document.createElement('div');
        historicoItem.className = 'historico-item';
        historicoItem.innerHTML = `
            <span class="data">${dataFormatada} ${horaFormatada}</span>
            <span class="acao">${icone} ${acaoTexto}</span>
            <span class="motivo">${motivo}</span>
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
    // ✨ REFATORADO: Usar DomUtils para verificar modal existente
    let modal = DomUtils.getElement('modal-compartilhamento');
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
    // ✨ REFATORADO: Usar DomUtils para acessar modal
    const modal = DomUtils.getElement('modal-compartilhamento');
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
            await FileUtils.copyToClipboard(relatorio.texto);
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
        FileUtils.saveAsJSON(historico);
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

// ✨ REFATORADO: Funções movidas para FileUtils
// copiarParaAreaTransferencia() -> FileUtils.copyToClipboard()
// salvarArquivoJSON() -> FileUtils.saveAsJSON()

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

// Carregar pontos do servidor
async function carregarPontos() {
    try {
        const response = await fetch('/api/pontos');
        const data = await response.json();
        
        pontosFilho1 = data.joao || 0;
        pontosFilho2 = data.maria || 0;
        pontosFilho3 = data.pedro || 0;
        
        // ✨ REFATORADO: Usar DomUtils para atualizar pontos dos filhos
        DomUtils.setText('pontos-filho1', pontosFilho1);
        DomUtils.setText('pontos-filho2', pontosFilho2);
        DomUtils.setText('pontos-filho3', pontosFilho3);
        
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
            // ✨ REFATORADO: Usar DomUtils para fallback de pontos
            DomUtils.setText('pontos-filho1', pontosFilho1);
        }
        
        if (pontosFilho2Salvo) {
            pontosFilho2 = parseInt(pontosFilho2Salvo);
            // ✨ REFATORADO: Usar DomUtils para fallback de pontos
            DomUtils.setText('pontos-filho2', pontosFilho2);
        }
        
        if (pontosFilho3Salvo) {
            pontosFilho3 = parseInt(pontosFilho3Salvo);
            // ✨ REFATORADO: Usar DomUtils para fallback de pontos
            DomUtils.setText('pontos-filho3', pontosFilho3);
        }
    }
}

// Salvar pontos no localStorage
function salvarPontos() {
    localStorage.setItem('pontosFilho1', pontosFilho1.toString());
    localStorage.setItem('pontosFilho2', pontosFilho2.toString());
    localStorage.setItem('pontosFilho3', pontosFilho3.toString());
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
// Criar relatório formatado do histórico
// ✨ REFATORADO: Funções movidas para FileUtils
// copiarParaAreaTransferencia() -> FileUtils.copyToClipboard()
// salvarArquivoJSON() -> FileUtils.saveAsJSON()

// Função para lidar com pontos avulsos - adicionar
async function handleAvulsoAdd() {
    console.log('🔍 DEBUG: handleAvulsoAdd() chamada - iniciando');
    
    // ✨ REFATORADO: Usar ValidationUtils para validações
    const filhoSelect = DomUtils.getElement('filho-avulso-add');
    const pontosInput = DomUtils.getElement('pontos-avulso-add');
    const motivoInput = DomUtils.getElement('motivo-avulso-add');
    
    // Validar elementos DOM
    const elementValidation = ValidationUtils.validateForm({
        filhoSelect,
        pontosInput,
        motivoInput
    }, {
        filhoSelect: { type: 'element', label: 'Seletor de filho' },
        pontosInput: { type: 'element', label: 'Input de pontos' },
        motivoInput: { type: 'element', label: 'Input de motivo' }
    });
    
    if (!elementValidation.isValid) {
        ValidationUtils.showValidationError(elementValidation.firstError);
        return;
    }
    
    const filhoId = filhoSelect.value;
    const pontosValor = parseInt(pontosInput.value);
    const motivo = motivoInput.value.trim();
    
    console.log('🔍 DEBUG: Dados coletados:', { filhoId, pontosValor, motivo });

    // ✨ REFATORADO: Validação usando ValidationUtils
    const formData = { filhoId, pontos: pontosValor, atividade: motivo };
    const formValidation = ValidationUtils.validatePontosForm(formData);
    
    if (!formValidation.isValid) {
        ValidationUtils.showValidationError(formValidation.firstError);
        return;
    }

    const filho = encontrarFilho(filhoId);
    const filhoValidation = ValidationUtils.validateExists(filhoId, filhos, 'Filho', (id, list) => list.some(f => f.id === id));
    
    if (!filhoValidation.isValid) {
        ValidationUtils.showValidationError(filhoValidation);
        return;
    }

    console.log('🔍 DEBUG: Enviando requisição para servidor...');
    
    // ✨ REFATORADO: Usar ApiService para chamada de API
    const result = await ApiService.pontosOperation('adicionar', {
        nome: filho.nome,
        pontos: pontosValor,
        atividade: motivo
    });
    
    if (result.success) {
        // Atualizar pontos localmente
        const pontosAntes = filho.pontos;
        filho.pontos += pontosValor;
        
        // ✨ NOVO: Adicionar log da ação avulsa
        adicionarLog('adicionar_pontos_avulsos', {
            filho: filho.nome,
            atividade: motivo,
            pontos: pontosValor,
            pontos_antes: pontosAntes,
            pontos_depois: filho.pontos,
            tipo: 'positiva'
        });
        
        // ✨ CORRIGIDO: Limpar campos individualmente
        pontosInput.value = '1'; // Resetar para valor padrão
        motivoInput.value = '';  // Limpar motivo
        // Manter filhoSelect selecionado para facilitar uso repetido
        
        // Atualizar interface (inclui histórico)
        atualizarInterface();
        salvarDados();
        
        // ✨ NOVO: Sincronizar após ação avulsa
        await sincronizarAposAcao('adicionar pontos avulsos');
        
        // Notificação já é exibida automaticamente pelo ApiService
        // Removida notificação duplicada para modo offline
    } else if (result.fallbackOffline) {
        // Fallback offline - continuar operação localmente
        const pontosAntes = filho.pontos;
        filho.pontos += pontosValor;
        
        // ✨ NOVO: Adicionar log da ação avulsa offline
        adicionarLog('adicionar_pontos_avulsos_offline', {
            filho: filho.nome,
            atividade: motivo,
            pontos: pontosValor,
            pontos_antes: pontosAntes,
            pontos_depois: filho.pontos,
            tipo: 'positiva'
        });
        
        DomUtils.clearForm('avulso-add');
        atualizarInterface();
        salvarDados();
        
        // ✨ NOVO: Sincronizar após ação offline
        await sincronizarAposAcao('adicionar pontos avulsos (offline)');
        
        // Notificação simples para operações offline
        mostrarNotificacao(`✅ ${pontosValor} pontos adicionados para ${filho.nome}!`, 'success');
    }
}

// Função para lidar com pontos avulsos - remover
async function handleAvulsoRemove() {
    // ✨ REFATORADO: Usar ValidationUtils para validações
    const filhoSelect = DomUtils.getElement('filho-avulso-remove');
    const pontosInput = DomUtils.getElement('pontos-avulso-remove');
    const motivoInput = DomUtils.getElement('motivo-avulso-remove');
    
    // Validar elementos DOM
    const elementValidation = ValidationUtils.validateForm({
        filhoSelect,
        pontosInput,
        motivoInput
    }, {
        filhoSelect: { type: 'element', label: 'Seletor de filho' },
        pontosInput: { type: 'element', label: 'Input de pontos' },
        motivoInput: { type: 'element', label: 'Input de motivo' }
    });
    
    if (!elementValidation.isValid) {
        ValidationUtils.showValidationError(elementValidation.firstError);
        return;
    }
    
    const filhoId = filhoSelect.value;
    const pontosValor = parseInt(pontosInput.value);
    const motivo = motivoInput.value.trim();
    
    // ✨ REFATORADO: Validação usando ValidationUtils
    const formData = { filhoId, pontos: pontosValor, atividade: motivo };
    const formValidation = ValidationUtils.validatePontosForm(formData);
    
    if (!formValidation.isValid) {
        ValidationUtils.showValidationError(formValidation.firstError);
        return;
    }

    const filho = encontrarFilho(filhoId);
    const filhoValidation = ValidationUtils.validateExists(filhoId, filhos, 'Filho', (id, list) => list.some(f => f.id === id));
    
    if (!filhoValidation.isValid) {
        ValidationUtils.showValidationError(filhoValidation);
        return;
    }
    
    // ✨ REFATORADO: Usar ApiService para chamada de API
    const result = await ApiService.pontosOperation('remover', {
        nome: filho.nome,
        pontos: pontosValor,
        atividade: motivo
    });
    
    if (result.success) {
        // Atualizar pontos localmente (permitir pontos negativos)
        const pontosAntes = filho.pontos;
        filho.pontos -= pontosValor;
        
        // ✨ NOVO: Adicionar log da ação avulsa
        adicionarLog('remover_pontos_avulsos', {
            filho: filho.nome,
            atividade: motivo,
            pontos: pontosValor,
            pontos_antes: pontosAntes,
            pontos_depois: filho.pontos,
            tipo: 'negativa'
        });
        
        // ✨ CORRIGIDO: Limpar campos individualmente
        pontosInput.value = '1'; // Resetar para valor padrão
        motivoInput.value = '';  // Limpar motivo
        // Manter filhoSelect selecionado para facilitar uso repetido
        
        // Atualizar interface (inclui histórico)
        atualizarInterface();
        salvarDados();
        
        // ✨ NOVO: Sincronizar após ação avulsa
        await sincronizarAposAcao('remover pontos avulsos');
        
        // Notificação customizada para remoção
        mostrarNotificacao(`➖ ${pontosValor} pontos removidos de ${filho.nome}!`, 'warning');
    } else if (result.fallbackOffline) {
        // Fallback offline - continuar operação localmente (permitir pontos negativos)
        const pontosAntes = filho.pontos;
        filho.pontos -= pontosValor;
        
        // ✨ NOVO: Adicionar log da ação avulsa offline
        adicionarLog('remover_pontos_avulsos_offline', {
            filho: filho.nome,
            atividade: motivo,
            pontos: pontosValor,
            pontos_antes: pontosAntes,
            pontos_depois: filho.pontos,
            tipo: 'negativa'
        });
        
        // ✨ CORRIGIDO: Limpar campos individualmente
        pontosInput.value = '1'; // Resetar para valor padrão
        motivoInput.value = '';  // Limpar motivo
        atualizarInterface();
        salvarDados();
        
        // ✨ NOVO: Sincronizar após ação offline
        await sincronizarAposAcao('remover pontos avulsos (offline)');
        
        // Notificação simples para operações offline
        mostrarNotificacao(`➖ ${pontosValor} pontos removidos de ${filho.nome}!`, 'warning');
    }
}

// ✨ REFATORADO: Função duplicada removida - usar handleCompartilharPDF() da linha 3744

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

// ✨ REMOVIDO: setInterval automático de salvamento (causava loops infinitos)
// O salvamento agora ocorre apenas quando necessário, através de eventos específicos

// ✨ ATUALIZADA: Adicionar atividade com sincronização MongoDB
async function adicionarAtividade(tipo) {
    console.log('🎯 Iniciando cadastro de atividade:', tipo);
    
    // 1. Captura dos elementos do formulário
    const nomeInput = DomUtils.getElementById(tipo === 'positiva' ? 'nova-atividade-positiva' : 'nova-atividade-negativa');
    const pontosInput = DomUtils.getElementById(tipo === 'positiva' ? 'pontos-atividade-positiva' : 'pontos-atividade-negativa');
    
    if (!nomeInput || !pontosInput) {
        console.error('❌ Elementos do formulário não encontrados');
        mostrarNotificacao('❌ Erro: Formulário não encontrado', 'error');
        return;
    }
    
    const nome = nomeInput.value.trim();
    const pontos = parseInt(pontosInput.value);
    
    // 2. Validações
    if (!nome) {
        mostrarNotificacao('❌ Por favor, insira um nome para a atividade', 'error');
        return;
    }
    
    if (isNaN(pontos) || pontos <= 0) {
        mostrarNotificacao('❌ Por favor, insira pontos válidos', 'error');
        return;
    }
    
    const array = tipo === 'positiva' ? atividadesPositivas : atividadesNegativas;
    
    // 3. Verificar duplicação local
    const atividadeExistente = array.find(atividade => 
        atividade.nome.toLowerCase().trim() === nome.toLowerCase().trim()
    );
    
    if (atividadeExistente) {
        mostrarNotificacao(`❌ Já existe uma atividade "${nome}" na lista!`, 'error');
        return;
    }
    
    // 4. Bloquear sincronização durante operação
    bloquearSincronizacaoComTimeout();
    
    try {
        // 5. Criar atividade no servidor PRIMEIRO
        if (socket && socket.connected) {
            console.log('☁️ Criando atividade no servidor...');
            const response = await fetch('/api/atividades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, pontos, tipo })
            });
            
            const resultado = await response.json();
            
            if (!resultado.success) {
                if (resultado.error.includes('já existe')) {
                    mostrarNotificacao(`❌ Atividade "${nome}" já existe no sistema!`, 'error');
                    desbloquearSincronizacao();
                    return;
                } else {
                    throw new Error(resultado.error);
                }
            }
            
            // 6. Usar dados do servidor
            const novaAtividade = {
                id: resultado.atividade.id,
                nome: resultado.atividade.nome,
                pontos: resultado.atividade.pontos,
                tipo: tipo
            };
            
            array.push(novaAtividade);
            console.log('✅ Atividade criada no servidor:', novaAtividade);
            
        } else {
            // 7. Modo offline - criar localmente
            const novaAtividade = {
                id: Date.now() + Math.random(),
                nome: nome,
                pontos: pontos,
                tipo: tipo
            };
            
            array.push(novaAtividade);
            console.log('📱 Atividade criada localmente:', novaAtividade);
        }
        
        // 8. Limpar campos
        nomeInput.value = '';
        pontosInput.value = tipo === 'positiva' ? '10' : '5';
        
        // 9. Atualizar interface
        atualizarListaAtividades();
        atualizarSelectsAtividades();
        
        // 10. Salvar atividades
        await salvarAtividades();
        
        // 11. Mostrar sucesso
        mostrarNotificacao(`✅ Atividade "${nome}" adicionada com sucesso!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao criar atividade:', error);
        mostrarNotificacao(`❌ Erro ao criar atividade: ${error.message}`, 'error');
    }
    
    // 12. Desbloquear sincronização
    desbloquearSincronizacao();
    
    console.log('🎯 Cadastro de atividade concluído:', nome);
}

// ✨ ATUALIZADA: Remover atividade com sincronização MongoDB
async function removerAtividade(tipo, id) {
    const array = tipo === 'positiva' ? atividadesPositivas : atividadesNegativas;
    const index = array.findIndex(atividade => atividade.id === id);
    
    if (index === -1) {
        mostrarNotificacao('❌ Atividade não encontrada', 'error');
        return;
    }
    
    const atividade = array[index];
    
    // ✨ NOVA: Remover do MongoDB se conectado
    if (socket && socket.connected) {
        try {
            const response = await fetch(`/api/atividades/${id}`, {
                method: 'DELETE'
            });
            
            const resultado = await response.json();
            
            if (!resultado.success) {
                console.error('❌ Erro ao remover atividade do MongoDB:', resultado.error);
                // Continuar com remoção local mesmo se falhar no MongoDB
            } else {
                console.log('☁️ Atividade removida do MongoDB:', atividade.nome);
            }
        } catch (error) {
            console.error('❌ Erro na API de remoção:', error);
            // Continuar com remoção local mesmo se falhar no MongoDB
        }
    }
    
    // Remover localmente
    array.splice(index, 1);
    atualizarListaAtividades();
    atualizarSelectsAtividades();
    await salvarAtividades();
    mostrarNotificacao(`✅ Atividade ${tipo} "${atividade.nome}" removida`, 'success');
}

// Função para atualizar os selects de atividades
// ============== CUSTOM DROPDOWN FUNCTIONS ==============

function atualizarSelectsAtividades() {
    console.log('🔄 Atualizando dropdowns de atividades...');
    console.log('📝 Atividades positivas:', atividadesPositivas);
    console.log('📝 Atividades negativas:', atividadesNegativas);
    
    // Atualizar dropdown de atividades positivas (adicionar pontos)
    atualizarDropdownAtividades('adicionar', atividadesPositivas, 'positive');
    
    // Atualizar dropdown de atividades negativas (remover pontos)
    atualizarDropdownAtividades('remover', atividadesNegativas, 'negative');
    
    console.log('✅ Atualização de dropdowns concluída');
    console.log(`📊 Resumo: ${atividadesPositivas.length} positivas, ${atividadesNegativas.length} negativas`);
}

function atualizarDropdownAtividades(tipo, atividades, classePontos) {
    const dropdownHeader = DomUtils.getElementById(`dropdown-header-${tipo}`);
    const dropdownContent = DomUtils.getElementById(`dropdown-content-${tipo}`);
    const dropdownOptions = DomUtils.getElementById(`options-${tipo}`);
    const hiddenSelect = DomUtils.getElementById(`atividade-${tipo}`);
    const searchInput = DomUtils.getElementById(`search-${tipo}`);
    
    if (!dropdownHeader || !dropdownContent || !dropdownOptions || !hiddenSelect) {
        console.error(`❌ Elementos do dropdown ${tipo} não encontrados`);
        return;
    }
    
    // Limpar opções existentes
    dropdownOptions.innerHTML = '';
    hiddenSelect.innerHTML = '';
    
    // Ordenar atividades alfabeticamente
    const atividadesOrdenadas = [...atividades].sort((a, b) => 
        a.nome.toLowerCase().localeCompare(b.nome.toLowerCase())
    );
    
    // Adicionar opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione uma atividade...';
    hiddenSelect.appendChild(defaultOption);
    
    // Criar opções do dropdown
    atividadesOrdenadas.forEach(atividade => {
        // Opção para o select hidden
        const option = document.createElement('option');
        option.value = JSON.stringify(atividade);
        option.textContent = `${atividade.nome} (${classePontos === 'positive' ? '+' : '-'}${atividade.pontos} pts)`;
        hiddenSelect.appendChild(option);
        
        // Opção para o dropdown visual
        const dropdownOption = document.createElement('div');
        dropdownOption.className = 'dropdown-option';
        dropdownOption.dataset.value = JSON.stringify(atividade);
        dropdownOption.innerHTML = `
            <span class="option-text">${atividade.nome}</span>
            <span class="option-points ${classePontos}">${classePontos === 'positive' ? '+' : '-'}${atividade.pontos}</span>
        `;
        
        // Event listener para seleção
        dropdownOption.addEventListener('click', () => {
            selecionarOpcaoDropdown(tipo, atividade, dropdownOption);
        });
        
        dropdownOptions.appendChild(dropdownOption);
    });
    
    // Configurar busca
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filtrarOpcoesDropdown(tipo, e.target.value);
        });
    }
    
    console.log(`✅ Dropdown ${tipo} atualizado com ${atividadesOrdenadas.length} opções`);
}

function selecionarOpcaoDropdown(tipo, atividade, elementoOpcao) {
    const dropdownHeader = DomUtils.getElementById(`dropdown-header-${tipo}`);
    const dropdownContent = DomUtils.getElementById(`dropdown-content-${tipo}`);
    const hiddenSelect = DomUtils.getElementById(`atividade-${tipo}`);
    const placeholder = dropdownHeader.querySelector('.dropdown-placeholder');
    
    // Atualizar placeholder
    placeholder.textContent = atividade.nome;
    placeholder.classList.add('selected');
    
    // Atualizar select hidden
    hiddenSelect.value = JSON.stringify(atividade);
    
    // Remover seleção anterior
    const opcoesAnteriores = dropdownContent.querySelectorAll('.dropdown-option.selected');
    opcoesAnteriores.forEach(opcao => opcao.classList.remove('selected'));
    
    // Marcar opção como selecionada
    elementoOpcao.classList.add('selected');
    
    // Fechar dropdown
    fecharDropdown(tipo);
    
    console.log(`✅ Atividade selecionada no dropdown ${tipo}:`, atividade.nome);
}

function filtrarOpcoesDropdown(tipo, termoBusca) {
    const dropdownOptions = DomUtils.getElementById(`options-${tipo}`);
    const opcoes = dropdownOptions.querySelectorAll('.dropdown-option');
    
    opcoes.forEach(opcao => {
        const texto = opcao.querySelector('.option-text').textContent.toLowerCase();
        const termo = termoBusca.toLowerCase();
        
        if (texto.includes(termo)) {
            opcao.style.display = 'flex';
        } else {
            opcao.style.display = 'none';
        }
    });
}

function abrirDropdown(tipo) {
    const dropdownHeader = DomUtils.getElementById(`dropdown-header-${tipo}`);
    const dropdownContent = DomUtils.getElementById(`dropdown-content-${tipo}`);
    
    if (dropdownHeader && dropdownContent) {
        dropdownHeader.classList.add('active');
        dropdownContent.classList.add('show');
        
        // Focar no campo de busca
        const searchInput = DomUtils.getElementById(`search-${tipo}`);
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }
}

function fecharDropdown(tipo) {
    const dropdownHeader = DomUtils.getElementById(`dropdown-header-${tipo}`);
    const dropdownContent = DomUtils.getElementById(`dropdown-content-${tipo}`);
    
    if (dropdownHeader && dropdownContent) {
        dropdownHeader.classList.remove('active');
        dropdownContent.classList.remove('show');
    }
}

function limparDropdown(tipo) {
    const dropdownHeader = DomUtils.getElementById(`dropdown-header-${tipo}`);
    const hiddenSelect = DomUtils.getElementById(`atividade-${tipo}`);
    const placeholder = dropdownHeader?.querySelector('.dropdown-placeholder');
    
    if (dropdownHeader && hiddenSelect && placeholder) {
        // Limpar placeholder
        placeholder.textContent = '🔍 Selecione uma atividade...';
        placeholder.classList.remove('selected');
        
        // Limpar select hidden
        hiddenSelect.value = '';
        
        // Remover seleção visual
        const dropdownContent = DomUtils.getElementById(`dropdown-content-${tipo}`);
        if (dropdownContent) {
            const opcoesSelecionadas = dropdownContent.querySelectorAll('.dropdown-option.selected');
            opcoesSelecionadas.forEach(opcao => opcao.classList.remove('selected'));
        }
        
        // Fechar dropdown
        fecharDropdown(tipo);
    }
}

function configurarEventosDropdown() {
    // Configurar dropdown de adicionar pontos
    const dropdownHeaderAdicionar = DomUtils.getElementById('dropdown-header-adicionar');
    if (dropdownHeaderAdicionar) {
        dropdownHeaderAdicionar.addEventListener('click', () => {
            const dropdownContent = DomUtils.getElementById('dropdown-content-adicionar');
            if (dropdownContent.classList.contains('show')) {
                fecharDropdown('adicionar');
            } else {
                // Fechar outros dropdowns
                fecharDropdown('remover');
                abrirDropdown('adicionar');
            }
        });
    }
    
    // Configurar dropdown de remover pontos
    const dropdownHeaderRemover = DomUtils.getElementById('dropdown-header-remover');
    if (dropdownHeaderRemover) {
        dropdownHeaderRemover.addEventListener('click', () => {
            const dropdownContent = DomUtils.getElementById('dropdown-content-remover');
            if (dropdownContent.classList.contains('show')) {
                fecharDropdown('remover');
            } else {
                // Fechar outros dropdowns
                fecharDropdown('adicionar');
                abrirDropdown('remover');
            }
        });
    }
    
    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            fecharDropdown('adicionar');
            fecharDropdown('remover');
        }
    });
    
    console.log('✅ Eventos dos dropdowns configurados');
}

// Removido - event listener duplicado
    
// Funções de atividades
function mostrarToast(message, type = 'success') {
    if (window.ToastUtils) {
        window.ToastUtils.showToast('Sistema', message, type);
    } else {
        // Fallback para console se ToastUtils não estiver disponível
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// ============== SISTEMA DE LOG E UTILITÁRIOS ==============

// ✨ ATUALIZADA: Função para baixar log com sincronização MongoDB
async function baixarLog() {
    try {
        // Primeiro, sincronizar logs do MongoDB se conectado
        if (socket && socket.connected) {
            await sincronizarLogs();
        }
        
        if (logs.length === 0) {
            mostrarNotificacao('📋 Nenhum log disponível para download!', 'warning');
            return;
        }
        
        // Criar cabeçalho do CSV com informações detalhadas
        const cabecalho = [
            'Data', 'Horário', 'Perfil', 'Responsável', 'Ação', 
            'Filho', 'Atividade', 'Pontos', 'Pontos Antes', 'Pontos Depois', 
            'Tipo', 'Detalhes Extras', 'ID Log', 'Dispositivo'
        ];
        
        // Converter logs para CSV com informações completas
        const csvContent = [
            cabecalho.join(','),
            ...logs.map(log => [
                log.data || '',
                log.horario || '',
                log.perfil || 'Não informado',
                `"${log.responsavel || 'Não identificado'}"`,
                `"${(log.acao || '').replace('_', ' ').toUpperCase()}"`,
                `"${log.detalhes.filho || ''}"`,
                `"${log.detalhes.atividade || ''}"`,
                log.detalhes.pontos || '',
                log.detalhes.pontos_antes || '',
                log.detalhes.pontos_depois || '',
                log.detalhes.tipo || '',
                `"${JSON.stringify(log.detalhes).replace(/"/g, '""')}"`,
                log.id || '',
                `"${log.dispositivo || 'Desconhecido'}"`
            ].join(','))
        ].join('\n');
        
        // Criar arquivo para download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const dataAtual = new Date().toISOString().split('T')[0];
        const horaAtual = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `log_detalhado_pontos_${dataAtual}_${horaAtual}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        adicionarLog('download_log', {
            total_registros: logs.length,
            formato: 'CSV_DETALHADO',
            arquivo: `log_detalhado_pontos_${dataAtual}_${horaAtual}.csv`,
            fonte: socket && socket.connected ? 'MongoDB + Local' : 'Local apenas'
        });
        
        mostrarNotificacao(`📋 Log baixado com ${logs.length} registros!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao baixar log:', error);
        mostrarNotificacao('❌ Erro ao baixar log!', 'error');
    }
}

// ✨ NOVA FUNÇÃO: Mostrar resumo dos logs na console
function mostrarResumoLogs() {
    console.log('📋 === RESUMO DOS LOGS ===');
    console.log(`📊 Total de registros: ${logs.length}`);
    
    if (logs.length === 0) {
        console.log('📭 Nenhum log encontrado');
        return;
    }
    
    // Agrupar por perfil
    const porPerfil = logs.reduce((acc, log) => {
        const perfil = log.perfil || 'Não informado';
        acc[perfil] = (acc[perfil] || 0) + 1;
        return acc;
    }, {});
    
    console.log('👥 Logs por perfil:');
    Object.entries(porPerfil).forEach(([perfil, count]) => {
        console.log(`   ${perfil}: ${count} ações`);
    });
    
    // Agrupar por ação
    const porAcao = logs.reduce((acc, log) => {
        const acao = log.acao || 'Não informado';
        acc[acao] = (acc[acao] || 0) + 1;
        return acc;
    }, {});
    
    console.log('🎯 Logs por ação:');
    Object.entries(porAcao).forEach(([acao, count]) => {
        console.log(`   ${acao.replace('_', ' ')}: ${count}x`);
    });
    
    // Mostrar últimas 5 ações
    console.log('🕒 Últimas 5 ações:');
    logs.slice(-5).forEach(log => {
        console.log(`   ${log.data} ${log.horario} - ${log.perfil} (${log.responsavel}): ${log.acao}`);
    });
    
    console.log('📋 === FIM DO RESUMO ===');
}

// ✨ NOVA FUNÇÃO: Verificar logs de um usuário específico
function verificarLogsUsuario(nomeUsuario) {
    const logsUsuario = logs.filter(log => 
        log.responsavel?.toLowerCase().includes(nomeUsuario.toLowerCase())
    );
    
    console.log(`📋 Logs do usuário "${nomeUsuario}": ${logsUsuario.length} registros`);
    logsUsuario.forEach(log => {
        console.log(`   ${log.data_completa} - ${log.acao}: ${JSON.stringify(log.detalhes)}`);
    });
    
    return logsUsuario;
}

// Função para resetar pontos
async function resetarPontos() {
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
    await salvarDados();
    
    // ✨ NOVO: Sincronizar após resetar pontos
    await sincronizarAposAcao('resetar pontos');
    
    mostrarNotificacao(`🔄 Pontos resetados para ${filhos.length} crianças!`, 'success');
}

// ✨ NOVA: Função auxiliar para fazer requisições com retry automático
async function requisicaoComRetry(url, options = {}, maxTentativas = 3, delay = 2000) {
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
            console.log(`🔄 Tentativa ${tentativa}/${maxTentativas} para ${url}`);
            
            const response = await fetch(url, options);
            
            if (response.status === 429) {
                if (tentativa < maxTentativas) {
                    console.log(`⏳ Rate limit atingido. Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Dobrar o delay a cada tentativa
                    continue;
                } else {
                    throw new Error('Muitas requisições. Tente novamente em alguns minutos.');
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            if (tentativa === maxTentativas) {
                throw error;
            }
            
            console.log(`❌ Tentativa ${tentativa} falhou:`, error.message);
            console.log(`⏳ Aguardando ${delay}ms antes de tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

// Função para limpar histórico (apenas admin)
async function limparHistorico() {
    // Verificar se é admin
    const session = JSON.parse(localStorage.getItem('userSession') || '{}');
    if (session.type !== 'admin') {
        mostrarNotificacao('❌ Apenas administradores podem limpar o histórico!', 'error');
        return;
    }

    // ✨ CORRIGIDO: Verificar tanto logs quanto historico
    const totalRegistros = (logs?.length || 0) + (historico?.length || 0);
    if (totalRegistros === 0) {
        mostrarNotificacao('📋 O histórico já está vazio!', 'info');
        return;
    }
    
    const confirmacao = confirm(`🗑️ Tem certeza que deseja limpar TODO o histórico?\n\nIsto irá:\n• Apagar permanentemente ${totalRegistros} registros\n• Manter os pontos atuais das crianças\n• Registrar esta ação no log\n\n⚠️ ESTA AÇÃO NÃO PODE SER DESFEITA!`);
    
    if (!confirmacao) {
        return;
    }
    
    // Confirmação dupla para ação crítica
    const confirmacaoFinal = confirm(`⚠️ CONFIRMAÇÃO FINAL\n\nVocê está prestes a apagar ${totalRegistros} registros do histórico.\n\nClique OK para confirmar ou Cancelar para abortar:`);
    
    if (!confirmacaoFinal) {
        return;
    }
    
    try {
        // Salvar quantidade de registros para log
        const logsCount = logs?.length || 0;
        const historicoCount = historico?.length || 0;
        
        // ✨ NOVO: Usar requisição com retry para evitar erro 429
        const response = await requisicaoComRetry('/api/historico', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        }, 3, 3000); // 3 tentativas, começando com 3 segundos de delay

        const result = await response.json();

        if (result.success) {
            // ✨ CORRIGIDO: Limpar tanto logs quanto historico PRIMEIRO
            if (logs && logs.length > 0) {
                logs.splice(0); // Remove todos os logs
                console.log('🗑️ Logs locais limpos');
            }
            
            if (historico && historico.length > 0) {
                historico.splice(0); // Remove todo o historico
                console.log('🗑️ Histórico local limpo');
            }
            
            // Limpar também o localStorage
            localStorage.removeItem('logs');
            localStorage.removeItem('historico');
            
            // Atualizar interface
            atualizarInterface();
            await salvarDados();
            
            // ✨ CORREÇÃO CRÍTICA: NÃO adicionar log nem salvar logs após limpar
            // O log da limpeza seria re-adicionado ao histórico que acabamos de limpar!
            
            mostrarNotificacao(`🗑️ Histórico limpo! ${result.totalRemovidos || totalRegistros} registros foram removidos do banco de dados.`, 'success');
        } else {
            throw new Error(result.message || 'Erro ao limpar histórico no servidor');
        }
        
    } catch (error) {
        console.error('❌ Erro ao limpar histórico:', error);
        
        // ✨ NOVO: Oferecer opções baseadas no tipo de erro
        let mensagemErro = error.message;
        let opcaoAlternativa = '';
        
        if (error.message.includes('Muitas requisições') || error.message.includes('429')) {
            mensagemErro = 'Servidor sobrecarregado (muitas requisições).';
            opcaoAlternativa = '\n\n💡 ALTERNATIVAS:\n1. Aguarde alguns minutos e tente novamente\n2. Limpe apenas localmente (execute: limparHistoricoLocal())';
        }
        
        const tentarLocal = confirm(`❌ ${mensagemErro}${opcaoAlternativa}\n\nDeseja limpar apenas o histórico local?`);
        
        if (tentarLocal) {
            return limparHistoricoLocal();
        } else {
            mostrarNotificacao('❌ Limpeza de histórico cancelada', 'warning');
        }
    }
}

// ================================
// WebSocket já está sendo gerenciado pelo websocket-sync.js
// Removida implementação duplicada para evitar conflitos

// ✨ NOVA: Função para verificar e corrigir inconsistências de dados
async function verificarIntegridadeDados() {
    console.log('🔍 Verificando integridade dos dados...');
    
    try {
        // 1. Verificar se todas as crianças têm pontos
        const pontosAtuais = JSON.parse(localStorage.getItem('pontos') || '{}');
        const criancasSemPontos = filhos.filter(filho => 
            !pontosAtuais[filho.nome.toLowerCase()]
        );
        
        if (criancasSemPontos.length > 0) {
            console.log('⚠️ Crianças sem pontos encontradas:', criancasSemPontos);
            
            // Adicionar pontos zerados para crianças sem pontos
            criancasSemPontos.forEach(filho => {
                pontosAtuais[filho.nome.toLowerCase()] = 0;
            });
            
            // Salvar pontos atualizados
            localStorage.setItem('pontos', JSON.stringify(pontosAtuais));
            console.log('✅ Pontos zerados adicionados para crianças sem pontos');
        }
        
        // 2. Verificar se há pontos órfãos (pontos sem criança correspondente)
        const pontosOrfaos = Object.keys(pontosAtuais).filter(nome => 
            !filhos.some(filho => filho.nome.toLowerCase() === nome)
        );
        
        if (pontosOrfaos.length > 0) {
            console.log('⚠️ Pontos órfãos encontrados:', pontosOrfaos);
            
            // Remover pontos órfãos
            pontosOrfaos.forEach(nome => {
                delete pontosAtuais[nome];
            });
            
            // Salvar pontos atualizados
            localStorage.setItem('pontos', JSON.stringify(pontosAtuais));
            console.log('✅ Pontos órfãos removidos');
        }
        
        // 3. Verificar atividades duplicadas
        const atividadesPositivasUnicas = [...new Set(atividadesPositivas.map(a => a.nome))];
        const atividadesNegativasUnicas = [...new Set(atividadesNegativas.map(a => a.nome))];
        
        if (atividadesPositivasUnicas.length !== atividadesPositivas.length) {
            console.log('⚠️ Atividades positivas duplicadas encontradas');
            atividadesPositivas = atividadesPositivas.filter((atividade, index, array) => 
                array.findIndex(a => a.nome === atividade.nome) === index
            );
            localStorage.setItem('atividadesPositivas', JSON.stringify(atividadesPositivas));
            console.log('✅ Atividades positivas duplicadas removidas');
        }
        
        if (atividadesNegativasUnicas.length !== atividadesNegativas.length) {
            console.log('⚠️ Atividades negativas duplicadas encontradas');
            atividadesNegativas = atividadesNegativas.filter((atividade, index, array) => 
                array.findIndex(a => a.nome === atividade.nome) === index
            );
            localStorage.setItem('atividadesNegativas', JSON.stringify(atividadesNegativas));
            console.log('✅ Atividades negativas duplicadas removidas');
        }
        
        console.log('✅ Verificação de integridade concluída');
    } catch (error) {
        console.error('❌ Erro durante verificação de integridade:', error);
    }
}

