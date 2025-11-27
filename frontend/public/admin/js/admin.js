// ================= CONFIGURAÇÃO GERAL =================
const API_BASE_URL = window.location.origin + '/api';

// Verificar autenticação
function checkAuth() {
    const token = localStorage.getItem('adminToken');

    if (!token) {
        console.log('Nenhum token encontrado, redirecionando para login...');
        redirectToLogin();
        return null;
    }

    // Verificar se o token é válido
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();

        if (isExpired) {
            console.log('Token expirado');
            localStorage.removeItem('adminToken');
            redirectToLogin();
            return null;
        }

        return token;
    } catch (error) {
        console.error('Token inválido:', error);
        localStorage.removeItem('adminToken');
        redirectToLogin();
        return null;
    }
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

// ================= FUNÇÃO GENÉRICA DE REQUISIÇÃO =================
async function apiRequest(endpoint, options = {}) {
    const token = checkAuth();
    if (!token) return null;

    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        ...options
    };

    // Para FormData, remover Content-Type para o browser definir
    if (options.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    try {
        const response = await fetch(url, config);

        if (response.status === 401 || response.status === 403) {
            console.log('Acesso não autorizado, redirecionando...');
            localStorage.removeItem('adminToken');
            redirectToLogin();
            return null;
        }

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (err) {
        console.error("Erro API:", err);
        alert("Erro na comunicação com o servidor: " + err.message);
        return null;
    }
}

// ================== MÓDULO PRINCIPAL ==================
document.addEventListener('DOMContentLoaded', function () {
    // Verificar autenticação ao carregar a página
    if (!checkAuth()) {
        return;
    }

    console.log('Usuário autenticado, carregando painel...');

    // Elementos principais
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page-content');
    const pageTitle = document.getElementById('page-title');
    const logoutBtn = document.getElementById('logout-btn');

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            if (confirm('Deseja realmente sair?')) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = 'login.html';
            }
        });
    }

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
                case 'readers-page':
                    await loadReaders();
                    break;
                case 'analytics-page':
                    await loadAnalytics();
                    break;
                case 'dashboard-page':
                    await loadAdminStats();
                    break;
                case 'access-page': // Nova página de gestão de acesso
                    await loadPendingReaders();
                    await loadApprovedReaders();
                    break;
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }

    // ================== MÓDULO DE LIVROS ==================
    const addBookBtn = document.getElementById('add-book-btn');
    const addBookModal = document.getElementById('add-book-modal');
    const closeBookModal = document.getElementById('close-book-modal');
    const cancelBookModal = document.getElementById('cancel-book-modal');
    const addBookForm = document.getElementById('add-book-form');
    const booksTbody = document.getElementById('books-tbody');

    // Modal de adicionar livro
    if (addBookBtn) {
        addBookBtn.addEventListener('click', () => {
            addBookModal.classList.add('active');
        });
    }

    // Fechar modal de adicionar livro
    [closeBookModal, cancelBookModal].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                addBookModal.classList.remove('active');
                addBookForm.reset();
            });
        }
    });

    // Fechar modal ao clicar fora
    document.addEventListener('click', (e) => {
        if (e.target === addBookModal) {
            addBookModal.classList.remove('active');
            addBookForm.reset();
        }
    });

    // Submeter novo livro
    if (addBookForm) {
        addBookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = addBookForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            try {
                submitBtn.textContent = 'Adicionando...';
                submitBtn.disabled = true;

                const formData = new FormData(addBookForm);

                const response = await fetch(`${API_BASE_URL}/books`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Erro ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    alert("Livro adicionado com sucesso!");
                    addBookModal.classList.remove('active');
                    addBookForm.reset();
                    await loadBooks();
                } else {
                    throw new Error(result.error || 'Erro ao adicionar livro');
                }
            } catch (err) {
                console.error("Erro ao salvar livro:", err);
                alert("Erro ao salvar livro: " + err.message);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Carregar lista de livros
    async function loadBooks() {
        if (!booksTbody) return;
        try {
            const books = await apiRequest('/books');

            if (!books || books.length === 0) {
                booksTbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:20px;">
                        Nenhum livro encontrado
                    </td>
                </tr>`;
                return;
            }

            // Usar a origem da API (localhost:3000) em vez da origem atual
            const API_ORIGIN = 'http://localhost:3000';

            booksTbody.innerHTML = books.map(book => `
            <tr>
                <td>
                    ${book.cover_image
                    ? `<img src="${API_ORIGIN}${book.cover_image}" 
                          alt="Capa de ${escapeHtml(book.title)}" 
                          style="width:50px;height:70px;object-fit:cover;border-radius:4px;"
                          onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\"width:50px;height:70px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:20px;\"></div>`
                    : '<div style="width:50px;height:70px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:20px;">📚</div>'}
                </td>
                <td><strong>${escapeHtml(book.title)}</strong></td>
                <td>${escapeHtml(book.author || '-')}</td>
                <td>${book.year || '-'}</td>
                <td>${escapeHtml(book.category || '-')}</td>
                <td title="${escapeHtml(book.description || '')}">
                    ${book.description ? escapeHtml(book.description.substring(0, 50) + (book.description.length > 50 ? "..." : "")) : '-'}
                </td>
                <td>
                    ${book.pdf_file
                    ? `<a href="${API_ORIGIN}${book.pdf_file}" target="_blank" class="pdf-link">📕 PDF</a>`
                    : '-'}
                </td>
                <td>
                    <button class="btn-edit" data-id="${book.id}">Editar</button>
                    <button class="btn-delete" data-id="${book.id}">Excluir</button>
                </td>
            </tr>
        `).join("");

            // Eventos de editar
            document.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('click', () => editBook(btn.dataset.id));
            });

            // Eventos de excluir
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', () => deleteBook(btn.dataset.id));
            });

        } catch (error) {
            console.error("Erro ao carregar livros:", error);
            booksTbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:20px; color:red;">
                    Erro ao carregar livros
                </td>
            </tr>`;
        }
    }

    // Inicialização
    loadBooks();
    if (document.getElementById('dashboard-page')?.classList.contains('active')) {
        loadAdminStats();
    }
});

// ================== FUNÇÕES DE LIVROS ==================
async function editBook(id) {
    try {
        const book = await apiRequest(`/books/${id}`);
        if (!book) return;

        // Preencher formulário de edição
        document.getElementById('edit-book-id').value = book.id;
        document.getElementById('edit-book-title').value = book.title;
        document.getElementById('edit-book-author').value = book.author || '';
        document.getElementById('edit-book-publisher').value = book.publisher || '';
        document.getElementById('edit-book-year').value = book.year || '';
        document.getElementById('edit-book-isbn').value = book.isbn || '';
        document.getElementById('edit-book-category').value = book.category || '';
        document.getElementById('edit-book-description').value = book.description || '';
        document.getElementById('edit-book-total-copies').value = book.total_copies || 1;

        // Mostrar modal
        document.getElementById('edit-book-modal').classList.add('active');

        // Configurar eventos do modal de edição
        setupEditModalEvents();
    } catch (error) {
        console.error('Erro ao carregar livro para edição:', error);
        alert('Erro ao carregar dados do livro');
    }
}

function setupEditModalEvents() {
    const editModal = document.getElementById('edit-book-modal');
    const closeEditBtn = document.getElementById('close-edit-modal');
    const cancelEditBtn = document.getElementById('cancel-edit-modal');
    const editForm = document.getElementById('edit-book-form');

    // Fechar modal
    const closeEditModal = () => {
        editModal.classList.remove('active');
    };

    [closeEditBtn, cancelEditBtn].forEach(btn => {
        btn.addEventListener('click', closeEditModal);
    });

    // Fechar ao clicar fora
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });

    // Submeter edição
    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            await submitEditBook();
        };
    }
}

