// Configurações globais
const API_BASE_URL = window.location.origin + '/api';
let userToken = localStorage.getItem('userToken');
let userData = JSON.parse(localStorage.getItem('userData') || 'null');

// Estado da aplicação
let discussions = [];
let filteredDiscussions = [];
let currentPage = 1;
const discussionsPerPage = 8;
let currentTab = 'recent';
let currentCategory = 'all';
let currentDiscussionId = null;

// Elementos DOM
const discussionsList = document.getElementById('discussionsList');
const searchInput = document.getElementById('searchInput');
const createDiscussionBtn = document.getElementById('createDiscussionBtn');
const createDiscussionModal = document.getElementById('createDiscussionModal');
const discussionModal = document.getElementById('discussionModal');
const discussionForm = document.getElementById('discussionForm');
const closeModal = document.getElementById('closeModal');
const cancelDiscussion = document.getElementById('cancelDiscussion');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const tabButtons = document.querySelectorAll('.tab-btn');
const discussionTitle = document.getElementById('discussionTitle');
const discussionContent = document.getElementById('discussionContent');
const titleCount = document.getElementById('titleCount');
const contentCount = document.getElementById('contentCount');
const submitDiscussion = document.getElementById('submitDiscussion');

// API functions
const communityAPI = {
    async getDiscussions(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/community/discussions?${queryString}`);
        if (!response.ok) throw new Error('Erro ao buscar discussões');
        return await response.json();
    },

    async getDiscussion(id) {
        const response = await fetch(`${API_BASE_URL}/community/discussions/${id}`);
        if (!response.ok) throw new Error('Erro ao buscar discussão');
        return await response.json();
    },

    async createDiscussion(discussionData) {
        const response = await fetch(`${API_BASE_URL}/community/discussions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify(discussionData)
        });
        if (!response.ok) throw new Error('Erro ao criar discussão');
        return await response.json();
    },

    async addComment(discussionId, content) {
        const response = await fetch(`${API_BASE_URL}/community/discussions/${discussionId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ content })
        });
        if (!response.ok) throw new Error('Erro ao adicionar comentário');
        return await response.json();
    },

    async toggleLike(discussionId) {
        const response = await fetch(`${API_BASE_URL}/community/discussions/${discussionId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });
        if (!response.ok) throw new Error('Erro ao curtir discussão');
        return await response.json();
    },

    async getStats() {
        const response = await fetch(`${API_BASE_URL}/community/stats`);
        if (!response.ok) throw new Error('Erro ao buscar estatísticas');
        return await response.json();
    },

    async updateOnlineStatus(isOnline) {
        try {
            const response = await fetch(`${API_BASE_URL}/community/users/online`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({ isOnline })          
            });

            if (!response.ok) {
                // Não lançar erro para status online, apenas logar
                console.log('Erro ao atualizar status online (não crítico):', response.status);
                return { success: false, error: 'Erro não crítico' };
            }

            return await response.json();
        } catch (error) {
            // Não lançar erro para falhas de conexão em status online
            console.log('Erro de conexão ao atualizar status online (ignorado):', error);
            return { success: false, error: 'Erro de conexão' };
        }
    }

};


// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    // Configurar logo click
    const logo = document.querySelector(".logo");
    if (logo) {
        logo.addEventListener('click', () => {
            window.location.href = "index.html";
        });
    }

    initializeCommunity();
    setupEventListeners();
    loadData();
    updateStatistics();

    // Atualizar status online do usuário
    if (userData) {
        communityAPI.updateOnlineStatus(true);
    }
});

// Atualizar status quando o usuário sair
window.addEventListener('beforeunload', function () {
    if (userData) {
        // Usar sendBeacon para garantir que a requisição seja enviada mesmo ao sair da página
        const data = JSON.stringify({ isOnline: false });
        navigator.sendBeacon(`${API_BASE_URL}/community/users/online`, data);
    }
});

// FUNÇÕES DE AUTENTICAÇÃO
function isUserLoggedIn() {
    return userToken && userData;
}

