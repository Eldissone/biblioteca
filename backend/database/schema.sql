-- ======================================
-- Tabela de bibliotecários (administradores)
-- ======================================
CREATE TABLE IF NOT EXISTS librarians (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'librarian',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- Tabela de leitores (usuários normais)
-- ======================================
CREATE TABLE IF NOT EXISTS readers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(20) DEFAULT 'reader',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- Tabela de livros
-- ======================================
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(150),
    publisher VARCHAR(150),
    year INTEGER,
    isbn VARCHAR(20) UNIQUE,
    category VARCHAR(100),
    description TEXT,                 -- resumo do livro
    cover_image VARCHAR(500),         -- caminho/URL da capa
    pdf_file VARCHAR(500),            -- caminho/URL do PDF
    total_copies INTEGER DEFAULT 1,   -- total de exemplares
    available_copies INTEGER DEFAULT 1, -- exemplares disponíveis
    available BOOLEAN DEFAULT true,   -- disponibilidade simples
    is_active BOOLEAN DEFAULT true,   -- status (ativo/inativo)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- Tabela de empréstimos
-- ======================================
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    reader_id INTEGER REFERENCES readers(id) ON DELETE SET NULL,
    book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
    loan_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(50) DEFAULT 'ongoing', -- ongoing, returned, overdue
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- Tabela de reservas
-- ======================================
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    reader_id INTEGER REFERENCES readers(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' -- active, cancelled, fulfilled
);

-- ======================================
-- Índices para performance
-- ======================================
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_loans_reader_id ON loans(reader_id);
CREATE INDEX IF NOT EXISTS idx_loans_book_id ON loans(book_id);
CREATE INDEX IF NOT EXISTS idx_reservations_reader_id ON reservations(reader_id);
CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_readers_email ON readers(email);
CREATE INDEX IF NOT EXISTS idx_readers_username ON readers(username);

-- ======================================
-- Trigger para atualizar "updated_at"
-- ======================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ativar trigger em todas as tabelas principais
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('librarians','readers','books','loans','reservations')
    LOOP
        EXECUTE format('
            CREATE TRIGGER set_timestamp
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
        ', t);
    END LOOP;
END;
$$;
