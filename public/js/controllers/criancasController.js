/**
 * 👨‍👩‍👧‍👦 CONTROLLER DE CRIANÇAS - FRONTEND
 * 
 * Gerencia todas as operações de crianças no frontend
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

class CriancasController {
    constructor() {
        this.filhos = [];
        this.isLoading = false;
    }

    // Carregar crianças do servidor
    async carregarCriancas() {
        try {
            this.isLoading = true;
            console.log('🔍 Carregando crianças do servidor...');
            
            const response = await ApiService.get('/api/sincronizar-criancas');
            
            if (response.success) {
                this.filhos = response.criancas || [];
                console.log('✅ Crianças carregadas:', this.filhos.length);
                
                // Não salvar no localStorage - usar apenas MongoDB
                
                return this.filhos;
            } else {
                throw new Error(response.message || 'Erro ao carregar crianças');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar crianças:', error);
            
            // Não usar fallback para localStorage - apenas MongoDB
            console.log('📱 Usando apenas dados do MongoDB');
            this.filhos = [];
            
            return [];
        } finally {
            this.isLoading = false;
        }
    }

    // Adicionar nova criança
    async adicionarCrianca(nome) {
        try {
            if (!nome || nome.trim() === '') {
                throw new Error('Nome da criança é obrigatório');
            }

            console.log('➕ Adicionando criança:', nome);
            
            const response = await ApiService.post('/api/criancas', { nome: nome.trim() });
            
            if (response.success) {
                // Recarregar lista de crianças
                await this.carregarCriancas();
                
                // Mostrar notificação
                ToastUtils.show('Criança adicionada com sucesso!', 'success');
                
                return response.crianca;
            } else {
                throw new Error(response.message || 'Erro ao adicionar criança');
            }
        } catch (error) {
            console.error('❌ Erro ao adicionar criança:', error);
            ToastUtils.show(error.message, 'error');
            throw error;
        }
    }

    // Remover criança
    async removerCrianca(id) {
        try {
            console.log('🗑️ Removendo criança:', id);
            
            const response = await ApiService.delete(`/api/criancas/${id}`);
            
            if (response.success) {
                // Recarregar lista de crianças
                await this.carregarCriancas();
                
                // Mostrar notificação
                ToastUtils.show('Criança removida com sucesso!', 'success');
                
                return true;
            } else {
                throw new Error(response.message || 'Erro ao remover criança');
            }
        } catch (error) {
            console.error('❌ Erro ao remover criança:', error);
            ToastUtils.show(error.message, 'error');
            throw error;
        }
    }

    // Encontrar criança por ID
    encontrarCrianca(id) {
        return this.filhos.find(filho => filho.id === id);
    }

    // Encontrar criança por nome
    encontrarCriancaPorNome(nome) {
        return this.filhos.find(filho => 
            filho.nome.toLowerCase() === nome.toLowerCase()
        );
    }

    // Obter total de crianças
    getTotalCriancas() {
        return this.filhos.length;
    }

    // Verificar se está carregando
    getIsLoading() {
        return this.isLoading;
    }

    // Obter todas as crianças
    getCriancas() {
        return this.filhos;
    }

    // Atualizar lista de crianças na interface
    atualizarInterface() {
        // Renderizar lista de crianças
        this.renderizarListaCriancas();
        
        // Atualizar selects
        this.atualizarSelectsCriancas();
        
        // Atualizar dashboard
        this.atualizarDashboard();
    }

    // Renderizar lista de crianças
    renderizarListaCriancas() {
        const container = document.getElementById('lista-filhos');
        if (!container) return;

        if (this.filhos.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <p>Nenhuma criança cadastrada</p>
                    <button onclick="criancasController.adicionarCriancaViaModal()" class="btn-add">
                        + Adicionar Criança
                    </button>
                </div>
            `;
            return;
        }

        const html = this.filhos.map(filho => `
            <div class="filho-item" data-id="${filho.id}">
                <div class="filho-info">
                    <h3>${filho.nome}</h3>
                    <p class="pontos">${filho.pontos} pontos</p>
                </div>
                <div class="filho-actions">
                    <button onclick="criancasController.editarCrianca('${filho.id}')" class="btn-edit">
                        ✏️
                    </button>
                    <button onclick="criancasController.removerCrianca('${filho.id}')" class="btn-remove">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // Atualizar selects de crianças
    atualizarSelectsCriancas() {
        const selects = document.querySelectorAll('select[name="crianca"]');
        
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Selecione uma criança</option>';
            
            this.filhos.forEach(filho => {
                const option = document.createElement('option');
                option.value = filho.id;
                option.textContent = filho.nome;
                select.appendChild(option);
            });
            
            // Manter valor selecionado se ainda existir
            if (currentValue && this.filhos.find(f => f.id === currentValue)) {
                select.value = currentValue;
            }
        });
    }

    // Atualizar dashboard
    atualizarDashboard() {
        const totalElement = document.getElementById('total-criancas');
        if (totalElement) {
            totalElement.textContent = this.getTotalCriancas();
        }
    }

    // Adicionar criança via modal
    async adicionarCriancaViaModal() {
        const nome = prompt('Digite o nome da criança:');
        if (nome && nome.trim()) {
            try {
                await this.adicionarCrianca(nome.trim());
            } catch (error) {
                console.error('Erro ao adicionar criança:', error);
            }
        }
    }

    // Editar criança
    async editarCrianca(id) {
        const crianca = this.encontrarCrianca(id);
        if (!crianca) return;

        const novoNome = prompt('Digite o novo nome:', crianca.nome);
        if (novoNome && novoNome.trim() && novoNome !== crianca.nome) {
            // Implementar edição quando tivermos a rota
            console.log('Edição de criança ainda não implementada');
            ToastUtils.show('Edição de criança em desenvolvimento', 'info');
        }
    }
}

// Instância global do controller
window.criancasController = new CriancasController(); 