async function submitEditBook() {
    const id = document.getElementById('edit-book-id').value;
    const submitBtn = document.querySelector('#edit-book-form button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.textContent = 'Salvando...';
        submitBtn.disabled = true;

        const updatedBook = {
            title: document.getElementById('edit-book-title').value,
            author: document.getElementById('edit-book-author').value,
            publisher: document.getElementById('edit-book-publisher').value,
            year: document.getElementById('edit-book-year').value,
            isbn: document.getElementById('edit-book-isbn').value,
            category: document.getElementById('edit-book-category').value,
            description: document.getElementById('edit-book-description').value,
            total_copies: document.getElementById('edit-book-total-copies').value
        };

        const result = await apiRequest(`/books/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedBook)
        });

        if (result) {
            alert("Livro atualizado com sucesso!");
            document.getElementById('edit-book-modal').classList.remove('active');
            // Recarregar a lista de livros
            await loadBooks();
        }
    } catch (error) {
        console.error('Erro ao atualizar livro:', error);
        alert('Erro ao atualizar livro: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteBook(id) {
    if (!confirm("Tem certeza que deseja excluir este livro?")) {
        return;
    }

    try {
        const result = await apiRequest(`/books/${id}`, {
            method: 'DELETE'
        });

        if (result) {
            alert("Livro excluído com sucesso!");
            // Recarregar a lista de livros
            await loadBooks();
        }
    } catch (error) {
        console.error('Erro ao excluir livro:', error);
        alert('Erro ao excluir livro: ' + error.message);
    }
}

// ================== MÓDULO DE GESTÃO DE ACESSO ==================
async function loadPendingReaders() {
    const pendingReadersTbody = document.getElementById('pending-readers-tbody');
    if (!pendingReadersTbody) return;

    try {
        const readers = await apiRequest('/admin/pending-readers');

        if (!readers || readers.length === 0) {
            pendingReadersTbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:20px;">
                        Nenhum utilizador pendente de aprovação
                    </td>
                </tr>`;
            return;
        }

        pendingReadersTbody.innerHTML = readers.map(reader => `
            <tr>
                <td><strong>${escapeHtml(reader.full_name)}</strong></td>
                <td>${escapeHtml(reader.username)}</td>
                <td>${escapeHtml(reader.email)}</td>
                <td>${escapeHtml(reader.phone || '-')}</td>
                <td>${escapeHtml(reader.address || '-')}</td>
                <td>${new Date(reader.created_at).toLocaleDateString('pt-BR')}</td>
                <td>
                    <button class="btn-approve" data-id="${reader.id}">Aprovar</button>
                    <button class="btn-reject" data-id="${reader.id}">Rejeitar</button>
                </td>
            </tr>
        `).join('');

        // Eventos dos botões
        document.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', () => approveReader(btn.dataset.id));
        });

        document.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', () => rejectReader(btn.dataset.id));
        });

    } catch (error) {
        console.error('Erro ao carregar utilizadores pendentes:', error);
        pendingReadersTbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px; color:red;">
                    Erro ao carregar utilizadores pendentes
                </td>
            </tr>`;
    }
}

// Carregar utilizadores aprovados
async function loadApprovedReaders() {
    const approvedReadersTbody = document.getElementById('approved-readers-tbody');
    if (!approvedReadersTbody) return;

    try {
        const readers = await apiRequest('/admin/approved-readers');

        if (!readers || readers.length === 0) {
            approvedReadersTbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:20px;">
                        Nenhum utilizador aprovado
                    </td>
                </tr>`;
            return;
        }

        approvedReadersTbody.innerHTML = readers.map(reader => `
            <tr>
                <td><strong>${escapeHtml(reader.full_name)}</strong></td>
                <td>${escapeHtml(reader.username)}</td>
                <td>${escapeHtml(reader.email)}</td>
                <td>${escapeHtml(reader.phone || '-')}</td>
                <td>${escapeHtml(reader.address || '-')}</td>
                <td>${new Date(reader.created_at).toLocaleDateString('pt-BR')}</td>
                <td>${reader.approved_at ? new Date(reader.approved_at).toLocaleDateString('pt-BR') : '-'}</td>
                <td>
                    <button class="btn-suspend" data-id="${reader.id}">Suspender</button>
                </td>
            </tr>
        `).join('');

        // Eventos dos botões de suspensão
        document.querySelectorAll('.btn-suspend').forEach(btn => {
            btn.addEventListener('click', () => suspendReader(btn.dataset.id));
        });

    } catch (error) {
        console.error('Erro ao carregar utilizadores aprovados:', error);
        approvedReadersTbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:20px; color:red;">
                    Erro ao carregar utilizadores aprovados
                </td>
            </tr>`;
    }
}

// Função para aprovar utilizador
async function approveReader(readerId) {
    if (!confirm('Tem certeza que deseja aprovar este utilizador?')) {
        return;
    }

    try {
        const result = await apiRequest(`/admin/readers/${readerId}/approve`, {
            method: 'PUT'
        });

        if (result) {
            alert('Utilizador aprovado com sucesso!');
            await loadPendingReaders();
            await loadApprovedReaders();
        }
    } catch (error) {
        console.error('Erro ao aprovar utilizador:', error);
        alert('Erro ao aprovar utilizador: ' + error.message);
    }
}

// Função para rejeitar utilizador
async function rejectReader(readerId) {
    if (!confirm('Tem certeza que deseja rejeitar este utilizador? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        const result = await apiRequest(`/admin/readers/${readerId}/reject`, {
            method: 'PUT'
        });

        if (result) {
            alert('Utilizador rejeitado com sucesso!');
            await loadPendingReaders();
        }
    } catch (error) {
        console.error('Erro ao rejeitar utilizador:', error);
        alert('Erro ao rejeitar utilizador: ' + error.message);
    }
}

// Função para suspender utilizador
async function suspendReader(readerId) {
    if (!confirm('Tem certeza que deseja suspender o acesso deste utilizador?')) {
        return;
    }

    try {
        const result = await apiRequest(`/admin/readers/${readerId}/suspend`, {
            method: 'PUT'
        });

        if (result) {
            alert('Acesso do utilizador suspenso!');
            await loadApprovedReaders();
            await loadPendingReaders();
        }
    } catch (error) {
        console.error('Erro ao suspender utilizador:', error);
        alert('Erro ao suspender utilizador: ' + error.message);
    }
}

// ================== MÓDULO DE LEITORES ==================
async function loadReaders() {
    const readersTbody = document.getElementById('readers-tbody');
    if (!readersTbody) return;

    try {
        const readers = await apiRequest('/readers');

        if (!readers || readers.length === 0) {
            readersTbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px;">
                    Nenhum leitor encontrado
                </td>
            </tr>`;
            return;
        }

        readersTbody.innerHTML = readers.map(reader => `
            <tr>
                <td><strong>${escapeHtml(reader.full_name)}</strong></td>
                <td>${escapeHtml(reader.email)}</td>
                <td>${escapeHtml(reader.phone || '-')}</td>
                <td>${escapeHtml(reader.address || '-')}</td>
                <td>${new Date(reader.created_at).toLocaleDateString('pt-BR')}</td>
                <td>
                    <span class="status-badge ${reader.is_approved ? 'active' : 'inactive'}">
                        ${reader.is_approved ? 'Aprovado' : 'Pendente'}
                    </span>
                </td>
                <td>
                    ${!reader.is_approved ? 
                        `<button class="btn-approve" data-id="${reader.id}">Aprovar</button>` : 
                        `<button class="btn-suspend" data-id="${reader.id}">Suspender</button>`
                    }
                </td>
            </tr>
        `).join('');

        // Adicionar eventos aos botões
        document.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', () => approveReader(btn.dataset.id));
        });

        document.querySelectorAll('.btn-suspend').forEach(btn => {
            btn.addEventListener('click', () => suspendReader(btn.dataset.id));
        });

    } catch (error) {
        console.error('Erro ao carregar leitores:', error);
        readersTbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:20px; color:red;">
                Erro ao carregar leitores
            </td>
        </tr>`;
    }
}

// ================== MÓDULO DE ANALYTICS ==================
async function loadAnalytics() {
    try {
        const stats = await apiRequest('/admin/stats');
        if (!stats) return;

        // Carregar gráfico de categorias
        await loadCategoryChart();

        // Carregar lista de livros populares
        loadPopularBooks(stats.top_borrowed_books || []);

    } catch (error) {
        console.error('Erro ao carregar analytics:', error);
    }
}

async function loadCategoryChart() {
    try {
        const books = await apiRequest('/books');
        if (!books) return;

        const categories = {};
        books.forEach(book => {
            const category = book.category || 'Sem Categoria';
            categories[category] = (categories[category] || 0) + 1;
        });

        const ctx = document.getElementById('categoryChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

    } catch (error) {
        console.error('Erro ao carregar gráfico de categorias:', error);
    }
}

function loadPopularBooks(books) {
    const container = document.getElementById('popular-books-list');
    if (!container) return;

    if (!books || books.length === 0) {
        container.innerHTML = '<p style="padding:20px; text-align:center; color:#666;">Nenhum dado disponível</p>';
        return;
    }

    container.innerHTML = books.map((book, index) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
            <div>
                <strong>${index + 1}. ${escapeHtml(book.title)}</strong>
                <div style="font-size:0.9em; color:#666;">${escapeHtml(book.author)}</div>
            </div>
            <span style="background:#ff8200; color:white; padding:4px 8px; border-radius:12px; font-size:0.8em;">
                ${book.times_borrowed} empréstimos
            </span>
        </div>
    `).join('');
}

