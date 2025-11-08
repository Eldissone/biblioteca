// Configurações globais
const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? `${window.location.origin}/api` : 'http://localhost:3000/api';
let userToken = localStorage.getItem('userToken');
let userData = JSON.parse(localStorage.getItem('userData') || 'null');
let cartItems = [];

const logo = document.querySelector(".logo")
logo.addEventListener('click', () => {
  window.location.href = "index.html";  
})

// Função para verificar se usuário está logado
function isUserLoggedIn() {
  return userToken && userData;
}

// Função para carregar botões de usuário
function loadUserActions() {
  const container = document.getElementById('user-actions');

  if (isUserLoggedIn()) {
    // Verificar se o usuário é admin
    const isAdmin = userData && userData.role === 'admin';
    let adminButton = '';
    if (isAdmin) {
      adminButton = `
            <button
              class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#f3ece7] text-[#1b130d] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#ff8200] hover:text-white transition-colors"
              onclick="window.location.href='../admin/index.html'">
              <span class="truncate">Admin</span>
            </button>
          `;
    }
    // Avatar do usuário
    let avatarHtml = '';
    if (userData.avatar) {
      avatarHtml = `<div onclick="showProfileModal()" title="Meu perfil" class="w-10 h-10 rounded-full bg-center bg-cover border-2 border-[#ff8200] cursor-pointer hover:scale-105 transition-transform" style="background-image: url('${userData.avatar}');"></div>`;
    } else {
      const initial = userData.full_name ? userData.full_name[0].toUpperCase() : (userData.username ? userData.username[0].toUpperCase() : 'U');
      avatarHtml = `<div onclick="showProfileModal()" title="Meu perfil" class="w-10 h-10 rounded-full bg-[#ff8200] text-white flex items-center justify-center font-bold text-lg border-2 border-[#ff8200] cursor-pointer hover:scale-105 transition-transform">${initial}</div>`;
    }
    container.innerHTML = `
          ${adminButton}
          ${avatarHtml}
        
          <button
            class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#f3ece7] text-[#1b130d] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#ff8200] hover:text-white transition-colors"
            onclick="logout()">
            <span class="truncate">Sair</span>
          </button>
        `;
  } else {
    container.innerHTML = `
          <button
            class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#f3ece7] text-[#1b130d] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#ff8200] hover:text-white transition-colors"
            onclick="window.location.href='login.html'">
            <span class="truncate">Entrar</span>
          </button>
          <button
            class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#ff8200] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#d67a3a] transition-colors"
            onclick="window.location.href='register.html'">
            <span class="truncate">Registrar</span>
          </button>
        `;
  }
}

// Função para fazer logout
function logout() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  userToken = null;
  userData = null;
  cartItems = [];
  loadUserActions();
  loadFeaturedProducts();
}


// Carregar dados quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  loadUserActions();
  if (isUserLoggedIn()) {
  }
});

// Função para abrir configurações (placeholder)
function openSettings() {
  alert('Configurações do perfil em breve!');
}

function createBookCard(book) {
  const imageUrl = `http://localhost:3000${book.cover_image}`;
  const pdfUrl = `http://localhost:3000${book.pdf_file}`; // CORRIGIDO

  return `
      <div class="flex flex-col items-center bg-white rounded-lg shadow p-3 min-w-[250px] max-w-[250px]">
        <img src="${imageUrl}" alt="${book.title}" 
             class="w-36 h-44 object-cover rounded-md mb-2">
        <h3 class="text-[#1b130d] max-w-[250px] p-5  text-sm font-bold truncate">${book.title}</h3>
        <p class="text-gray-600 text-xs truncate">${book.author}</p>

        <div class="Btn-div">
          <button onclick="readNow('${book.title}', '${pdfUrl}')"
            class="mt-2 px-3 py-1 bg-[#ff8200] text-white text-sm rounded hover:bg-[#d67a3a]">
            Ler
          </button>

          <button onclick="downloadBook('${book.title}', '${pdfUrl}')"
            class="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-[#0d783a]">
            Download
          </button>
        </div>

      </div>
    `;
}



// Carregar livros do backend
async function loadBooks() {
  try {
    const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/books`);
    const data = await res.json();

    const featured = document.getElementById("featured-products");
    const news = document.getElementById("new-products");

    featured.innerHTML = "";
    news.innerHTML = "";

    data.forEach((book, index) => {
      const card = createBookCard(book);
      if (index < 5) {
        featured.innerHTML += card; // primeiros livros = destaque
      } else {
        news.innerHTML += card; // os demais = novidades
      }
    });
  } catch (error) {
    console.error("Erro ao carregar livros:", error);
  }
}
let selectedBook = null;

// Abrir modal de pedido
function openCheckout(title, image, pdfUrl) {
  selectedBook = { title, image, pdfUrl };
  document.getElementById("checkout-modal").classList.add("active");
  console.log("Pedido:", selectedBook);
}

// Download do PDF
function downloadBook(title, pdfUrl) {
  if (!pdfUrl) return alert("PDF não disponível!");
  const link = document.createElement("a");
  link.href = pdfUrl;
  link.download = title + ".pdf";
  link.click();
}

// Ler PDF no leitor interno
function readNow(title, pdfUrl) {
  if (!pdfUrl) return alert("PDF não disponível!");
  const reader = document.getElementById("pdf-reader");
  reader.src = pdfUrl; // PDF abre no iframe embutido
  document.getElementById("pdf-reader-container").classList.remove("hidden");
}

// Fechar o leitor
function closeReader() {
  const reader = document.getElementById("pdf-reader");
  reader.src = "";
  document.getElementById("pdf-reader-container").classList.add("hidden");
}

// Carregar ao abrir a página
window.onload = loadBooks;