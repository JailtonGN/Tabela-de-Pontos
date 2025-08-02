# Como configurar MongoDB Atlas (100% gratuito):

## 1. Acesse https://www.mongodb.com/cloud/atlas
## 2. Clique em "Try Free"
## 3. Crie uma conta gratuita
## 4. Crie um cluster gratuito (M0 Sandbox)
## 5. Configure usuário e senha
## 6. Adicione IP 0.0.0.0/0 (qualquer IP) para testes
## 7. Obtenha a string de conexão
## 8. Substitua no .env:

MONGODB_URI=mongodb+srv://usuario:senha@cluster0.mongodb.net/tabela-pontos?retryWrites=true&w=majority

# Para facilitar o teste, vou criar uma conta temporária:
# Usuário: tabela-pontos
# Senha: TabelaPontos2025
# Database: tabela-pontos
