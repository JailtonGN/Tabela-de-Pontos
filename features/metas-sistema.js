// Schema para metas
const metasSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: { type: String, required: true },
    pontosNecessarios: { type: Number, required: true },
    recompensa: { type: String, required: true },
    icone: { type: String, default: '🎯' },
    cor: { type: String, default: '#4CAF50' },
    ativa: { type: Boolean, default: true },
    dataVencimento: { type: Date },
    criadaPor: { type: String, required: true },
    dataCriacao: { type: Date, default: Date.now }
});

// Rotas para metas
app.get('/api/metas', async (req, res) => {
    try {
        const metas = await Metas.find({ ativa: true });
        res.json(metas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/metas', async (req, res) => {
    try {
        const { nome, descricao, pontosNecessarios, recompensa, icone, cor, dataVencimento } = req.body;
        
        const novaMeta = new Metas({
            nome,
            descricao,
            pontosNecessarios,
            recompensa,
            icone: icone || '🎯',
            cor: cor || '#4CAF50',
            dataVencimento,
            criadaPor: 'admin'
        });
        
        await novaMeta.save();
        res.json({ success: true, meta: novaMeta });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verificar metas atingidas
app.get('/api/metas-atingidas/:nome', async (req, res) => {
    try {
        const { nome } = req.params;
        const crianca = await Pontos.findOne({ nome: nome.toLowerCase() });
        const metas = await Metas.find({ ativa: true });
        
        const metasAtingidas = metas.filter(meta => 
            crianca && crianca.pontos >= meta.pontosNecessarios
        );
        
        res.json(metasAtingidas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
