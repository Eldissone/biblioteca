const pool = require('./config/database');

async function addTestProducts() {
    try {
        console.log('Adicionando produtos de teste...');
        
        const testProducts = [
            {
                name: 'Tênis de Corrida Performance',
                description: 'Tênis ideal para corridas de longa distância com tecnologia de amortecimento avançada',
                category: 'calçados',
                price: 12000,
                stock_quantity: 50,
                image: '/uploads/default-product.jpg'
            },
            {
                name: 'Top de Treino Respirável',
                description: 'Top esportivo com tecido dry-fit que mantém você seco durante o treino',
                category: 'roupas',
                price: 4500,
                stock_quantity: 30,
                image: '/uploads/default-product.jpg'
            },
            {
                name: 'Leggings Fitness',
                description: 'Leggings de alta compressão para treinos intensos',
                category: 'roupas',
                price: 3500,
                stock_quantity: 25,
                image: '/uploads/default-product.jpg'
            },
            {
                name: 'Garrafa de Água Esportiva',
                description: 'Garrafa de 750ml com isolamento térmico para manter a água fresca',
                category: 'acessorios',
                price: 1500,
                stock_quantity: 100,
                image: '/uploads/default-product.jpg'
            },
            {
                name: 'Corda de Pular Profissional',
                description: 'Corda de pular ajustável com rolamentos de alta qualidade',
                category: 'acessorios',
                price: 2500,
                stock_quantity: 40,
                image: '/uploads/default-product.jpg'
            },
            {
                name: 'Shorts Esportivos',
                description: 'Shorts leves e confortáveis para atividades físicas',
                category: 'roupas',
                price: 2800,
                stock_quantity: 35,
                image: '/uploads/default-product.jpg'
            }
        ];
        
        for (const product of testProducts) {
            await pool.query(
                'INSERT INTO products (name, description, category, price, stock_quantity, image) VALUES ($1, $2, $3, $4, $5, $6)',
                [product.name, product.description, product.category, product.price, product.stock_quantity, product.image]
            );
            console.log(`✅ Produto adicionado: ${product.name}`);
        }
        
        console.log('🎉 Todos os produtos de teste foram adicionados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao adicionar produtos:', error);
    } finally {
        await pool.end();
    }
}

addTestProducts(); 