// ================== DASHBOARD FUNCTIONS ==================
async function loadAdminStats() {
    showSpinner(true);
    try {
        const stats = await apiRequest('/admin/stats');
        if (!stats) return;

        // Atualizar estatísticas
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('stat-total-books', stats.total_books ?? 0);
        setText('stat-active-loans', stats.active_loans ?? 0);
        setText('stat-borrowed-books', stats.borrowed_books ?? 0);
        setText('stat-total-readers', stats.total_readers ?? 0);
        setText('stat-reservations', stats.reservations_count ?? 0);
        
        // Nova estatística: utilizadores pendentes
        if (document.getElementById('stat-pending-readers')) {
            setText('stat-pending-readers', stats.pending_readers ?? 0);
        }

        // Render gráficos
        const topBooks = Array.isArray(stats.top_borrowed_books) ? stats.top_borrowed_books : [];
        renderTopBooksList(topBooks);
        renderTopBooksChart(topBooks);
        renderTrendsChart(stats.loans_trend || [], stats.reservations_by_day || []);

    } catch (err) {
        console.error('Erro ao carregar estatísticas do admin:', err);
    } finally {
        showSpinner(false);
    }
}

function renderTopBooksList(topBooks) {
    const list = document.getElementById('topBooksList');
    if (!list) return;

    if (!topBooks || topBooks.length === 0) {
        list.innerHTML = '<li style="padding:10px; text-align:center; color:#666;">Nenhum dado disponível</li>';
        return;
    }

    list.innerHTML = topBooks.map((b, index) => `
        <li style="display:flex; gap:12px; align-items:center; padding:12px 0; border-bottom:1px solid #eee;">
            <div style="font-weight:bold; color:#ff8200; min-width:20px;">${index + 1}</div>
            <div style="flex:1">
                <strong style="display:block; margin-bottom:4px;">${escapeHtml(b.title || '—')}</strong>
                <small style="color:#666;">${escapeHtml(b.author || '')}</small>
            </div>
            <div style="background:#f0f0f0; padding:4px 8px; border-radius:12px; font-size:0.8em;">
                ${b.times_borrowed || 0} empréstimos
            </div>
        </li>
    `).join('');
}

