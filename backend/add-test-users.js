const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function addTestUsers() {
    try {
        console.log('Adicionando usuários de teste...');
        
        const testUsers = [
            {
                username: 'joao.silva',
                email: 'joao.silva@email.com',
                password: '123456',
                full_name: 'João Silva',
                phone: '+244 123 456 789',
                address: 'Rua das Flores, 123',
               
            },
            {
                username: 'maria.santos',
                email: 'maria.santos@email.com',
                password: '123456',
                full_name: 'Maria Santos',
                phone: '+244 987 654 321',
                address: 'Avenida 4 de Fevereiro, 456',
            
            },
            {
                username: 'pedro.costa',
                email: 'pedro.costa@email.com',
                password: '123456',
                full_name: 'Pedro Costa',
                phone: '+244 555 666 777',
                address: 'Rua Rainha Ginga, 789',
              
            },
            {
                username: 'ana.oliveira',
                email: 'ana.oliveira@email.com',
                password: '123456',
                full_name: 'Ana Oliveira',
                phone: '+244 111 222 333',
                address: 'Avenida Ho Chi Minh, 321',
           
            }
        ];
        
        for (const user of testUsers) {
            // Verificar se usuário já existe
            const existingUser = await pool.query(
                'SELECT id FROM user_accounts WHERE username = $1 OR email = $2',
                [user.username, user.email]
            );
            
            if (existingUser.rows.length === 0) {
                // Hash da senha
                const hashedPassword = await bcrypt.hash(user.password, 10);
                
                await pool.query(
                    'INSERT INTO user_accounts (username, email, password, full_name, phone, address,  role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                    [user.username, user.email, hashedPassword, user.full_name, user.phone, user.address, 'customer']
                );
                console.log(`✅ Usuário adicionado: ${user.full_name}`);
            } else {
                console.log(`⚠️ Usuário já existe: ${user.full_name}`);
            }
        }
        
        console.log('🎉 Processo de adição de usuários concluído!');
    } catch (error) {
        console.error('❌ Erro ao adicionar usuários:', error);
    } finally {
        await pool.end();
    }
}

addTestUsers(); 