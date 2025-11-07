const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function initializeDatabase() {
  try {
    console.log('📚 Inicializando banco de dados da biblioteca...');

    // Ler o arquivo SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Executar o schema
    await pool.query(schema);

    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('📊 Tabelas criadas:');
    console.log('   - librarians (bibliotecários/admins)');
    console.log('   - readers (usuários/leitores)');
    console.log('   - books (livros)');
    console.log('   - loans (empréstimos)');
    console.log('   - reservations (reservas)');
    console.log('');
    console.log('🔑 Usuário administrador padrão:');
    console.log('   Username: admin');
    console.log('   Password: password');
    console.log('');
    console.log('📝 Para conectar ao banco de dados:');
    console.log('   - Copie o arquivo .env.example para .env');
    console.log('   - Configure as variáveis de ambiente');
    console.log('   - Execute: npm run dev');

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    console.error('');
    console.error('🔧 Verifique se:');
    console.error('   1. PostgreSQL está instalado e rodando');
    console.error('   2. O banco de dados existe');
    console.error('   3. As credenciais estão corretas no .env');
    console.error('   4. O usuário tem permissões para criar tabelas');
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