function loadUserActions() {
    const container = document.getElementById('userActions');
    if (!container) return;

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
            avatarHtml = `<div title="Meu perfil" class="w-10 h-10 rounded-full bg-center bg-cover border-2 border-[#ff8200] cursor-pointer hover:scale-105 transition-transform" style="background-image: url('${userData.avatar}');"></div>`;
        } else {
            const initial = userData.full_name ? userData.full_name[0].toUpperCase() : (userData.username ? userData.username[0].toUpperCase() : 'U');
            avatarHtml = `<div title="Meu perfil" class="w-10 h-10 rounded-full bg-[#ff8200] text-white flex items-center justify-center font-bold text-lg border-2 border-[#ff8200] cursor-pointer hover:scale-105 transition-transform">${initial}</div>`;
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

function logout() {
    // Usar fetch sync para garantir que a requisição seja completada
    if (userData) {
        // Criar uma requisição síncrona para garantir o envio
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${API_BASE_URL}/community/users/online`, false); // false = sync
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${userToken}`);
        xhr.send(JSON.stringify({ isOnline: false }));
    }

    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    userToken = null;
    userData = null;
    window.location.reload();
}

// Remover o event listener problemático do beforeunload e substituir por:
window.addEventListener('beforeunload', function () {
    if (userData) {
        // Usar fetch com keepalive para requisições antes de sair da página
        fetch(`${API_BASE_URL}/community/users/online`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({ isOnline: false }),
            keepalive: true // Esta opção garante que a requisição continue mesmo após a página fechar
        }).catch(error => {
            console.log('Erro ao atualizar status offline (ignorado):', error);
        });
    }
});

// Adicionar também para visibility change (quando a aba é minimizada/alterada)
document.addEventListener('visibilitychange', function () {
    if (userData) {
        if (document.visibilityState === 'hidden') {
            // Página não está mais visível
            fetch(`${API_BASE_URL}/community/users/online`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({ isOnline: false }),
                keepalive: true
            }).catch(console.error);
        } else {
            // Página voltou a ser visível
            communityAPI.updateOnlineStatus(true).catch(console.error);
        }
    }
});

function initializeCommunity() {
    loadUserActions();

    // Atualizar status online do usuário
    if (userData) {
        // Pequeno delay para garantir que a página carregou completamente
        setTimeout(() => {
            communityAPI.updateOnlineStatus(true).catch(error => {
                console.log('Erro ao atualizar status online:', error);
            });
        }, 1000);
    }
}

// FUNÇÕES DA COMUNIDADE
function setupEventListeners() {
    // Modal criar discussão
    if (createDiscussionBtn) createDiscussionBtn.addEventListener('click', toggleCreateDiscussionModal);
    if (closeModal) closeModal.addEventListener('click', toggleCreateDiscussionModal);
    if (cancelDiscussion) cancelDiscussion.addEventListener('click', toggleCreateDiscussionModal);

    // Formulário de discussão
    if (discussionForm) discussionForm.addEventListener('submit', handleCreateDiscussion);
    if (discussionTitle) discussionTitle.addEventListener('input', updateCharacterCounts);
    if (discussionContent) discussionContent.addEventListener('input', updateCharacterCounts);

    // Pesquisa
    if (searchInput) searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Abas
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Carregar mais
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreDiscussions);

    // Fechar modais com ESC e clique fora
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            createDiscussionModal.classList.add('hidden');
            discussionModal.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target === createDiscussionModal) createDiscussionModal.classList.add('hidden');
        if (e.target === discussionModal) discussionModal.classList.add('hidden');
    });
}

async function loadData() {
    try {
        // Limpar parâmetros undefined
        const params = {
            page: currentPage,
            limit: discussionsPerPage,
            ...(currentCategory !== 'all' && currentCategory !== 'undefined' && { category: currentCategory }),
            tab: currentTab,
            ...(searchInput?.value && { search: searchInput.value })
        };

        console.log('Carregando dados com parâmetros:', params);

        const data = await communityAPI.getDiscussions(params);
        discussions = data.discussions;
        filteredDiscussions = data.discussions;

        renderDiscussions();
        updateLoadMoreButton(data.total, data.page, data.totalPages);
        renderCategories();

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showNotification('Erro ao carregar discussões', 'error');
    }
}

function updateLoadMoreButton(total, page, totalPages) {
    if (!loadMoreBtn) return;

    const hasMore = page < totalPages;
    loadMoreBtn.classList.toggle('hidden', !hasMore);

    if (hasMore) {
        loadMoreBtn.innerHTML = `Carregar mais (${total - (page * discussionsPerPage)} restantes)`;
    }
}

