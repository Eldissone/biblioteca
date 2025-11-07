// Autenticação global padronizada
let userToken = localStorage.getItem('userToken');
let userData = null;
try {
  userData = JSON.parse(localStorage.getItem('userData'));
} catch (e) {
  userData = null;
}

// Global variables
let allBooks = [];
let filteredBooks = [];
let currentBook = null;
let currentFilters = {
    category: '',
    search: ''
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    loadUserActions();
    loadBooks();
    setupEventListeners();
});

// API base dinâmico: no browser usa a origem atual, senão fallback
const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';

// Load user actions (login, register, perfil)
function loadUserActions() {
    const userActions = document.getElementById('userActions');
    if (userToken && userData) {
        let avatarHtml = '';
        if (userData.avatar) {
            avatarHtml = `<div onclick="showProfileModal()" title="Meu perfil" class="w-10 h-10 rounded-full bg-center bg-cover border-2 border-[#ff8200] cursor-pointer hover:scale-105 transition-transform" style="background-image: url('${userData.avatar}');"></div>`;
        } else {
            const initial = userData.full_name ? userData.full_name[0].toUpperCase() : (userData.username ? userData.username[0].toUpperCase() : 'U');
            avatarHtml = `<div onclick="showProfileModal()" title="Meu perfil" class="w-10 h-10 rounded-full bg-[#ff8200] text-white flex items-center justify-center font-bold text-lg border-2 border-[#ff8200] cursor-pointer hover:scale-105 transition-transform">${initial}</div>`;
        }
        userActions.innerHTML = `
          ${avatarHtml}
          <button onclick="logout()" class="rounded-xl h-10 bg-[#f3ece7] text-[#1b130d] hover:bg-[#ff8200] hover:text-white px-3">Sair</button>
        `;
    } else {
        userActions.innerHTML = `
          <button onclick="showModal('loginModal')" class="rounded-xl h-10 bg-[#f3ece7] text-[#1b130d] px-3">Login</button>
          <button onclick="showModal('registerModal')" class="rounded-xl h-10 bg-[#ff8200] text-white px-3">Registrar</button>
        `;
    }
}

// Load all books from backend
async function loadBooks() {
    try {
    const response = await fetch(`${API_BASE}/api/public/books`);
        if (response.ok) {
            allBooks = await response.json();
            filteredBooks = [...allBooks];
            displayBooks();
            updateBookCount();
        } else {
            console.error('Erro ao carregar livros');
        }
    } catch (error) {
        console.error('Erro ao carregar livros:', error);
    }
}

// Display books
function displayBooks() {
        const booksGrid = document.getElementById('productsGrid'); // id presente em biblioteca.html
        if (!booksGrid) return console.error('Elemento #productsGrid não encontrado na página.');
        booksGrid.innerHTML = '';

        if (filteredBooks.length === 0) {
                booksGrid.innerHTML = `
                    <div class="col-span-full text-center py-8">
                        <p class="text-[#9a6c4c] text-lg">Nenhum livro encontrado</p>
                    </div>
                `;
                return;
        }

        filteredBooks.forEach(book => {
                const coverPath = book.cover_image || book.cover || '/uploads/default-book.jpg';
                const pdfPath = book.pdf_file || book.pdf || null;
            const coverUrl = coverPath.startsWith('http') ? coverPath : `${API_BASE}${coverPath}`;
            const pdfUrl = pdfPath ? (pdfPath.startsWith('http') ? pdfPath : `${API_BASE}${pdfPath}`) : null;

                const bookCard = document.createElement('div');
                bookCard.className = 'flex flex-col items-center bg-white rounded-lg shadow p-3 min-w-[180px]';
                bookCard.innerHTML = `
                    <div class="w-32 h-44 bg-center bg-no-repeat bg-cover rounded-md mb-2"
                             style="background-image: url('${coverUrl}')"></div>
                    <h3 class="text-[#1b130d] text-sm font-bold truncate">${book.title}</h3>
                    <p class="text-[#9a6c4c] text-xs truncate">${book.author || 'Autor desconhecido'}</p>
                    <div class="flex gap-2 mt-2">
                        <button onclick="readNow('${escapeJs(book.title)}','${pdfUrl}')" class="px-3 py-1 bg-[#ff8200] text-white text-sm rounded hover:bg-[#d67a3a]">Ler</button>
                        <button onclick="downloadBook('${escapeJs(book.title)}','${pdfUrl}')" class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-[#0d783a]">Download</button>
                    </div>
                `;
                booksGrid.appendChild(bookCard);
        });
}

// Pequena função utilitária para escapar strings dentro de atributos inline JS
function escapeJs(str) {
        if (!str) return '';
        return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// View book details
function viewBook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) {
        console.error('Livro não encontrado:', bookId);
        return;
    }
    currentBook = book;
    showBookModal(book);
}

// Show book detail modal
function showBookModal(book) {
    document.getElementById('modalBookTitle').textContent = book.title;
    document.getElementById('modalBookAuthor').textContent = book.author || 'Autor desconhecido';
    document.getElementById('modalBookCategory').textContent = book.category || 'Sem categoria';
    document.getElementById('modalBookDescription').textContent = book.description || 'Descrição não disponível';

    const mainImage = document.getElementById('modalBookImage');
    mainImage.style.backgroundImage = `url('${API_BASE}${book.cover || '/uploads/default-book.jpg'}')`;

    // Botões (se existirem)
    if (document.getElementById('readNowBtn')) document.getElementById('readNowBtn').onclick = () => readNow(book.title, book.pdf_file || book.pdf);
    if (document.getElementById('downloadBtn')) document.getElementById('downloadBtn').onclick = () => downloadBook(book.title, book.pdf_file || book.pdf);

    showModal('bookDetailModal');
}

// Ler PDF no leitor interno
function readNow(title, pdfUrl) {
    if (!pdfUrl) return alert("PDF não disponível!");
    const reader = document.getElementById("pdf-reader");
    reader.src = pdfUrl;
    document.getElementById("pdf-reader-container").classList.remove("hidden");
}

// Download PDF
function downloadBook(title, pdfUrl) {
    if (!pdfUrl) return alert("PDF não disponível!");
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = title + ".pdf";
    link.click();
}
