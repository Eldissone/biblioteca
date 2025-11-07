
// Carregar dados quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    loadUserActions();
    loadReviews();

    if (isUserLoggedIn()) {
        loadCart();
        setupReviewForm();
    }

    initializeProducts(); // Agora carrega os Books em lote sem repetir
});

// Configurações globais
const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? `${window.location.origin}/api` : 'http://localhost:3000/api';
let userToken = localStorage.getItem('userToken');
let userData = JSON.parse(localStorage.getItem('userData') || 'null');
let cartItems = [];

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

        container.innerHTML = `
          ${adminButton}
          <button
            class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-[#f3ece7] text-[#1b130d] gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 hover:bg-[#ff8200] hover:text-white transition-colors"
            onclick="showCart()">
            <div class="text-[#1b130d]" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor"
                viewBox="0 0 256 256">
                <path
                  d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z">
                </path>
              </svg>
            </div>
            <span id="cart-count" class="bg-[#ff8200] text-white rounded-full px-2 py-1 text-xs">0</span>
          </button>
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
          <button
            class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#f3ece7] text-[#1b130d] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#ff8200] hover:text-white transition-colors"
            onclick="window.location.href='../admin/login.html'">
            <span class="truncate">Admin</span>
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

// Função para adicionar Book ao carrinho
async function addToCart(productId, quantity = 1) {
    if (!isUserLoggedIn()) {
        alert('Faça login para adicionar books ao carrinho');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Book adicionado ao carrinho!');
            loadCart();
        } else {
            alert(result.error || 'Erro ao adicionar ao carrinho');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// Função para carregar carrinho
async function loadCart() {
    if (!isUserLoggedIn()) return;

    try {
        const response = await fetch(`${API_BASE_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });

        if (response.ok) {
            cartItems = await response.json();
            updateCartCount();
        }
    } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
    }
}

// Função para atualizar contador do carrinho
function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

// Função para mostrar carrinho
function showCart() {
    if (!isUserLoggedIn()) {
        alert('Faça login para ver o carrinho');
        return;
    }

    if (cartItems.length === 0) {
        alert('Carrinho vazio');
        return;
    }

    const total = cartItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

    const cartContent = cartItems.map(item => `
        <div class="flex justify-between items-center p-2 border-b">
          <div>
            <p class="font-medium">${item.name}</p>
            <p class="text-sm text-gray-600">Qtd: ${item.quantity}</p>
          </div>
          <p class="font-bold">AOA ${parseFloat(item.total_price).toLocaleString()}</p>
        </div>
      `).join('');

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">Carrinho de pedidos</h3>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <div class="max-h-64 overflow-y-auto">
            ${cartContent}
          </div>
          <div class="border-t pt-4 mt-4">
            <div class="flex justify-between items-center mb-4">
              <span class="font-bold">Total:</span>
              <span class="font-bold">AOA ${total.toLocaleString()}</span>
            </div>
            <button onclick="checkout()" class="w-full bg-[#ff8200] text-white py-2 px-4 rounded hover:bg-[#d67a3a]">
              Finalizar pedido
            </button>
          </div>
        </div>
      `;

    document.body.appendChild(modal);
}

// Função para finalizar pedido
async function checkout() {
    if (!isUserLoggedIn()) {
        alert('Faça login para finalizar a pedido');
        return;
    }

    if (cartItems.length === 0) {
        alert('Carrinho vazio');
        return;
    }

    // Mostrar modal de checkout
    document.getElementById('checkout-modal').classList.add('active');
}

// Função para processar o pedido
async function processOrder() {
    const paymentMethod = document.getElementById('payment-method').value;
    const shippingAddress = document.getElementById('shipping-address').value;
    const notes = document.getElementById('order-notes').value;

    if (!paymentMethod) {
        alert('Selecione um método de pagamento');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/orders/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
                payment_method: paymentMethod,
                shipping_address: shippingAddress,
                notes: notes
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Fechar modal
            document.getElementById('checkout-modal').classList.remove('active');

            // Mostrar modal de sucesso
            document.getElementById('success-modal').classList.add('active');
            document.getElementById('order-number').textContent = result.order_id;
            document.getElementById('order-total').textContent = `AOA ${result.total.toLocaleString()}`;

            // Limpar carrinho
            cartItems = [];
            updateCartCount();
            document.querySelector('.fixed').remove();
        } else {
            alert(result.error || 'Erro ao criar pedido');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

let allProducts = [];
let currentIndex = 0;

// Função para buscar todos os Books apenas uma vez
async function fetchAllProducts() {
    try {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/public/products`);
        if (!response.ok) {
            throw new Error('Erro ao carregar Books');
        }
        allProducts = await response.json();
    } catch (error) {
        console.error('Erro ao buscar Books:', error);
    }
}