function renderDiscussions() {
    if (!discussionsList) return;

    if (discussions.length === 0) {
        discussionsList.innerHTML = `
          <div class="text-center py-12">
            <div class="text-6xl mb-4">📚</div>
            <p class="text-gray-600 text-lg">Nenhuma discussão encontrada</p>
            <p class="text-gray-500 mt-2">Seja o primeiro a iniciar uma conversa!</p>
            ${isUserLoggedIn() ? `
              <button onclick="toggleCreateDiscussionModal()" 
                      class="mt-4 bg-[#ff8200] text-white px-6 py-3 rounded-lg hover:bg-[#d67a32] transition-colors">
                Criar Primeira Discussão
              </button>
            ` : ''}
          </div>
        `;
        return;
    }

    discussionsList.innerHTML = discussions.map(discussion => {
        const isLiked = discussion.user_liked || false;
        const authorName = discussion.author_name || discussion.author_username || 'Utilizador';
        const authorInitials = getInitials(authorName);

        return `
          <div class="discussion-card bg-white rounded-lg p-6 shadow-sm fade-in">
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1 pr-4 cursor-pointer" onclick="openDiscussionModal(${discussion.id})">
                <h3 class="font-semibold text-[#1b130d] text-lg mb-1">${discussion.title}</h3>
                <p class="text-gray-600 line-clamp-2">${discussion.content}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="bg-[#f3ece7] text-[#9a6c4c] text-xs px-2 py-1 rounded-full">
                  ${getCategoryName(discussion.category)}
                </span>
                ${!discussion.is_answered ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Sem resposta</span>' : ''}
              </div>
            </div>
            
            <div class="flex justify-between items-center text-sm text-gray-500">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <div class="user-avatar relative">
                    ${authorInitials}
                    <div class="online-indicator"></div>
                  </div>
                  <span>${authorName}</span>
                </div>
                <span>${formatDate(discussion.created_at)}</span>
              </div>
              <div class="flex items-center gap-4">
                <button class="like-btn flex items-center gap-1 ${isLiked ? 'liked' : ''}" 
                        onclick="toggleLike(${discussion.id})"
                        ${!isUserLoggedIn() ? 'disabled' : ''}>
                  <svg width="16" height="16" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  ${discussion.likes || 0}
                </button>
                <div class="flex items-center gap-1 cursor-pointer" onclick="openDiscussionModal(${discussion.id})">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  ${discussion.comments_count || 0}
                </div>
                <div class="flex items-center gap-1">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  ${discussion.views || 0}
                </div>
              </div>
            </div>
          </div>
        `;
    }).join('');
}

function renderCategories() {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;

    // Contar discussões por categoria
    const categoryCounts = discussions.reduce((acc, discussion) => {
        acc[discussion.category] = (acc[discussion.category] || 0) + 1;
        return acc;
    }, {});

    const totalCount = discussions.length;

    const categories = [
        { id: 'all', name: 'Todas', count: totalCount },
        { id: 'geral', name: 'Geral', count: categoryCounts.geral || 0 },
        { id: 'ficcao', name: 'Ficção', count: categoryCounts.ficcao || 0 },
        { id: 'nao-ficcao', name: 'Não-Ficção', count: categoryCounts['nao-ficcao'] || 0 },
        { id: 'autoajuda', name: 'Autoajuda', count: categoryCounts.autoajuda || 0 },
        { id: 'negocios', name: 'Negócios', count: categoryCounts.negocios || 0 },
        { id: 'tecnologia', name: 'Tecnologia', count: categoryCounts.tecnologia || 0 }
    ];

    categoriesList.innerHTML = categories.map(cat => `
        <button class="category-btn w-full text-left py-2 px-3 rounded-lg hover:bg-[#f3ece7] transition-colors flex justify-between items-center ${currentCategory === cat.id ? 'bg-[#f3ece7] text-[#ff8200]' : ''}"
                onclick="filterByCategory('${cat.id}')">
          <span>${cat.name}</span>
          <span class="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">${cat.count}</span>
        </button>
      `).join('');
}

async function renderActiveMembers() {
    const activeMembers = document.getElementById('activeMembers');
    if (!activeMembers) return;

    try {
        const stats = await communityAPI.getStats();
        const onlineMembers = stats.activeMembers?.filter(m => m.is_online) || [];

        activeMembers.innerHTML = onlineMembers.slice(0, 5).map(member => `
            <div class="flex items-center gap-3">
              <div class="user-avatar relative">
                ${getInitials(member.full_name || member.username)}
                <div class="online-indicator"></div>
              </div>
              <div class="flex-1">
                <div class="font-medium text-sm">${member.full_name || member.username}</div>
                <div class="text-xs text-gray-500">Online</div>
              </div>
            </div>
          `).join('');

        if (onlineMembers.length === 0) {
            activeMembers.innerHTML = '<p class="text-gray-500 text-sm">Nenhum membro online</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar membros ativos:', error);
        activeMembers.innerHTML = '<p class="text-gray-500 text-sm">Erro ao carregar membros</p>';
    }
}

