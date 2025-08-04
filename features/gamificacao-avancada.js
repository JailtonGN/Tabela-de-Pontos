// Sistema de Conquistas/Badges
const conquistasSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nome: { type: String, required: true },
    descricao: { type: String, required: true },
    icone: { type: String, required: true },
    cor: { type: String, default: '#FFD700' },
    condicao: { type: Object, required: true }, // Ex: { tipo: 'pontos', valor: 100 }
    raridade: { type: String, enum: ['comum', 'raro', 'epico', 'lendario'], default: 'comum' }
});

const conquistasUsuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    conquistaId: { type: String, required: true },
    dataConquista: { type: Date, default: Date.now },
    notificado: { type: Boolean, default: false }
});

// Conquistas predefinidas
const CONQUISTAS = [
    {
        id: 'primeiro-ponto',
        nome: 'Primeiros Passos',
        descricao: 'Ganhou o primeiro ponto!',
        icone: '🌟',
        condicao: { tipo: 'pontos-total', valor: 1 },
        raridade: 'comum'
    },
    {
        id: 'centuriao',
        nome: 'Centurião',
        descricao: 'Alcançou 100 pontos!',
        icone: '💯',
        condicao: { tipo: 'pontos-total', valor: 100 },
        raridade: 'raro'
    },
    {
        id: 'sequencia-7-dias',
        nome: 'Disciplinado',
        descricao: 'Ganhou pontos por 7 dias seguidos!',
        icone: '🔥',
        condicao: { tipo: 'sequencia-dias', valor: 7 },
        raridade: 'epico'
    },
    {
        id: 'atividade-perfeita',
        nome: 'Perfeccionista',
        descricao: 'Completou 50 atividades!',
        icone: '👑',
        condicao: { tipo: 'atividades-total', valor: 50 },
        raridade: 'lendario'
    }
];

// Verificar conquistas após adicionar pontos
async function verificarConquistas(nome, novosPontos, pontosTotal) {
    const conquistasDesbloqueadas = [];
    
    for (const conquista of CONQUISTAS) {
        // Verificar se já tem esta conquista
        const jaTemConquista = await ConquistasUsuario.findOne({
            nome: nome.toLowerCase(),
            conquistaId: conquista.id
        });
        
        if (!jaTemConquista) {
            let desbloqueou = false;
            
            switch (conquista.condicao.tipo) {
                case 'pontos-total':
                    desbloqueou = pontosTotal >= conquista.condicao.valor;
                    break;
                case 'atividades-total':
                    const totalAtividades = await Historico.countDocuments({
                        nome: nome.toLowerCase()
                    });
                    desbloqueou = totalAtividades >= conquista.condicao.valor;
                    break;
                case 'sequencia-dias':
                    desbloqueou = await verificarSequenciaDias(nome, conquista.condicao.valor);
                    break;
            }
            
            if (desbloqueou) {
                await new ConquistasUsuario({
                    nome: nome.toLowerCase(),
                    conquistaId: conquista.id
                }).save();
                
                conquistasDesbloqueadas.push(conquista);
            }
        }
    }
    
    return conquistasDesbloqueadas;
}

// API para conquistas
app.get('/api/conquistas/:nome', async (req, res) => {
    try {
        const { nome } = req.params;
        const conquistasUsuario = await ConquistasUsuario.find({
            nome: nome.toLowerCase()
        });
        
        const conquistasCompletas = conquistasUsuario.map(cu => ({
            ...CONQUISTAS.find(c => c.id === cu.conquistaId),
            dataConquista: cu.dataConquista
        }));
        
        res.json({
            total: conquistasCompletas.length,
            conquistas: conquistasCompletas,
            proximas: getProximasConquistas(nome, conquistasCompletas)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
