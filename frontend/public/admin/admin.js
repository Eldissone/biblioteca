// ================= CONFIGURAÇÃO GERAL =================
const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? `${window.location.origin}/api` : 'http://localhost:3000/api';
const ORIGIN = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';

// ================= FUNÇÃO GENÉRICA DE REQUISIÇÃO =================
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options
    };

    try {
        const response = await fetch(url, config);
        if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error("Erro API:", err);
        alert("Erro na comunicação com o servidor");
    }
}

// ================== MÓDULO DE LIVROS ==================
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page-content');
    const pageTitle = document.getElementById('page-title');
    const addBookBtn = document.getElementById('add-book-btn');
    const addBookModal = document.getElementById('add-book-modal');
    const closeBookModal = document.getElementById('close-book-modal');
    const addBookForm = document.getElementById('add-book-form');
    const tbody = document.getElementById('books-tbody');

    // Navegação entre páginas
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();

            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            pages.forEach(page => page.classList.remove("active"));
            const targetPage = document.getElementById(`${link.dataset.page}-page`);
            if (targetPage) {
                targetPage.classList.add("active");
            }

            pageTitle.textContent = link.textContent.trim();
            loadPageData(targetPage);
        });
    });

    // Carregar dados conforme a página
    async function loadPageData(page) {
        if (!page) return;
        try {
            switch (page.id) {
                case 'books-page':
                    await loadBooks();
                    break;
                case 'loans-page':
                    await loadLoans();
                    break;
                case 'readers-page':
                    await loadReaders();
                    break;
                case 'dashboard-page':
                    await loadAdminStats();
                    break;
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }

    // Abrir modal de novo livro
    if (addBookBtn) {
        addBookBtn.addEventListener('click', () => {
            addBookModal.classList.add('active');
        });
    }

    // Fechar modal
    if (closeBookModal) {
        closeBookModal.addEventListener('click', () => {
            addBookModal.classList.remove('active');
            addBookForm.reset();
        });
    }

    // Submeter novo livro
    if (addBookForm) {
        addBookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addBookForm);

            try {
                await fetch(`${API_BASE_URL}/books`, {
                    method: 'POST',
                    body: formData
                });

                alert("Livro adicionado com sucesso!");
                addBookModal.classList.remove('active');
                addBookForm.reset();
                loadBooks();
            } catch (err) {
                console.error("Erro ao salvar livro:", err);
                alert("Erro ao salvar livro");
            }
        });
    }

    // Carregar lista de livros
    async function loadBooks() {
        if (!tbody) return;
        try {
            const books = await apiRequest('/books');

            if (!books || books.length === 0) {
                tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:10px;">
                        Nenhum livro encontrado
                    </td>
                </tr>`;
                return;
            }

            tbody.innerHTML = books.map(book => `
            <tr>
                <td>
                    ${book.cover_image
                    ? `<img src="${ORIGIN}${book.cover_image}" alt="Capa" style="width:50px;height:70px;object-fit:cover;">`
                    : '-'}
                </td>
                <td>${book.title}</td>
                <td>${book.author || '-'}</td>
                <td>${book.year || '-'}</td>
                <td>${book.category || '-'}</td>
                <td>${book.description ? book.description.substring(0, 50) + "..." : '-'}</td>
                <td>
                    ${book.pdf_file
                    ? `<a href="${ORIGIN}${book.pdf_file}" target="_blank">📕 Abrir</a>`
                    : '-'}
                </td>
                <td>
                    <button class="edit-btn" data-id="${book.id}">Editar</button>
                    <button class="delete-btn" data-id="${book.id}">Excluir</button>
                </td>
            </tr>
        `).join("");

            // Eventos de editar
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => editBook(btn.dataset.id));
            });

            // Eventos de excluir
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteBook(btn.dataset.id));
            });

        } catch (error) {
            console.error("Erro ao carregar livros:", error);
            tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:10px; color:red;">
                    Erro ao carregar livros
                </td>
            </tr>`;
        }
    }

    // Editar livro
    async function editBook(id) {
        const book = await apiRequest(`/books/${id}`);
        if (!book) return;

        document.getElementById('edit-book-id').value = book.id;
        document.getElementById('edit-book-title').value = book.title;
        document.getElementById('edit-book-author').value = book.author || '';
        document.getElementById('edit-book-year').value = book.year || '';
        document.getElementById('edit-book-category').value = book.category || '';
        document.getElementById('edit-book-description').value = book.description || '';

        document.getElementById('edit-book-modal').classList.add('active');
    }

    // Salvar edição
    document.getElementById('edit-book-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-book-id').value;
        const updatedBook = {
            title: document.getElementById('edit-book-title').value,
            author: document.getElementById('edit-book-author').value,
            year: document.getElementById('edit-book-year').value,
            category: document.getElementById('edit-book-category').value,
            description: document.getElementById('edit-book-description').value,
        };

        await apiRequest(`/books/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedBook)
        });

        alert("Livro atualizado com sucesso!");
        document.getElementById('edit-book-modal').classList.remove('active');
        loadBooks();
    });

    // Excluir livro
    async function deleteBook(id) {
        if (confirm("Deseja realmente excluir este livro?")) {
            await apiRequest(`/books/${id}`, { method: 'DELETE' });
            alert("Livro excluído com sucesso!");
            loadBooks();
        }
    }

    // Inicialização
    loadBooks();
    // Carregar estatísticas iniciais caso o dashboard esteja ativo
    if (document.getElementById('dashboard-page')?.classList.contains('active')) {
        loadAdminStats();
    }
    // Recarregar estatísticas a cada 60 segundos enquanto no dashboard
    let statsInterval = null;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && document.getElementById('dashboard-page')?.classList.contains('active')) {
            if (!statsInterval) statsInterval = setInterval(loadAdminStats, 60000);
        } else {
            if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
        }
    });
});

// Função para buscar e popular estatísticas no dashboard
async function loadAdminStats() {
    showSpinner(true);
    try {
        const stats = await apiRequest('/admin/stats');
        if (!stats) return;

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('stat-total-books', stats.total_books ?? 0);
        setText('stat-active-loans', stats.active_loans ?? 0);
        setText('stat-borrowed-books', stats.borrowed_books ?? 0);
        setText('stat-total-readers', stats.total_readers ?? 0);
        setText('stat-reservations', stats.reservations_count ?? 0);

        // Render top borrowed books list and chart
        const topBooks = Array.isArray(stats.top_borrowed_books) ? stats.top_borrowed_books : [];
        renderTopBooksList(topBooks);
        renderTopBooksChart(topBooks);

        // Render trends chart (loans and reservations)
        renderTrendsChart(stats.loans_trend || [], stats.reservations_by_day || []);

    } catch (err) {
        console.error('Erro ao carregar estatísticas do admin:', err);
    } finally {
        showSpinner(false);
    }
}

// Render list of top borrowed books
function renderTopBooksList(topBooks) {
    const list = document.getElementById('topBooksList');
    if (!list) return;
    if (!topBooks || topBooks.length === 0) {
        list.innerHTML = '<li>Nenhum registro</li>';
        return;
    }

    list.innerHTML = topBooks.map(b => `
        <li style="display:flex; gap:8px; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
            <div style="flex:1">
                <strong>${escapeHtml(b.title || '—')}</strong><br>
                <small>${escapeHtml(b.author || '')}</small>
            </div>
            <div style="min-width:60px; text-align:right">${b.times_borrowed}</div>
        </li>
    `).join('');
}

// Small helper escape for innerHTML usage
function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Chart instance reference
let topBooksChartInstance = null;
function renderTopBooksChart(topBooks) {
    const canvas = document.getElementById('topBooksChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = topBooks.map(b => b.title || '—');
    const data = topBooks.map(b => b.times_borrowed || 0);

    const ctx = canvas.getContext('2d');
    if (topBooksChartInstance) {
        topBooksChartInstance.data.labels = labels;
        topBooksChartInstance.data.datasets[0].data = data;
        topBooksChartInstance.update();
        return;
    }

    topBooksChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Vezes Emprestado',
                data,
                backgroundColor: 'rgba(255,130,0,0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Spinner utility
function showSpinner(show) {
    const sp = document.getElementById('stats-spinner');
    if (!sp) return;
    sp.style.display = show ? 'inline-block' : 'none';
}

// Helper to generate last N days labels and fill counts
function buildSeriesFromDays(rawRows, days = 14) {
    const result = [];
    const today = new Date();
    const map = {};
    (rawRows || []).forEach(r => {
        const d = new Date(r.day).toISOString().slice(0, 10);
        map[d] = (r.count != null) ? r.count : 0;
    });

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        result.push({ day: key, count: map[key] ? parseInt(map[key], 10) : 0 });
    }
    return result;
}

// Trends chart instance
let trendsChartInstance = null;
function renderTrendsChart(loansRaw, reservationsRaw) {
    if (typeof Chart === 'undefined') return;
    const loansSeries = buildSeriesFromDays(loansRaw, 14);
    const reservationsSeries = buildSeriesFromDays(reservationsRaw, 14);

    const labels = loansSeries.map(r => r.day);
    const loansData = loansSeries.map(r => r.count);
    const reservationsData = reservationsSeries.map(r => r.count);

    const canvas = document.getElementById('trendsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (trendsChartInstance) {
        trendsChartInstance.data.labels = labels;
        trendsChartInstance.data.datasets[0].data = loansData;
        trendsChartInstance.data.datasets[1].data = reservationsData;
        trendsChartInstance.update();
        return;
    }

    trendsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Empréstimos',
                    data: loansData,
                    borderColor: 'rgba(54,162,235,0.9)',
                    backgroundColor: 'rgba(54,162,235,0.2)',
                    tension: 0.2
                },
                {
                    label: 'Reservas',
                    data: reservationsData,
                    borderColor: 'rgba(255,130,0,0.9)',
                    backgroundColor: 'rgba(255,130,0,0.15)',
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Bind refresh button
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('refresh-stats-btn');
    if (btn) btn.addEventListener('click', () => loadAdminStats());
});