function toggleCreateDiscussionModal() {
    if (!userData) {
        showNotification('Por favor, faça login para criar uma discussão.', 'error');
        return;
    }
    createDiscussionModal.classList.toggle('hidden');
    if (!createDiscussionModal.classList.contains('hidden')) {
        discussionTitle.focus();
    }
}

function updateCharacterCounts() {
    if (!titleCount || !contentCount) return;

    titleCount.textContent = discussionTitle.value.length;
    contentCount.textContent = discussionContent.value.length;

    // Validar em tempo real
    const isTitleValid = discussionTitle.value.length >= 10 && discussionTitle.value.length <= 100;
    const isContentValid = discussionContent.value.length >= 20 && discussionContent.value.length <= 1000;

    if (submitDiscussion) {
        submitDiscussion.disabled = !isTitleValid || !isContentValid;
    }
}

async function handleCreateDiscussion(e) {
    e.preventDefault();

    const title = discussionTitle.value.trim();
    const category = document.getElementById('discussionCategory').value;
    const content = discussionContent.value.trim();

    try {
        await communityAPI.createDiscussion({ title, content, category });

        // Recarregar dados
        await loadData();
        await updateStatistics();

        // Reset form and close modal
        discussionForm.reset();
        updateCharacterCounts();
        createDiscussionModal.classList.add('hidden');

        showNotification('Discussão criada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao criar discussão:', error);
        showNotification('Erro ao criar discussão', 'error');
    }
}

async function openDiscussionModal(discussionId) {
    try {
        const data = await communityAPI.getDiscussion(discussionId);
        currentDiscussionId = discussionId;

        // Renderizar modal com os dados
        renderDiscussionModal(data.discussion, data.comments);
        discussionModal.classList.remove('hidden');

    } catch (error) {
        console.error('Erro ao abrir discussão:', error);
        showNotification('Erro ao carregar discussão', 'error');
    }
}

