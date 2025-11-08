
// Configurações globais - MESMAS CONFIGURAÇÕES DA PÁGINA PRINCIPAL
const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? `${window.location.origin}/api` : 'http://localhost:3000/api';
let userToken = localStorage.getItem('userToken');
let userData = JSON.parse(localStorage.getItem('userData') || 'null');

// Configuração da comunidade
const STORAGE_KEYS = {
    DISCUSSIONS: 'okukulanaua_discussions',
    COMMENTS: 'okukulanaua_comments',
    LIKES: 'okukulanaua_likes',
    MEMBERS: 'okukulanaua_members'
};

// Estado da aplicação
let discussions = [];
let comments = [];
let likes = [];
let members = [];
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
    renderAll();
});

// FUNÇÕES DE AUTENTICAÇÃO - MESMAS DA PÁGINA PRINCIPAL
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
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    userToken = null;
    userData = null;
    currentUser = null; // Adicione esta linha
    window.location.reload();
}

// Atualize a função initializeCommunity
function initializeCommunity() {
    loadUserActions();

    // Sincronizar currentUser com userData
    currentUser = userData;

    // Adicionar usuário atual aos membros se estiver logado
    if (isUserLoggedIn()) {
        const userExists = members.some(m => m.id === userData.id);
        if (!userExists) {
            members.push({
                id: userData.id,
                name: userData.full_name || userData.username,
                avatar: getInitials(userData.full_name || userData.username),
                isOnline: true,
                joinDate: new Date().toISOString()
            });
            saveData();
        }
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

function loadData() {
    // Carregar dados do localStorage
    discussions = JSON.parse(localStorage.getItem(STORAGE_KEYS.DISCUSSIONS)) || [];
    comments = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || [];
    likes = JSON.parse(localStorage.getItem(STORAGE_KEYS.LIKES)) || [];
    members = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS)) || getDefaultMembers();

    // Se não há discussões, criar algumas de exemplo
    if (discussions.length === 0) {
        discussions = getSampleDiscussions();
        comments = getSampleComments();
        saveData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEYS.DISCUSSIONS, JSON.stringify(discussions));
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
    localStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify(likes));
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
}

function getDefaultMembers() {
    return [
        {
            id: 1,
            name: "Maria Silva",
            avatar: "MS",
            isOnline: true,
            joinDate: "2024-01-01T10:00:00"
        },
        {
            id: 2,
            name: "João Santos",
            avatar: "JS",
            isOnline: true,
            joinDate: "2024-01-02T11:00:00"
        },
        {
            id: 3,
            name: "Ana Costa",
            avatar: "AC",
            isOnline: false,
            joinDate: "2024-01-03T12:00:00"
        },
        {
            id: 4,
            name: "Pedro Lima",
            avatar: "PL",
            isOnline: true,
            joinDate: "2024-01-04T13:00:00"
        },
        {
            id: 5,
            name: "Carla Dias",
            avatar: "CD",
            isOnline: false,
            joinDate: "2024-01-05T14:00:00"
        }
    ];
}

function getSampleDiscussions() {
    return [
        {
            id: 1,
            title: "O que acham do livro '48 Leis do Poder'?",
            content: "Estou lendo este livro e gostaria de saber a opinião de vocês sobre as estratégias apresentadas. Algumas me parecem bastante úteis para o desenvolvimento profissional.",
            authorId: 1,
            category: "autoajuda",
            likes: 15,
            commentsCount: 3,
            views: 124,
            createdAt: "2024-01-15T10:30:00",
            isAnswered: true
        },
        {
            id: 2,
            title: "Recomendações de livros de ficção científica",
            content: "Estou procurando novas leituras no gênero de ficção científica. Alguém tem recomendações de autores contemporâneos?",
            authorId: 2,
            category: "ficcao",
            likes: 23,
            commentsCount: 5,
            views: 187,
            createdAt: "2024-01-14T15:45:00",
            isAnswered: true
        },
        {
            id: 3,
            title: "Como criar o hábito da leitura?",
            content: "Sempre tive dificuldade em manter uma rotina de leitura. Alguma dica prática para criar e manter esse hábito?",
            authorId: 3,
            category: "geral",
            likes: 34,
            commentsCount: 7,
            views: 256,
            createdAt: "2024-01-13T09:15:00",
            isAnswered: true
        }
    ];
}

