/**
 * 🔐 MIDDLEWARE DE AUTENTICAÇÃO
 * 
 * Centraliza toda a lógica de autenticação e autorização
 * 
 * @author Jailton Gomes
 * @version 2.0.0
 */

// Senhas configuradas (em produção, usar variáveis de ambiente)
const SENHAS_CONFIGURADAS = {
    familia: 'familia123',
    admin: 'admin2025!'
};

// Verificar autenticação básica
const verificarAutenticacao = (requiredPermission = null) => {
    return (req, res, next) => {
        try {
            const { tipo, senha } = req.body;
            
            console.log('🔍 Verificando credenciais para tipo:', tipo);
            console.log('🔑 Senha recebida:', senha);
            console.log('🔑 Senhas configuradas:', SENHAS_CONFIGURADAS);
            
            // Verificar se o tipo de usuário existe
            if (!SENHAS_CONFIGURADAS[tipo]) {
                return res.status(401).json({
                    success: false,
                    message: 'Tipo de usuário inválido'
                });
            }
            
            // Verificar senha
            const senhaValida = SENHAS_CONFIGURADAS[tipo];
            const senhaCorreta = senha === senhaValida;
            
            console.log('🔧 Verificando login de', tipo + '...');
            console.log('🔍 Comparando:', `"${senha}" === "${senhaValida}"`);
            console.log('✅ Senha', tipo, 'válida?', senhaCorreta);
            
            if (!senhaCorreta) {
                return res.status(401).json({
                    success: false,
                    message: 'Senha incorreta'
                });
            }
            
            // Criar objeto do usuário
            const usuario = {
                type: tipo,
                nome: tipo === 'admin' ? 'Administrador' : 'Família',
                permissions: obterPermissoes(tipo),
                loginTime: new Date().toISOString(),
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
            };
            
            // Salvar log de login
            salvarLogSistema({
                tipo: 'LOGIN',
                usuario: tipo,
                tipoUsuario: tipo,
                timestamp: new Date().toISOString(),
                ip: req.ip
            });
            
            // Adicionar usuário à requisição
            req.user = usuario;
            
            // Verificar permissão específica se necessário
            if (requiredPermission && !usuario.permissions.includes(requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    message: 'Permissão insuficiente'
                });
            }
            
            next();
        } catch (error) {
            console.error('❌ Erro na autenticação:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    };
};

// Obter permissões baseadas no tipo de usuário
const obterPermissoes = (tipo) => {
    const permissoes = {
        admin: ['view', 'add_points', 'remove_points', 'manage_children', 'manage_activities', 'view_history', 'export_data'],
        familia: ['view', 'add_points', 'remove_points', 'view_history'],
        guest: ['view']
    };
    
    return permissoes[tipo] || permissoes.guest;
};

// Salvar log do sistema
const salvarLogSistema = async (dadosLog) => {
    try {
        console.log('🔐 Log de Sistema:', dadosLog);
        
        // Aqui você pode implementar a lógica para salvar no MongoDB
        // Por enquanto, apenas log no console
    } catch (error) {
        console.error('❌ Erro ao salvar log:', error);
    }
};

module.exports = {
    verificarAutenticacao,
    obterPermissoes,
    salvarLogSistema
}; 