let topBooksChartInstance = null;
function renderTopBooksChart(topBooks) {
    const canvas = document.getElementById('topBooksChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = topBooks.map(b => {
        const title = b.title || '—';
        return title.length > 20 ? title.substring(0, 20) + '...' : title;
    });
    const data = topBooks.map(b => b.times_borrowed || 0);

    const ctx = canvas.getContext('2d');

    if (topBooksChartInstance) {
        topBooksChartInstance.destroy();
    }

    topBooksChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Vezes Emprestado',
                data,
                backgroundColor: 'rgba(255,130,0,0.8)',
                borderColor: 'rgba(255,130,0,1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

let trendsChartInstance = null;
function renderTrendsChart(loansRaw, reservationsRaw) {
    if (typeof Chart === 'undefined') return;

    const loansSeries = buildSeriesFromDays(loansRaw, 14);
    const reservationsSeries = buildSeriesFromDays(reservationsRaw, 14);

    const labels = loansSeries.map(r => {
        const date = new Date(r.day);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    const loansData = loansSeries.map(r => r.count);
    const reservationsData = reservationsSeries.map(r => r.count);

    const canvas = document.getElementById('trendsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (trendsChartInstance) {
        trendsChartInstance.destroy();
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
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Reservas',
                    data: reservationsData,
                    borderColor: 'rgba(255,130,0,0.9)',
                    backgroundColor: 'rgba(255,130,0,0.15)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ================== UTILITY FUNCTIONS ==================
function showSpinner(show) {
    const sp = document.getElementById('stats-spinner');
    if (!sp) return;
    sp.style.display = show ? 'inline-block' : 'none';
}

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

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ================== EVENT LISTENERS GLOBAIS ==================
document.addEventListener('DOMContentLoaded', function () {
    loadAdminProfile();
    // Botão de atualizar estatísticas
    const refreshBtn = document.getElementById('refresh-stats-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            loadAdminStats();
        });
    }
});

// Carregar estatísticas a cada 60 segundos se no dashboard
let statsInterval = null;
document.addEventListener('visibilitychange', function () {
    const dashboardPage = document.getElementById('dashboard-page');
    if (document.visibilityState === 'visible' && dashboardPage?.classList.contains('active')) {
        if (!statsInterval) {
            statsInterval = setInterval(loadAdminStats, 60000);
        }
    } else {
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
    }
});

// ====================
// FUNÇÃO PARA CARREGAR INFORMAÇÕES DO USUÁRIO LOGADO
// ====================
async function loadAdminProfile() {
    try {
        const response = await fetch('/api/admin/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                // Atualizar o nome do admin no header
                const adminNameElement = document.querySelector('.admin-profile span');
                if (adminNameElement) {
                    // Usar o full_name se disponível, caso contrário usar username
                    adminNameElement.textContent = data.user.full_name || data.user.username || 'Admin';
                }

                // Opcional: salvar informações do usuário para uso posterior
                localStorage.setItem('adminUser', JSON.stringify(data.user));

                return data.user;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar perfil do admin:', error);
    }

    // Fallback: usar informações do localStorage se disponível
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            const adminNameElement = document.querySelector('.admin-profile span');
            if (adminNameElement) {
                adminNameElement.textContent = user.full_name || user.username || 'Admin';
            }
            return user;
        } catch (e) {
            console.error('Erro ao parsear usuário salvo:', e);
        }
    }

    return null;
}