function getSampleComments() {
    return [
        {
            id: 1,
            discussionId: 1,
            authorId: 2,
            content: "Excelente livro! A lei 6 me ajudou muito na carreira.",
            createdAt: "2024-01-15T11:00:00",
            likes: 3
        },
        {
            id: 2,
            discussionId: 1,
            authorId: 4,
            content: "Cuidado com algumas estratégias que podem ser antiéticas.",
            createdAt: "2024-01-15T12:30:00",
            likes: 1
        },
        {
            id: 3,
            discussionId: 2,
            authorId: 1,
            content: "Recomendo 'Projeto Hail Mary' do Andy Weir!",
            createdAt: "2024-01-14T16:00:00",
            likes: 5
        }
    ];
}

function renderAll() {
    updateStatistics();
    applyFilters();
    renderCategories();
    renderActiveMembers();
}

function updateStatistics() {
    const totalComments = comments.length;
    const onlineMembers = members.filter(m => m.isOnline).length;

    if (document.getElementById('totalMembers')) document.getElementById('totalMembers').textContent = members.length;
    if (document.getElementById('totalDiscussions')) document.getElementById('totalDiscussions').textContent = discussions.length;
    if (document.getElementById('totalComments')) document.getElementById('totalComments').textContent = totalComments;
    if (document.getElementById('onlineUsers')) document.getElementById('onlineUsers').textContent = onlineMembers;
}

