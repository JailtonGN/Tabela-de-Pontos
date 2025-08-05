# 🚀 Guia Completo de Deploy no Render

## 📋 Pré-requisitos

1. **Conta no Render**: [render.com](https://render.com)
2. **Conta MongoDB Atlas**: [cloud.mongodb.com](https://cloud.mongodb.com)
3. **Repositório no GitHub**: Seu projeto já está no GitHub

## 🔐 Chaves Secretas Geradas

Use estas chaves no Render:

### JWT_SECRET:
```
d372f0ea63c9c2f2659bec99c725df9506b19d7898881f01bc1133239399d7e10266d8d06f0271d194e0f4f26056ca0150d61052d3715ff45ce4b87e8496de10
```

### SESSION_SECRET:
```
5cdfd8939b224b4b39c9943bf6e1d32a4150ce27414bf2866581c724c15137d1
```

## 🗄️ Configuração MongoDB Atlas

### 1. Criar Cluster MongoDB Atlas
1. Acesse [cloud.mongodb.com](https://cloud.mongodb.com)
2. Crie uma conta gratuita
3. Crie um novo cluster (gratuito)
4. Escolha a região mais próxima

### 2. Configurar Acesso
1. **Database Access**: Crie um usuário com senha
2. **Network Access**: Adicione IP `0.0.0.0/0` (permite qualquer IP)
3. **Clusters**: Clique em "Connect" e escolha "Connect your application"

### 3. Obter String de Conexão
```
mongodb+srv://seu_usuario:sua_senha@cluster.mongodb.net/tabela-pontos?retryWrites=true&w=majority
```

## 🌐 Deploy no Render

### 1. Conectar GitHub
1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em "New" → "Web Service"
3. Conecte sua conta GitHub
4. Selecione o repositório `Tabela-de-Pontos`

### 2. Configurar Serviço
- **Name**: `tabela-pontos-app`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free`

### 3. Variáveis de Ambiente
Configure estas variáveis no Render:

| Variável | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | `sua_string_mongodb_atlas` |
| `JWT_SECRET` | `d372f0ea63c9c2f2659bec99c725df9506b19d7898881f01bc1133239399d7e10266d8d06f0271d194e0f4f26056ca0150d61052d3715ff45ce4b87e8496de10` |
| `SESSION_SECRET` | `5cdfd8939b224b4b39c9943bf6e1d32a4150ce27414bf2866581c724c15137d1` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | `100` |
| `CORS_ORIGIN` | `*` |
| `LOG_LEVEL` | `info` |
| `ENABLE_WEBSOCKET` | `true` |
| `ENABLE_ANALYTICS` | `true` |

### 4. Deploy
1. Clique em "Create Web Service"
2. Aguarde o build (2-3 minutos)
3. Seu app estará em: `https://tabela-pontos-app.onrender.com`

## ✅ Verificação Pós-Deploy

### 1. Testar Aplicação
- Acesse a URL gerada
- Teste login/registro
- Verifique sincronização em tempo real

### 2. Verificar Logs
- No Render Dashboard → Seu serviço → Logs
- Verifique se não há erros

### 3. Testar MongoDB
- Verifique se os dados estão sendo salvos
- Teste criação de usuários e pontos

## 🔧 Troubleshooting

### Erro de Conexão MongoDB
- Verifique se o IP `0.0.0.0/0` está configurado
- Confirme a string de conexão
- Verifique usuário/senha

### Erro de Build
- Verifique se `package.json` está correto
- Confirme se `server.js` é o arquivo principal

### Erro de Porta
- Render usa a variável `PORT` automaticamente
- Não precisa configurar porta manualmente

## 📱 URLs Importantes

- **Render Dashboard**: https://dashboard.render.com
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Seu App**: https://tabela-pontos-app.onrender.com

## 🔄 Deploy Automático

O Render configurará automaticamente:
- ✅ Deploy automático a cada push no GitHub
- ✅ Build automático
- ✅ SSL/HTTPS gratuito
- ✅ CDN global

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Render Dashboard
2. Confirme as variáveis de ambiente
3. Teste localmente primeiro
4. Verifique a conexão MongoDB Atlas

---

**🎉 Parabéns! Seu app estará online em minutos!** 