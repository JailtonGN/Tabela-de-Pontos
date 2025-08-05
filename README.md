# 🏆 Tabela de Pontos - Sistema Gamificado

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-blue.svg)](https://www.mongodb.com/atlas)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8+-orange.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Sistema gamificado completo para gerenciar comportamento infantil com sincronização multi-dispositivo em tempo real.

## 🚀 Funcionalidades

- **🎯 Gamificação Avançada**: Sistema de pontos, recompensas e metas personalizáveis
- **📱 Sincronização Multi-Dispositivo**: WebSocket para atualizações em tempo real
- **📊 Relatórios e Analytics**: Gráficos e relatórios detalhados de progresso
- **🔐 Autenticação Segura**: Sistema de login com perfis de usuário
- **📱 Notificações Push**: Lembretes e notificações automáticas
- **🌐 Deploy Pronto**: Configurado para Render, Vercel e Netlify
- **🗄️ MongoDB Atlas**: Armazenamento exclusivo em nuvem (sem armazenamento local)

## 🛠️ Tecnologias

- **Backend**: Node.js, Express.js, Socket.IO
- **Banco de Dados**: MongoDB Atlas
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Deploy**: Render, Vercel, Netlify
- **Autenticação**: JWT
- **Relatórios**: jsPDF

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ 
- npm 9+
- Conta MongoDB Atlas (gratuita)

### 1. Clone o repositório

```bash
git clone https://github.com/JailtonGN/Tabela-de-Pontos.git
cd Tabela-de-Pontos
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Configurações do Servidor
PORT=3000
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://seu_usuario:sua_senha@cluster.mongodb.net/tabela-pontos

# JWT
JWT_SECRET=sua_chave_secreta_muito_segura

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# GitHub (opcional para gists)
GITHUB_TOKEN=seu_token_github
```

### 4. Execute o projeto

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

O app estará disponível em: `http://localhost:3000`

## ⚠️ IMPORTANTE: Armazenamento Exclusivo MongoDB

**O sistema agora usa EXCLUSIVAMENTE MongoDB Atlas para armazenamento.**

### ✅ Benefícios:
- **Sem conflitos**: Não há mais armazenamento local
- **Sincronização perfeita**: Todos os dispositivos sempre sincronizados
- **Backup automático**: MongoDB Atlas faz backup automático
- **Escalabilidade**: Suporte a múltiplos usuários simultâneos

### 🔧 Configuração Obrigatória:
1. Crie uma conta no [MongoDB Atlas](https://cloud.mongodb.com)
2. Configure IP `0.0.0.0/0` para aceitar qualquer IP
3. Configure a variável `MONGODB_URI` no seu `.env`

### ❌ Sem Fallback Local:
- O sistema **NÃO funcionará** sem conexão com MongoDB Atlas
- Isso garante consistência total entre todos os dispositivos

## 🚀 Deploy

### Render.com (Recomendado)

1. Conecte sua conta GitHub ao Render
2. Selecione o repositório `Tabela-de-Pontos`
3. Configure as variáveis de ambiente:
   - `MONGODB_URI`: Sua string de conexão MongoDB Atlas
   - `JWT_SECRET`: Chave secreta para JWT
   - `NODE_ENV`: production
4. Deploy automático será configurado

### Vercel

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Netlify

1. Conecte o repositório ao Netlify
2. Configure as variáveis de ambiente
3. Deploy automático

## 📁 Estrutura do Projeto

```
Tabela-de-Pontos/
├── public/                 # Frontend estático
│   ├── index.html         # Página principal
│   ├── login.html         # Página de login
│   ├── script.js          # JavaScript principal
│   ├── styles.css         # Estilos CSS
│   └── utils/             # Utilitários frontend
├── models/                # Modelos MongoDB
│   └── Pontos.js         # Schemas do banco
├── features/              # Funcionalidades avançadas
│   ├── analytics-relatorios.js
│   ├── autenticacao-perfis.js
│   ├── gamificacao-avancada.js
│   ├── metas-sistema.js
│   ├── notificacoes-push.js
│   └── websocket-sync.js
├── utils/                 # Utilitários backend
│   └── response-helper.js
├── validators/            # Validações
│   └── index.js
├── storage/               # Estratégias de armazenamento
│   ├── GitHubGistStorage.js
│   └── JSONBinStorage.js
├── server.js             # Servidor principal
├── package.json          # Dependências
├── render.yaml           # Configuração Render
├── vercel.json           # Configuração Vercel
└── netlify.toml          # Configuração Netlify
```

## 🔧 Scripts Disponíveis

```bash
npm start          # Inicia o servidor de produção
npm run dev        # Inicia o servidor de desenvolvimento
npm run build      # Build do projeto
npm test           # Executa testes
npm run lint       # Linting do código
```

## 🌐 API Endpoints

### Autenticação
- `POST /api/login` - Login de usuário
- `POST /api/register` - Registro de usuário
- `GET /api/profile` - Perfil do usuário

### Pontos
- `GET /api/pontos` - Lista todos os pontos
- `POST /api/pontos` - Adiciona pontos
- `PUT /api/pontos/:id` - Atualiza pontos
- `DELETE /api/pontos/:id` - Remove pontos

### Histórico
- `GET /api/historico` - Histórico de atividades
- `POST /api/historico` - Adiciona entrada no histórico

### Relatórios
- `GET /api/relatorios` - Gera relatórios
- `GET /api/analytics` - Dados analíticos

## 🔐 Segurança

- ✅ Rate limiting configurado
- ✅ Validação de entrada
- ✅ Sanitização de dados
- ✅ JWT para autenticação
- ✅ CORS configurado
- ✅ Headers de segurança

## 📊 Monitoramento

- Logs detalhados de todas as operações
- Métricas de performance
- Monitoramento de erros
- Backup automático do banco

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Jailton Gomes**
- GitHub: [@JailtonGN](https://github.com/JailtonGN)
- Email: jailton.gn@example.com

## 🙏 Agradecimentos

- MongoDB Atlas pela infraestrutura gratuita
- Socket.IO pela sincronização em tempo real
- Render.com pelo deploy gratuito
- Comunidade open source

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Abra uma [issue](https://github.com/JailtonGN/Tabela-de-Pontos/issues)
2. Entre em contato: jailton.gn@example.com
3. Consulte a [documentação](https://github.com/JailtonGN/Tabela-de-Pontos/wiki)

---

⭐ Se este projeto te ajudou, considere dar uma estrela no GitHub! 