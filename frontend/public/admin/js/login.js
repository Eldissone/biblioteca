
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const loginBtn = document.getElementById('login-btn');

// Verificar se já está autenticado
function checkExistingAuth() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        // Verificar se o token é válido
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isExpired = payload.exp * 1000 < Date.now();

            if (!isExpired && payload.role === 'admin') {
                window.location.href = 'index.html';
                return true;
            } else {
                localStorage.removeItem('adminToken');
            }
        } catch (e) {
            localStorage.removeItem('adminToken');
        }
    }
    return false;
}

// Verificar autenticação existente ao carregar a página
if (checkExistingAuth()) {
    // Já redirecionou, não fazer nada
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Desabilita o botão durante o processo
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    errorMessage.style.display = 'none';

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success && data.token) {
            // Login bem-sucedido - salvar token
            localStorage.setItem('adminToken', data.token);
            console.log('Login realizado com sucesso, redirecionando...');

            // Adicionar pequeno delay para visualização do sucesso
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);

        } else {
            // Login falhou
            throw new Error(data.error || 'Credenciais inválidas');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        errorMessage.textContent = error.message || 'Erro ao fazer login. Tente novamente.';
        errorMessage.style.display = 'block';

        // Restaurar botão
        loginBtn.disabled = false;
        loginBtn.classList.remove('loading');
        loginBtn.textContent = 'Entrar';

        // Focar no campo de usuário
        document.getElementById('username').focus();
    }
});

// Focar no campo de senha se usuário já estiver preenchido
document.getElementById('username').addEventListener('input', function () {
    if (this.value.trim() === 'admin') {
        document.getElementById('password').focus();
    }
});

// Enter key navigation
document.getElementById('username').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('password').focus();
    }
});

document.getElementById('password').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('login-btn').click();
    }
});

// Auto-focus no username ao carregar a página
document.addEventListener('DOMContentLoaded', function () {
    const usernameField = document.getElementById('username');
    if (usernameField.value === 'admin') {
        document.getElementById('password').focus();
    } else {
        usernameField.focus();
    }
});
