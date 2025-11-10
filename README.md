# 📚 Biblioteca Virtual

> Uma plataforma digital moderna para gestão e leitura de livros online — simples, rápida e feita com amor ao conhecimento.  
> Desenvolvida para tornar o acesso à leitura mais fácil e intuitivo, com um design responsivo e foco na experiência do usuário.

---

## 🧠 Tecnologias

| Área | Stack |
|------|--------|
| **Frontend** | ⚡ [Vite](https://vitejs.dev/), HTML5, CSS3, JavaScript |
| **Backend** | 🧩 Node.js, Express |
| **Banco de Dados** | 🗄️ PostgreSQL |
| **Autenticação** | 🔐 JWT (JSON Web Token) |
| **Infraestrutura** | 🌐 API REST, Proxy Vite |

---

## ✨ Funcionalidades

✅ Cadastro e login de usuários  
✅ Upload e gestão de livros (título, autor, capa e PDF)  
✅ Busca avançada e filtros por categoria  
✅ Visualização e histórico de leitura  
✅ Favoritos e recomendações  
✅ Painel administrativo (CRUD completo)  

---

## ⚙️ Instalação e Configuração

### 1️⃣ Clonar o repositório
```bash
git clone https://github.com/seuusuario/biblioteca.git
cd biblioteca

Instalar dependências
cd frontend -> npm install
cd backend -> npm intall

3️⃣ Configurar variáveis de ambiente

Crie um arquivo .env na raiz do projeto:

DATABASE_URL=postgres://usuario:senha@localhost:5432/biblioteca
JWT_SECRET=sua_chave_secreta
PORT=3000

4️⃣ Rodar o servidor
npm run dev

5️⃣ Acessar o projeto

Abra o navegador e acesse:

http://localhost:5173/

🌐 Configuração do Proxy (Vite)
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})

📁 Estrutura do Projeto
biblioteca/

|__ frontend
├── src/
│   ├── assets/          # imagens e ícones
│   ├── components/      # componentes reutilizáveis
│   ├── pages/           # páginas principais
│   ├── services/        # comunicação com a API
│   ├── styles/          # CSS global e variáveis
│   └── main.js          # ponto de entrada
|__ backend
├── server/
│   ├── app.js           # configuração do Express
│   ├── routes/          # rotas da API
│   ├── controllers/     # lógica de negócio
│   └── models/          # modelos de dados
├── public/
│   └── index.html
└── package.json

🚀 Roadmap de Evolução

🧩 Integração com IA para recomendações de leitura
💬 Chat entre leitores e autores
⭐ Avaliações e comentários por livro
📚 Sistema de leitura online (PDF viewer integrado)
🌎 Tradução multilíngue e suporte internacional

👨‍💻 Autor

Eldissone Vilonga
Técnico de Informática e Desenvolvedor Fullstack
📍 Lubango - Angola

🔗 LinkedIn 🌐 finev.com

🪪 Licença

Este projeto é distribuído sob a licença MIT.
Sinta-se à vontade para usar, estudar e aprimorar! 💡
