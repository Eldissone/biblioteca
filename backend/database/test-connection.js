const pool = require('../config/database');

async function testConnection() {
  try {
    console.log('🔍 Testando conexão com o banco de dados da biblioteca...');

    // Testar conexão básica
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log(`⏰ Horário do servidor: ${result.rows[0].current_time}`);

    // Verificar banco atual
    const dbResult = await pool.query("SELECT current_database() as db_name");
    console.log(`📊 Banco de dados atual: ${dbResult.rows[0].db_name}`);

    // Verificar tabelas existentes
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log('📋 Tabelas encontradas:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  Nenhuma tabela encontrada. Execute "npm run db:init" para criar as tabelas da biblioteca.');
    }

    console.log('');
    console.log('🎉 Teste de conexão concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('');
    console.error('🔧 Verifique:');
    console.error('   1. Se o PostgreSQL está rodando');
    console.error('   2. Se o banco da biblioteca existe');
    console.error('   3. Se as credenciais no .env estão corretas');
    console.error('   4. Se a porta 5432 está disponível');
    console.error('');
    console.error('📝 Comandos úteis:');
    console.error('   - psql -U postgres -d nome_do_banco (testar conexão manual)');
    console.error('   - npm run db:init (criar tabelas da biblioteca)');
    console.error('   - npm run dev (iniciar servidor)');
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testConnection();
}

module.exports = { testConnection };
