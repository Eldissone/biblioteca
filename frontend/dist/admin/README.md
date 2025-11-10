# Painel Administrativo Bib_Oku_DBness

Este é o painel administrativo completo para gerenciar a loja Bib_Oku_DBness, incluindo produtos, pedidos, clientes e configurações.

## Funcionalidades

### 🔐 Autenticação
- Sistema de login seguro
- Credenciais de demonstração: `admin` / `admin123`
- Sessão persistente com localStorage

### 📊 Dashboard
- Visão geral das estatísticas da loja
- Total de produtos, pedidos pendentes, vendas e clientes ativos
- Lista de pedidos recentes
- Produtos mais vendidos

### 🛍️ Gerenciamento de Produtos
- **Listar produtos**: Visualizar todos os produtos com imagens, preços e estoque
- **Adicionar produto**: Formulário completo para adicionar novos produtos
- **Editar produto**: Funcionalidade preparada para edição
- **Excluir produto**: Remover produtos com confirmação
- **Categorias**: Roupas, Acessórios, Calçados

### 📦 Gerenciamento de Pedidos
- **Listar pedidos**: Visualizar todos os pedidos com detalhes
- **Status dos pedidos**: Pendente, Processando, Concluído, Cancelado
- **Ver detalhes**: Visualizar informações completas do pedido
- **Excluir pedido**: Remover pedidos com confirmação

### 👥 Gerenciamento de Clientes
- **Listar clientes**: Visualizar todos os clientes cadastrados
- **Informações**: Nome, email, telefone, histórico de pedidos
- **Total gasto**: Valor total gasto por cada cliente
- **Status**: Cliente ativo ou inativo

### 📈 Analytics
- Gráficos de vendas mensais (preparado para implementação)
- Gráficos de produtos mais vendidos (preparado para implementação)
- Área para integração com ferramentas de análise

### ⚙️ Configurações
- **Informações da loja**: Nome, email, telefone, endereço
- **Configurações gerais**: Personalização do site
- **Salvar configurações**: Persistência das alterações

## Como Usar

### 1. Acesso ao Painel
1. Navegue para `/admin/login.html`
2. Use as credenciais: `admin` / `admin123`
3. Clique em "Entrar"

### 2. Navegação
- Use o menu lateral para navegar entre as seções
- Cada seção tem funcionalidades específicas
- O dashboard mostra uma visão geral

### 3. Gerenciar Produtos
1. Clique em "Produtos" no menu lateral
2. Para adicionar: Clique em "Adicionar Produto"
3. Preencha o formulário com:
   - Nome do produto
   - Descrição
   - Categoria
   - Preço (AOA)
   - Estoque
   - URL da imagem
4. Clique em "Adicionar Produto"

### 4. Gerenciar Pedidos
1. Clique em "Pedidos" no menu lateral
2. Visualize todos os pedidos com status
3. Use "Ver Detalhes" para mais informações
4. Use "Excluir" para remover pedidos

### 5. Gerenciar Clientes
1. Clique em "Clientes" no menu lateral
2. Visualize informações dos clientes
3. Veja histórico de pedidos e total gasto

## Estrutura de Arquivos

```
admin/
├── index.html          # Página principal do painel
├── login.html          # Página de login
├── styles.css          # Estilos do painel
├── admin.js            # JavaScript com toda a lógica
└── README.md           # Esta documentação
```

## Tecnologias Utilizadas

- **HTML5**: Estrutura semântica
- **CSS3**: Estilos modernos e responsivos
- **JavaScript**: Lógica de negócio e interações
- **LocalStorage**: Persistência de sessão
- **Fontes**: Plus Jakarta Sans, Noto Sans

## Recursos de Design

### Cores
- **Primária**: `#ff8200` (Laranja)
- **Secundária**: `#1b130d` (Marrom escuro)
- **Neutra**: `#fcfaf8` (Bege claro)
- **Texto**: `#9a6c4c` (Marrom médio)

### Componentes
- **Sidebar**: Navegação lateral fixa
- **Cards**: Estatísticas e informações
- **Tabelas**: Dados organizados
- **Modais**: Formulários e confirmações
- **Notificações**: Feedback para o usuário

## Funcionalidades Futuras

### 🔄 Melhorias Planejadas
- [ ] Integração com banco de dados real
- [ ] Sistema de upload de imagens
- [ ] Filtros e busca avançada
- [ ] Exportação de relatórios
- [ ] Gráficos interativos
- [ ] Sistema de notificações em tempo real
- [ ] Backup automático de dados
- [ ] Múltiplos níveis de acesso

### 📱 Responsividade
- [ ] Otimização para tablets
- [ ] Menu mobile
- [ ] Touch gestures

### 🔒 Segurança
- [ ] Autenticação com JWT
- [ ] Criptografia de senhas
- [ ] Rate limiting
- [ ] Logs de auditoria

## Suporte

Para dúvidas ou suporte técnico, entre em contato com a equipe de desenvolvimento.

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2024  
**Desenvolvido para**: Bib_Oku_DBness Angola 