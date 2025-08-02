// Sistema de Analytics
app.get('/api/analytics/resumo-semanal', async (req, res) => {
    try {
        const agora = new Date();
        const semanaPassada = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const historico = await Historico.find({
            data: { $gte: semanaPassada }
        });
        
        const analytics = {
            totalPontos: historico.reduce((acc, h) => 
                h.tipo === 'adicionar' ? acc + h.pontos : acc - h.pontos, 0
            ),
            totalAtividades: historico.length,
            criancaMaisAtiva: getMostActive(historico),
            atividadeMaisFrequente: getMostFrequentActivity(historico),
            pontosPorDia: getDailyPoints(historico),
            tiposAtividade: getActivityTypes(historico)
        };
        
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function getMostActive(historico) {
    const contador = {};
    historico.forEach(h => {
        contador[h.nome] = (contador[h.nome] || 0) + 1;
    });
    return Object.keys(contador).reduce((a, b) => 
        contador[a] > contador[b] ? a : b
    );
}

function getDailyPoints(historico) {
    const pontosPorDia = {};
    historico.forEach(h => {
        const dia = h.data.toISOString().split('T')[0];
        pontosPorDia[dia] = (pontosPorDia[dia] || 0) + 
            (h.tipo === 'adicionar' ? h.pontos : -h.pontos);
    });
    return pontosPorDia;
}

// Rota para exportar relatório em PDF
app.get('/api/relatorio-pdf/:nome', async (req, res) => {
    try {
        const { nome } = req.params;
        const crianca = await Pontos.findOne({ nome: nome.toLowerCase() });
        const historico = await Historico.find({ nome: nome.toLowerCase() })
            .sort({ data: -1 }).limit(50);
        
        const html = gerarRelatorioHTML(crianca, historico);
        
        // Aqui usaria puppeteer para gerar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="relatorio-${nome}.pdf"`);
        
        // Por enquanto retorna HTML
        res.send(html);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function gerarRelatorioHTML(crianca, historico) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Relatório - ${crianca.nome}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; color: #2196F3; }
            .pontos-total { font-size: 24px; font-weight: bold; }
            .historico { margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Relatório de Pontos</h1>
            <h2>${crianca.nome.toUpperCase()}</h2>
            <div class="pontos-total">Total: ${crianca.pontos} pontos</div>
        </div>
        
        <div class="historico">
            <h3>📋 Últimas 50 Atividades</h3>
            <table>
                <tr>
                    <th>Data</th>
                    <th>Atividade</th>
                    <th>Pontos</th>
                    <th>Tipo</th>
                </tr>
                ${historico.map(h => `
                <tr>
                    <td>${new Date(h.data).toLocaleDateString()}</td>
                    <td>${h.motivo}</td>
                    <td>${h.pontos}</td>
                    <td>${h.tipo === 'adicionar' ? '➕' : '➖'}</td>
                </tr>
                `).join('')}
            </table>
        </div>
    </body>
    </html>
    `;
}