// Função para carregar um "chunk" de Books em um container sem repetir
function loadProducts(containerId, limit = 4) {
    const container = document.getElementById(containerId);

    if (currentIndex >= allProducts.length) {
        container.innerHTML = `
      <div class="flex items-center justify-center h-32 text-[#6d2306]">
        <p>Sem mais Books para exibir.</p>
      </div>
    `;
        return;
    }

    const productChunk = allProducts.slice(currentIndex, currentIndex + limit);
    currentIndex += limit;

    if (productChunk.length === 0) {
        container.innerHTML = `
      <div class="flex items-center justify-center h-32 text-[#6d2306]">
        <p>Nenhum Book disponível no momento</p>
      </div>
    `;
        return;
    }

    container.innerHTML = productChunk.map(product => `
    <div class="flex h-full flex-1 flex-col gap-4 rounded-lg min-w-50 cursor-pointer hover:scale-102 transition-transform">
      <div class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl flex flex-col"
                style='background-image: url("${(typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000'}${product.image}");'>
      </div>
      <div class="product p-4">
        <p class="text-[#1b130d] text-base font-medium leading-normal">${product.name}</p>
        <p class="text-[#6d2306] text-sm font-normal leading-normal">${product.description || 'Descrição não disponível'}</p>
        <p class="text-[#ff8200] text-sm font-bold mt-2">AOA ${parseFloat(product.price).toLocaleString()}</p>
        ${isUserLoggedIn() ? `
          <button onclick="addToCart(${product.id})" class="mt-2 bg-[#ff8200] text-white px-3 py-1 rounded text-sm hover:bg-[#d67a3a]">
            Adicionar ao Carrinho
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Função principal que inicia tudo
async function initializeProducts() {
    await fetchAllProducts();
    loadProducts('featured-products'); // Carrega primeiros 6 Books
    loadProducts('new-products');      // Carrega próximos 6 sem repetir
}

// ===== FUNÇÕES DE AVALIAÇÃO =====

// Variáveis globais para avaliações
let currentRating = 0;
let reviews = [
    {
        id: 1,
        user: {
            name: 'Sofia Carvalho',
            email: 'sofia@email.com',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAI2ud4dn_HmZ4i34PyQUwh5jcsw4Z8oJBOsmO6Zrb9jtGhfd31tHMBos9XbQDhPsK5ntoPua3GlW31w-DGp4otP4pq9i3AP3dTmca3Io5PexmvxCixXW9Q2g539lmJzUGfTrLWIsKFg-Q3pPzRZOlbKMbAIN3iiWFdYB5g9oY5IJB03bK4LVMFn5ypSWf726iP5LDqXKrh4Q6wpq4IY5zNSFf00ulTSao9ZUUtWl6CqdCU9m0Lmz1PO-2aXBlyfIQV77WdbSKbsfo'
        },
        rating: 5,
        comment: 'Adorei as leggings que comprei na Bib_Oku_DBness! A qualidade é incrível e elas vestem perfeitamente. Me sinto muito confiante usando-as na academia',
        category: 'qualidade',
        product: null,
        date: '2 meses atrás',
        helpful: 12,
        notHelpful: 2
    },
    {
        id: 2,
        user: {
            name: 'Olivia Bennett',
            email: 'olivia@email.com',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzf8fAYZhix9tcl2-Ie1qrdzjFfziEkiAPID-HNyKwfESLRxdEXs_9VuHavdeC8w8BMmpO9mYUWQL0_bwpJXTB5Fu0TYA-q1kAtGqW2w7uxNP8sT8v5yRqXZPyb7WO8WXFcvxgK8anbRkXGn_t5tD_2czNCTQe2qCBbqznu6IBOkGrb4NQ3gPt7nm9X29CqcWF-pIN0Iq_rPCIFzyUrBPjLb3EEw8YKbHtydRmrvwOO3qt6QjcADMNA_cYwFcWml-n1D7gNjQI5dk'
        },
        rating: 4,
        comment: 'A roupa é muito confortável e oferece excelente aderência. Estou feliz com a minha pedido, mas gostaria que viesse em mais cores',
        category: 'qualidade',
        product: null,
        date: '3 meses atrás',
        helpful: 8,
        notHelpful: 1
    },
    {
        id: 3,
        user: {
            name: 'Ava Harper',
            email: 'ava@email.com',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDc-D3HJ9IJa6DtajGi6FtaVAcOLvVRFyL3xlicK56oI1BD289gDaeAoXGltA-y83dA5sgSmo01stBhuYMZta7Pv7-8m02-M_-Xcvothqa5QX8A4kgX9Du2F3GzHz8KwsZvvTdFvqaavhgWDaEAlyNlFx7E4rrK_Y0qIol_0rkmOKuIe6iZrRUZ18OhndEorDtglOMv7R-LrIpmlU2Txr1hvdszNVHDBoQ93d36D8brVFIdfpW7TK6OeqMeDOHDHAi064V7zCPHXr0'
        },
        rating: 5,
        comment: 'Excelente atendimento e Books de alta qualidade. Recomendo fortemente!',
        category: 'atendimento',
        product: null,
        date: '4 meses atrás',
        helpful: 15,
        notHelpful: 0
    }
];

// Carregar avaliações
function loadReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    container.innerHTML = reviews.map(review => `
        <div class="flex flex-col gap-3 bg-[#fcfaf8]">
          <div class="flex items-center gap-3">
            <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
              style='background-image: url("${review.user.avatar}");'>
            </div>
            <div class="flex-1">
              <p class="text-[#1b130d] text-base font-medium leading-normal">${review.user.name}</p>
              <p class="text-[#6d2306] text-sm font-normal leading-normal">${review.date}</p>
            </div>
            <div class="flex gap-1">
              <button onclick="showReactionModal(${review.id})" class="text-[#6d2306] hover:text-[#ff8200] transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
                </svg>
              </button>
              <button onclick="showShareModal(${review.id})" class="text-[#6d2306] hover:text-[#ff8200] transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="flex gap-0.5">
            ${generateStars(review.rating)}
          </div>
          <p class="text-[#1b130d] text-base font-normal leading-normal">
            "${review.comment}"
          </p>
          <div class="flex gap-9 text-[#6d2306]">
            <button onclick="reactToReview(${review.id}, 'helpful')" class="flex items-center gap-2 hover:text-[#ff8200] transition-colors">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
              </svg>
              <span>${review.helpful}</span>
            </button>
            <button onclick="reactToReview(${review.id}, 'not-helpful')" class="flex items-center gap-2 hover:text-[#ff8200] transition-colors">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
              </svg>
              <span>${review.notHelpful}</span>
            </button>
          </div>
        </div>
      `).join('');
}

// Gerar estrelas
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += `
            <div class="text-[#ff8200]" data-icon="Star" data-size="20px" data-weight="fill">
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                <path d="M234.5,114.38l-45.1,39.36,13.51,58.6a16,16,0,0,1-23.84,17.34l-51.11-31-51,31a16,16,0,0,1-23.84-17.34L66.61,153.8,21.5,114.38a16,16,0,0,1,9.11-28.06l59.46-5.15,23.21-55.36a15.95,15.95,0,0,1,29.44,0h0L166,81.17l59.44,5.15a16,16,0,0,1,9.11,28.06Z"></path>
              </svg>
            </div>
          `;
        } else {
            stars += `
            <div class="text-[#d7bead]" data-icon="Star" data-size="20px" data-weight="regular">
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                <path d="M239.2,97.29a16,16,0,0,0-13.81-11L166,81.17,142.72,25.81h0a15.95,15.95,0,0,0-29.44,0L90.07,81.17,30.61,86.32a16,16,0,0,0-9.11,28.06L66.61,153.8,53.09,212.34a16,16,0,0,0,23.84,17.34l51-31,51.11,31a16,16,0,0,0,23.84-17.34l-13.51-58.6,45.1-39.36A16,16,0,0,0,239.2,97.29Zm-15.22,5-45.1,39.36a16,16,0,0,0-5.08,15.71L187.35,216v0l-51.07-31a15.9,15.9,0,0,0-16.54,0l-51,31h0L82.2,157.4a16,16,0,0,0-5.08-15.71L32,102.35a.37.37,0,0,1,0-.09l59.44-5.14a16,16,0,0,0,13.35-9.75L128,32.08l23.2,55.29a16,16,0,0,0,13.35,9.75L224,102.26S224,102.32,224,102.33Z"></path>
              </svg>
            </div>
          `;
        }
    }
    return stars;
}

