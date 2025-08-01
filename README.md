# 🏆 Sistema de Pontos para Crianças

Um aplicativo web intuitivo para pais gerenciarem e acompanharem o comportamento dos filhos através de um sistema de pontos gamificado.

## ✨ Funcionalidades

### 🎯 **Sistema de Atividades Pré-definidas**
- ➕ **Atividades Positivas**: Recompensas por bom comportamento
- ➖ **Atividades Negativas**: Consequências por comportamentos inadequados
- 💡 **Sugestões Rápidas**: Templates prontos para atividades comuns
- ⚙️ **Configuração Personalizada**: Crie suas próprias atividades

### 👥 **Gerenciamento de Filhos**
- 🎨 **Personalização**: Emoji e cores únicos para cada filho
- 📊 **Dashboard Visual**: Acompanhe os pontos de forma intuitiva
- 🏅 **Sistema de Recompensas**: Motivação através de pontuação

### 📱 **Interface Responsiva**
- 💻 **Desktop e Mobile**: Funciona em qualquer dispositivo
- 🌙 **Modo Escuro**: Configuração visual opcional
- ✨ **Animações**: Feedback visual para interações

### � **Relatórios e Histórico**
- 📝 **Histórico Detalhado**: Registro de todas as atividades
- 📄 **Exportação**: PDF e TXT para compartilhamento
- 📤 **WhatsApp**: Compartilhe relatórios facilmente

## 🚀 Como Usar

### 1. **Configuração Inicial**
1. Clique no botão ⚙️ para abrir configurações
2. Na aba "👥 Filhos", configure nomes e emojis
3. Na aba "🎯 Atividades", adicione atividades personalizadas ou use as sugestões

### 2. **Uso Diário**
1. **Adicionar Pontos**: Selecione filho → atividade positiva → confirmar
2. **Remover Pontos**: Selecione filho → atividade negativa → confirmar
3. **Pontos Avulsos**: Para situações específicas não cadastradas

### 3. **Acompanhamento**
- Dashboard mostra pontos atuais de cada filho
- Histórico registra todas as atividades com data/hora
- Filtros permitem visualizar por filho específico

## 🛠️ Instalação

### Pré-requisitos
- Node.js (versão 14 ou superior)
- NPM ou Yarn

### Passos
```bash
# Clone o projeto
git clone [url-do-projeto]

# Entre na pasta
cd "Tabela de Pontos"

# Instale dependências
npm install

# Inicie o servidor
npm start

# Acesse no navegador
http://localhost:3000
```

## � Estrutura do Projeto

```
Tabela de Pontos/
├── public/                 # Arquivos estáticos
│   ├── index.html         # Página principal
│   ├── script.js          # Lógica principal
│   ├── styles.css         # Estilos principais
│   ├── modal-styles.css   # Estilos do modal
│   └── utils/
│       └── toast-utils.js # Sistema de notificações
├── data/                  # Dados persistidos
│   ├── pontos.json       # Dados dos pontos
│   └── historico.json    # Histórico de atividades
├── server.js             # Servidor Express
├── package.json          # Dependências do projeto
└── README.md            # Este arquivo
```

## � Personalização

### Temas de Cores
- 🌈 Padrão
- 💙 Azul
- 💚 Verde
- 💜 Roxo

### Atividades Sugeridas
**Positivas:**
- 🛏️ Arrumou quarto (+10)
- 📚 Lição de casa (+15)
- 🧹 Ajudou em casa (+8)
- 😇 Bom comportamento (+5)
- 🦷 Escovou dentes (+3)
- 🍽️ Comeu tudo (+5)

**Negativas:**
- 🛏️ Não arrumou quarto (-5)
- 😤 Mau comportamento (-8)
- 📚 Não fez lição (-10)
- 🚫 Desobediência (-6)
- 🤬 Brigou (-7)
- 🦷 Não escovou dentes (-3)

## 💾 Backup e Dados

### Exportação
- **JSON**: Backup completo dos dados
- **CSV**: Planilha para análise
- **PDF**: Relatório formatado
- **TXT**: Texto simples

### Importação
- Suporte a arquivos JSON e CSV
- Merge inteligente de dados existentes

## � Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Persistência**: JSON local + localStorage
- **UI/UX**: Design responsivo, Material Design inspired

## 📱 Compatibilidade

- ✅ Chrome 60+
- ✅ Firefox 60+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile (iOS/Android)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou sugestões:
- 📧 Email: [seu-email]
- 💬 Issues: Use o sistema de issues do GitHub

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Desenvolvido com ❤️ para ajudar famílias a crescerem juntas! 👨‍👩‍👧‍👦** 