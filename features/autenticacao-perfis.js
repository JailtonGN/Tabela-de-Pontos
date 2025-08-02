// Sistema de usuários e perfis
const usuariosSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    nome: { type: String, required: true },
    tipo: { type: String, enum: ['pai', 'mae', 'crianca'], required: true },
    avatar: { type: String, default: '👤' },
    familiaId: { type: String, required: true },
    configuracoes: {
        notificacoes: { type: Boolean, default: true },
        tema: { type: String, enum: ['claro', 'escuro'], default: 'claro' },
        idioma: { type: String, default: 'pt-BR' }
    },
    dataCriacao: { type: Date, default: Date.now },
    ultimoAcesso: { type: Date, default: Date.now }
});

const familiasSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nome: { type: String, required: true },
    codigoConvite: { type: String, required: true, unique: true },
    criador: { type: String, required: true },
    membros: [{
        userId: { type: String, required: true },
        papel: { type: String, enum: ['admin', 'pai', 'crianca'], required: true },
        dataEntrada: { type: Date, default: Date.now }
    }],
    configuracoes: {
        pontosMaximosPorAtividade: { type: Number, default: 10 },
        requererAprovacao: { type: Boolean, default: false },
        metasMensais: { type: Boolean, default: true }
    },
    dataCriacao: { type: Date, default: Date.now }
});

// Middleware de autenticação
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

function autenticarToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'secret-key', (err, usuario) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.usuario = usuario;
        next();
    });
}

// Rota de login
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        const usuario = await Usuarios.findOne({ email: email.toLowerCase() });
        if (!usuario) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const token = jwt.sign(
            { 
                userId: usuario._id, 
                email: usuario.email,
                familiaId: usuario.familiaId,
                tipo: usuario.tipo
            },
            process.env.JWT_SECRET || 'secret-key',
            { expiresIn: '7d' }
        );
        
        // Atualizar último acesso
        await Usuarios.updateOne(
            { _id: usuario._id },
            { ultimoAcesso: new Date() }
        );
        
        res.json({
            success: true,
            token,
            usuario: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo,
                avatar: usuario.avatar,
                familiaId: usuario.familiaId
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para criar família
app.post('/api/familia', autenticarToken, async (req, res) => {
    try {
        const { nome } = req.body;
        const familiaId = gerarIdUnico();
        const codigoConvite = gerarCodigoConvite();
        
        const novaFamilia = new Familias({
            id: familiaId,
            nome,
            codigoConvite,
            criador: req.usuario.userId,
            membros: [{
                userId: req.usuario.userId,
                papel: 'admin'
            }]
        });
        
        await novaFamilia.save();
        
        // Atualizar usuário com familiaId
        await Usuarios.updateOne(
            { _id: req.usuario.userId },
            { familiaId }
        );
        
        res.json({
            success: true,
            familia: novaFamilia,
            codigoConvite
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function gerarIdUnico() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function gerarCodigoConvite() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
}