// Configurar formulário de avaliação
function setupReviewForm() {
    const form = document.getElementById('reviewForm');
    const starButtons = document.querySelectorAll('#starRating button');

    // Configurar estrelas
    starButtons.forEach(button => {
        button.addEventListener('click', function () {
            const rating = parseInt(this.dataset.rating);
            setRating(rating);
        });
    });

    // Configurar envio do formulário
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        submitReview();
    });

    // Carregar Books no select
    loadProductsForReview();
}

// Definir avaliação por estrelas
function setRating(rating) {
    currentRating = rating;
    const starButtons = document.querySelectorAll('#starRating button');

    starButtons.forEach((button, index) => {
        const starRating = index + 1;
        if (starRating <= rating) {
            button.classList.remove('text-[#d7bead]');
            button.classList.add('text-[#ff8200]');
        } else {
            button.classList.remove('text-[#ff8200]');
            button.classList.add('text-[#d7bead]');
        }
    });
}

// Carregar Books para o select
async function loadProductsForReview() {
    try {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/public/products`);
        if (response.ok) {
            const products = await response.json();
            const select = document.getElementById('reviewProduct');

            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar Books:', error);
    }
}

// Enviar avaliação
async function submitReview() {
    if (currentRating === 0) {
        alert('Por favor, selecione uma avaliação');
        return;
    }

    const comment = document.getElementById('reviewComment').value.trim();
    if (!comment) {
        alert('Por favor, escreva um comentário');
        return;
    }

    const productId = document.getElementById('reviewProduct').value;
    const category = document.getElementById('reviewCategory').value;

    // Simular envio da avaliação
    const newReview = {
        id: reviews.length + 1,
        user: {
            name: localStorage.getItem('userName') || 'Usuário',
            email: localStorage.getItem('userEmail') || 'usuario@email.com',
            avatar: 'https://via.placeholder.com/40x40#ff8200/ffffff?text=U'
        },
        rating: currentRating,
        comment: comment,
        category: category,
        product: productId || null,
        date: 'Agora',
        helpful: 0,
        notHelpful: 0
    };

    reviews.unshift(newReview);
    loadReviews();

    // Limpar formulário
    document.getElementById('reviewComment').value = '';
    document.getElementById('reviewProduct').value = '';
    document.getElementById('reviewCategory').value = 'geral';
    setRating(0);

    closeModal('reviewModal');
    alert('Avaliação publicada com sucesso!');
}

// Mostrar modal de reação
function showReactionModal(reviewId) {
    // Por enquanto, apenas mostrar um alert
    alert('Funcionalidade de reação será implementada em breve!');
}

// Mostrar modal de compartilhamento
function showShareModal(reviewId) {
    document.getElementById('shareLink').value = `https://Bib_Oku_DBness.com.ao/reviews/${reviewId}`;
    showModal('shareModal');
}

// Reagir à avaliação
function reactToReview(reviewId, reaction) {
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
        if (reaction === 'helpful') {
            review.helpful++;
        } else {
            review.notHelpful++;
        }
        loadReviews();
    }
}

// Copiar link de compartilhamento
function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Link copiado para a área de transferência!');
}

// Compartilhar nas redes sociais
function shareToSocial(platform) {
    const link = document.getElementById('shareLink').value;
    const text = 'Confira esta avaliação da Bib_Oku_DBness!';

    let url = '';
    switch (platform) {
        case 'facebook':
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
            break;
        case 'twitter':
            url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
            break;
        case 'whatsapp':
            url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`;
            break;
    }

    if (url) {
        window.open(url, '_blank');
    }
}

// Funções de modal
function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}