function renderDiscussionModal(discussion, comments) {
    const modalContent = document.getElementById('discussionModalContent');
    if (!modalContent) return;

    const authorName = discussion.author_name || discussion.author_username || 'Utilizador';
    const authorInitials = getInitials(authorName);
    const isLiked = discussion.user_liked || false;

    modalContent.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-[#1b130d]">${discussion.title}</h3>
          <button onclick="discussionModal.classList.add('hidden')" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-3 mb-3">
            <div class="user-avatar">${authorInitials}</div>
            <div>
              <div class="font-medium">${authorName}</div>
              <div class="text-sm text-gray-500">${formatDate(discussion.created_at)} • ${discussion.views || 0} visualizações</div>
            </div>
          </div>
          <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">${discussion.content}</p>
          
          <div class="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <button class="like-btn flex items-center gap-1 ${isLiked ? 'liked' : ''}" 
                    onclick="toggleLike(${discussion.id})"
                    ${!userData ? 'disabled' : ''}>
              <svg width="20" height="20" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              ${discussion.likes || 0}
            </button>
            <div class="flex items-center gap-1 text-gray-600">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              ${comments.length} comentários
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="font-semibold text-[#1b130d]">Comentários (${comments.length})</h4>
          
          <!-- Área de comentário -->
          ${userData ? `
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <textarea id="commentText" placeholder="Escreva seu comentário..." 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff8200] focus:border-transparent mb-3"
                        rows="3" maxlength="500"></textarea>
              <div class="flex justify-between items-center">
                <div class="text-xs text-gray-500"><span id="commentCount">0</span>/500</div>
                <button onclick="addComment()" 
                        class="px-4 py-2 bg-[#ff8200] text-white rounded-lg hover:bg-[#d67a32] transition-colors">
                  Comentar
                </button>
              </div>
            </div>
          ` : `
            <div class="text-center py-4 text-gray-500 border border-gray-200 rounded-lg">
              <a href="login.html" class="text-[#ff8200] hover:underline font-medium">Faça login</a> para participar da discussão
            </div>
          `}
          
          <!-- Lista de comentários -->
          <div class="space-y-3" id="commentsList">
            ${comments.length === 0 ? `
              <div class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">💬</div>
                <p>Seja o primeiro a comentar!</p>
              </div>
            ` : comments.map(comment => {
        const commentAuthorName = comment.author_name || comment.author_username || 'Utilizador';
        const commentAuthorInitials = getInitials(commentAuthorName);
        return `
                <div class="comment bg-gray-50 rounded-lg p-4">
                  <div class="flex items-center gap-3 mb-2">
                    <div class="user-avatar">${commentAuthorInitials}</div>
                    <div>
                      <div class="font-medium">${commentAuthorName}</div>
                      <div class="text-sm text-gray-500">${formatDate(comment.created_at)}</div>
                    </div>
                  </div>
                  <p class="text-gray-700 whitespace-pre-wrap">${comment.content}</p>
                </div>
              `;
    }).join('')}
          </div>
        </div>
      `;

    // Configurar contador de caracteres para comentário
    const commentText = document.getElementById('commentText');
    const commentCount = document.getElementById('commentCount');
    if (commentText && commentCount) {
        commentText.addEventListener('input', () => {
            commentCount.textContent = commentText.value.length;
        });
    }
}

async function addComment() {
    if (!userData) {
        showNotification('Por favor, faça login para comentar.', 'error');
        return;
    }

    const commentText = document.getElementById('commentText');
    const content = commentText.value.trim();

    if (!content) {
        showNotification('Por favor, escreva um comentário.', 'error');
        return;
    }

    if (content.length > 500) {
        showNotification('O comentário deve ter no máximo 500 caracteres.', 'error');
        return;
    }

    try {
        await communityAPI.addComment(currentDiscussionId, content);

        // Recarregar a discussão
        await openDiscussionModal(currentDiscussionId);
        await loadData(); // Atualizar lista
        await updateStatistics();

        showNotification('Comentário adicionado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        showNotification('Erro ao adicionar comentário', 'error');
    }
}

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;

    // Atualizar UI das abas
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('tab-active');
        } else {
            btn.classList.remove('tab-active');
        }
    });

    loadData();
}

function filterByCategory(category) {
    currentCategory = category;
    currentPage = 1;
    loadData();
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    currentPage = 1;

    // Recarregar dados com o termo de busca
    loadData();
}

async function loadMoreDiscussions() {
    currentPage++;
    try {
        const params = {
            page: currentPage,
            limit: discussionsPerPage,
            category: currentCategory !== 'all' ? currentCategory : undefined,
            tab: currentTab,
            search: searchInput?.value || ''
        };

        const data = await communityAPI.getDiscussions(params);

        // Adicionar às discussões existentes
        discussions = [...discussions, ...data.discussions];
        filteredDiscussions = discussions;

        renderDiscussions();
        updateLoadMoreButton(data.total, data.page, data.totalPages);

    } catch (error) {
        console.error('Erro ao carregar mais discussões:', error);
        showNotification('Erro ao carregar mais discussões', 'error');
    }
}

async function toggleLike(discussionId) {
    if (!userData) {
        showNotification('Por favor, faça login para curtir discussões.', 'error');
        return;
    }

    try {
        const result = await communityAPI.toggleLike(discussionId);

        // Recarregar dados
        await loadData();

        // Se o modal está aberto, atualizar também
        if (currentDiscussionId === discussionId) {
            await openDiscussionModal(discussionId);
        }

        showNotification(result.message, 'success');
    } catch (error) {
        console.error('Erro ao curtir:', error);
        showNotification('Erro ao curtir discussão', 'error');
    }
}

async function updateStatistics() {
    try {
        const stats = await communityAPI.getStats();

        if (document.getElementById('totalMembers')) {
            document.getElementById('totalMembers').textContent = stats.totalMembers;
        }
        if (document.getElementById('totalDiscussions')) {
            document.getElementById('totalDiscussions').textContent = stats.totalDiscussions;
        }
        if (document.getElementById('totalComments')) {
            document.getElementById('totalComments').textContent = stats.totalComments;
        }
        if (document.getElementById('onlineUsers')) {
            document.getElementById('onlineUsers').textContent = stats.onlineMembers;
        }

        // Atualizar membros ativos
        await renderActiveMembers();

    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
    }
}

// Funções auxiliares
function getCategoryName(category) {
    const categories = {
        'geral': 'Geral',
        'ficcao': 'Ficção',
        'nao-ficcao': 'Não-Ficção',
        'tecnologia': 'Tecnologia',
        'autoajuda': 'Autoajuda',
        'negocios': 'Negócios',
        'romance': 'Romance',
        'fantasia': 'Fantasia'
    };
    return categories[category] || 'Geral';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Agora mesmo';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} h atrás`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} dias atrás`;

    return date.toLocaleDateString('pt-BR');
}

function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function showNotification(message, type = 'info') {
    // Remover notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Funções globais
window.openDiscussionModal = openDiscussionModal;
window.toggleLike = toggleLike;
window.filterByCategory = filterByCategory;
window.toggleCreateDiscussionModal = toggleCreateDiscussionModal;
window.addComment = addComment;
window.logout = logout;