function renderDiscussions() {
    if (!discussionsList) return;

    const startIndex = (currentPage - 1) * discussionsPerPage;
    const endIndex = startIndex + discussionsPerPage;
    const discussionsToShow = filteredDiscussions.slice(0, endIndex);

    if (discussionsToShow.length === 0) {
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
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        return;
    }

    discussionsList.innerHTML = discussionsToShow.map(discussion => {
        const author = members.find(m => m.id === discussion.authorId);
        const userLikes = likes.filter(l => l.discussionId === discussion.id && l.userId === (userData?.id));
        const isLiked = userLikes.length > 0;
        const discussionComments = comments.filter(c => c.discussionId === discussion.id);

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
                ${!discussion.isAnswered ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Sem resposta</span>' : ''}
              </div>
            </div>
            
            <div class="flex justify-between items-center text-sm text-gray-500">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <div class="user-avatar relative">
                    ${author?.avatar || '??'}
                    ${author?.isOnline ? '<div class="online-indicator"></div>' : ''}
                  </div>
                  <span>${author?.name || 'Utilizador'}</span>
                </div>
                <span>${formatDate(discussion.createdAt)}</span>
              </div>
              <div class="flex items-center gap-4">
                <button class="like-btn flex items-center gap-1 ${isLiked ? 'liked' : ''}" 
                        onclick="toggleLike(${discussion.id})"
                        ${!isUserLoggedIn() ? 'disabled' : ''}>
                  <svg width="16" height="16" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  ${discussion.likes}
                </button>
                <div class="flex items-center gap-1 cursor-pointer" onclick="openDiscussionModal(${discussion.id})">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  ${discussionComments.length}
                </div>
                <div class="flex items-center gap-1">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  ${discussion.views}
                </div>
              </div>
            </div>
          </div>
        `;
    }).join('');

    if (loadMoreBtn) loadMoreBtn.classList.toggle('hidden', endIndex >= filteredDiscussions.length);
}

function renderCategories() {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;

    const categories = [
        { id: 'all', name: 'Todas', count: discussions.length },
        { id: 'geral', name: 'Geral', count: discussions.filter(d => d.category === 'geral').length },
        { id: 'ficcao', name: 'Ficção', count: discussions.filter(d => d.category === 'ficcao').length },
        { id: 'nao-ficcao', name: 'Não-Ficção', count: discussions.filter(d => d.category === 'nao-ficcao').length },
        { id: 'autoajuda', name: 'Autoajuda', count: discussions.filter(d => d.category === 'autoajuda').length },
        { id: 'negocios', name: 'Negócios', count: discussions.filter(d => d.category === 'negocios').length },
        { id: 'tecnologia', name: 'Tecnologia', count: discussions.filter(d => d.category === 'tecnologia').length }
    ];

    categoriesList.innerHTML = categories.map(cat => `
        <button class="category-btn w-full text-left py-2 px-3 rounded-lg hover:bg-[#f3ece7] transition-colors flex justify-between items-center ${currentCategory === cat.id ? 'bg-[#f3ece7] text-[#ff8200]' : ''}"
                onclick="filterByCategory('${cat.id}')">
          <span>${cat.name}</span>
          <span class="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">${cat.count}</span>
        </button>
      `).join('');
}

function renderActiveMembers() {
    const activeMembers = document.getElementById('activeMembers');
    if (!activeMembers) return;

    const onlineMembers = members.filter(m => m.isOnline).slice(0, 5);

    activeMembers.innerHTML = onlineMembers.map(member => `
        <div class="flex items-center gap-3">
          <div class="user-avatar relative">
            ${member.avatar}
            <div class="online-indicator"></div>
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">${member.name}</div>
            <div class="text-xs text-gray-500">Online</div>
          </div>
        </div>
      `).join('');

    if (onlineMembers.length === 0) {
        activeMembers.innerHTML = '<p class="text-gray-500 text-sm">Nenhum membro online</p>';
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
    titleCount.textContent = discussionTitle.value.length;
    contentCount.textContent = discussionContent.value.length;

    // Validar em tempo real
    const isTitleValid = discussionTitle.value.length >= 10 && discussionTitle.value.length <= 100;
    const isContentValid = discussionContent.value.length >= 20 && discussionContent.value.length <= 1000;

    submitDiscussion.disabled = !isTitleValid || !isContentValid;
}

function handleCreateDiscussion(e) {
    e.preventDefault();

    const title = discussionTitle.value.trim();
    const category = document.getElementById('discussionCategory').value;
    const content = discussionContent.value.trim();

    const newDiscussion = {
        id: Date.now(), // ID único baseado no timestamp
        title,
        content,
        authorId: userData.id,
        category,
        likes: 0,
        commentsCount: 0,
        views: 0,
        createdAt: new Date().toISOString(),
        isAnswered: false
    };

    discussions.unshift(newDiscussion);
    saveData();

    // Atualizar a exibição
    applyFilters();
    updateStatistics();
    renderCategories();

    // Reset form and close modal
    discussionForm.reset();
    updateCharacterCounts();
    createDiscussionModal.classList.add('hidden');

    showNotification('Discussão criada com sucesso!', 'success');
}

function openDiscussionModal(discussionId) {
    const discussion = discussions.find(d => d.id === discussionId);
    if (!discussion) return;

    // Incrementar visualizações
    discussion.views++;
    saveData();

    const author = members.find(m => m.id === discussion.authorId);
    const discussionComments = comments.filter(c => c.discussionId === discussionId);
    const userLikes = likes.filter(l => l.discussionId === discussionId && l.userId === (userData?.id));
    const isLiked = userLikes.length > 0;

    currentDiscussionId = discussionId;

    const modalContent = document.getElementById('discussionModalContent');
    modalContent.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-[#1b130d]">${discussion.title}</h3>
          <button onclick="discussionModal.classList.add('hidden')" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-3 mb-3">
            <div class="user-avatar">${author?.avatar || '??'}</div>
            <div>
              <div class="font-medium">${author?.name || 'Utilizador'}</div>
              <div class="text-sm text-gray-500">${formatDate(discussion.createdAt)} • ${discussion.views} visualizações</div>
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
              ${discussion.likes}
            </button>
            <div class="flex items-center gap-1 text-gray-600">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              ${discussionComments.length} comentários
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="font-semibold text-[#1b130d]">Comentários (${discussionComments.length})</h4>
          
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
            ${discussionComments.length === 0 ? `
              <div class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">💬</div>
                <p>Seja o primeiro a comentar!</p>
              </div>
            ` : discussionComments.map(comment => {
        const commentAuthor = members.find(m => m.id === comment.authorId);
        return `
                <div class="comment bg-gray-50 rounded-lg p-4">
                  <div class="flex items-center gap-3 mb-2">
                    <div class="user-avatar">${commentAuthor?.avatar || '??'}</div>
                    <div>
                      <div class="font-medium">${commentAuthor?.name || 'Utilizador'}</div>
                      <div class="text-sm text-gray-500">${formatDate(comment.createdAt)}</div>
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

    discussionModal.classList.remove('hidden');
}

function addComment() {
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

    const newComment = {
        id: Date.now(),
        discussionId: currentDiscussionId,
        authorId: userData.id,
        content,
        createdAt: new Date().toISOString(),
        likes: 0
    };

    comments.push(newComment);

    // Atualizar contador de comentários na discussão
    const discussion = discussions.find(d => d.id === currentDiscussionId);
    if (discussion) {
        discussion.commentsCount = comments.filter(c => c.discussionId === currentDiscussionId).length;
        discussion.isAnswered = true; // Marcar como respondida
    }

    saveData();
    openDiscussionModal(currentDiscussionId); // Recarregar modal
    applyFilters(); // Atualizar lista de discussões
    updateStatistics();

    showNotification('Comentário adicionado com sucesso!', 'success');
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

    applyFilters();
}

function filterByCategory(category) {
    currentCategory = category;
    currentPage = 1;
    applyFilters();
    renderCategories();
}

function applyFilters() {
    let filtered = [...discussions];

    // Filtro por categoria
    if (currentCategory !== 'all') {
        filtered = filtered.filter(d => d.category === currentCategory);
    }

    // Filtro por aba
    switch (currentTab) {
        case 'popular':
            filtered.sort((a, b) => b.likes - a.likes);
            break;
        case 'unanswered':
            filtered = filtered.filter(d => !d.isAnswered);
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'recent':
        default:
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
    }

    filteredDiscussions = filtered;
    renderDiscussions();
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (searchTerm) {
        filteredDiscussions = discussions.filter(d =>
            d.title.toLowerCase().includes(searchTerm) ||
            d.content.toLowerCase().includes(searchTerm)
        );
    } else {
        filteredDiscussions = [...discussions];
    }

    currentPage = 1;
    applyFilters();
}

function loadMoreDiscussions() {
    currentPage++;
    renderDiscussions();
}

function toggleLike(discussionId) {
    if (!userData) {
        showNotification('Por favor, faça login para curtir discussões.', 'error');
        return;
    }

    const discussion = discussions.find(d => d.id === discussionId);
    if (!discussion) return;

    const existingLike = likes.find(l => l.discussionId === discussionId && l.userId === userData.id);

    if (existingLike) {
        // Remover like
        likes = likes.filter(l => l !== existingLike);
        discussion.likes--;
    } else {
        // Adicionar like
        likes.push({
            id: Date.now(),
            discussionId,
            userId: userData.id,
            createdAt: new Date().toISOString()
        });
        discussion.likes++;
    }

    saveData();
    applyFilters(); // Atualizar a lista

    // Se o modal está aberto, atualizar também
    if (currentDiscussionId === discussionId) {
        openDiscussionModal(discussionId);
    }

    showNotification(existingLike ? 'Like removido' : 'Discussão curtida!', 'success');
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

function updateUserActions(isLoggedIn) {
    const userActions = document.getElementById('userActions');
    if (!userActions) return;

    if (isLoggedIn) {
        userActions.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="user-avatar">${getInitials(userData.full_name || userData.username)}</div>
            <div class="text-sm">
              <div class="font-medium">${userData.full_name || userData.username}</div>
              <div class="text-xs text-gray-500">Online</div>
            </div>
            <button onclick="logout()" class="text-[#1b130d] text-sm font-medium hover:text-[#ff8200] ml-2">
              Sair
            </button>
          </div>
        `;
    } else {
        userActions.innerHTML = `
          <a href="login.html" class="text-[#1b130d] text-sm font-medium hover:text-[#ff8200]">
            Entrar
          </a>
          <a href="registro.html" class="bg-[#ff8200] text-white px-4 py-2 rounded-lg hover:bg-[#d67a32] transition-colors text-sm font-medium">
            Registar
          </a>
        `;
    }
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

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.reload();
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
