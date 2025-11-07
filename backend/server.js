// ====================
// DEPENDÊNCIAS
// ====================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./config/database');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ====================
// MIDDLEWARES
// ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Criar pasta uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Servir arquivos estáticos
// Servir uploads e frontend estático para que a aplicação possa ser acessada pela rede
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Servir painel admin (separado)
app.use('/admin', express.static(path.join(__dirname, '../frontend/public/admin')));
// Servir frontend público (biblioteca, index etc.)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ====================
// AUTENTICAÇÃO JWT
// ====================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token de acesso necessário' });

    jwt.verify(token, process.env.JWT_SECRET || 'mutanha-secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// ====================
// LOGIN/REGISTRO USER
// ====================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM readers WHERE username = $1', [username]);

        if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return res.status(401).json({ error: 'Credenciais inválidas' });

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'mutanha-secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address } = req.body;
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
        }

        const existingUser = await pool.query(
            "SELECT * FROM readers WHERE email = $1 OR username = $2",
            [email, username]
        );
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: "Email ou usuário já cadastrado." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            `INSERT INTO readers (username, email, password, full_name, phone, address, role) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id, username, email, full_name, role`,
            [username, email, hashedPassword, full_name, phone || null, address || null, "reader"]
        );

        res.status(201).json({
            success: true,
            user: newUser.rows[0],
            message: "Conta criada com sucesso!"
        });

    } catch (error) {
        console.error("Erro no registro:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// ====================
// LOGIN ADMIN
// ====================
const SECRET_KEY = "seuSegredoSuperSeguro";
app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        if (username === "admin" && password === "admin123") {
            const token = jwt.sign({ role: "admin", username }, SECRET_KEY, { expiresIn: "2h" });
            return res.json({ success: true, token, user: { username, role: "admin" } });
        }
        return res.status(401).json({ success: false, error: "Credenciais inválidas" });
    } catch (err) {
        console.error("Erro no login admin:", err);
        return res.status(500).json({ success: false, error: "Erro interno do servidor" });
    }
});

// ====================
// CONFIGURAÇÃO MULTER
// ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Apenas imagens (jpg, png) e PDFs são permitidos!'));
    }
});

// ====================
// ROTAS DE LIVROS
// ====================

// Listar livros
app.get('/api/books', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar livros:', error);
        res.status(500).json({ error: 'Erro ao buscar livros' });
    }
});

// Adicionar livro (capa + pdf)
app.post('/api/books', upload.fields([{ name: 'cover_image' }, { name: 'pdf_file' }]), async (req, res) => {
    try {
        const { title, author, publisher, year, isbn, category, description, total_copies } = req.body;

        const coverImage = req.files['cover_image'] ? `/uploads/${req.files['cover_image'][0].filename}` : null;
        const pdfFile = req.files['pdf_file'] ? `/uploads/${req.files['pdf_file'][0].filename}` : null;

        const result = await pool.query(
            `INSERT INTO books 
            (title, author, publisher, year, isbn, category, description, cover_image, pdf_file, total_copies, available_copies, is_active) 
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,true)
             RETURNING *`,
            [title, author, publisher, year || null, isbn, category, description, coverImage, pdfFile, total_copies || 1]
        );

        res.status(201).json({
            success: true,
            message: "Livro adicionado com sucesso!",
            book: result.rows[0]
        });
    } catch (err) {
        console.error("Erro ao adicionar livro:", err);
        res.status(500).json({ error: 'Erro ao adicionar livro' });
    }
});

// Buscar um livro por ID
app.get('/api/books/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar livro' });
    }
});

// Atualizar um livro
app.put('/api/books/:id', upload.single('pdf'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, year, category, description } = req.body;

        let query = `
            UPDATE books 
            SET title=$1, author=$2, year=$3, category=$4, description=$5
        `;
        const values = [title, author, year, category, description];
        let paramCount = values.length;

        // Se um novo PDF for enviado, atualizar também
        if (req.file) {
            paramCount++;
            query += `, pdf_file=$${paramCount}`;
            values.push(req.file.filename);
        }

        paramCount++;
        query += ` WHERE id=$${paramCount} RETURNING *`;
        values.push(id);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar livro' });
    }
});

// Deletar um livro
app.delete('/api/books/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }

        res.json({ message: 'Livro excluído com sucesso', book: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir livro' });
    }
});

// ====================
// ROTA DE ESTATÍSTICAS (DASHBOARD ADMIN)
// Retorna contagens usadas pelo painel administrativo
// ====================
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalReadersRes = await pool.query("SELECT COUNT(*) FROM readers WHERE role = 'reader' AND is_active = true");
        const totalBooksRes = await pool.query('SELECT COUNT(*) FROM books');
        const copiesRes = await pool.query('SELECT COALESCE(SUM(total_copies),0) AS total_copies, COALESCE(SUM(available_copies),0) AS available_copies FROM books');
        const activeLoansRes = await pool.query("SELECT COUNT(*) FROM loans WHERE status = 'ongoing'");
        const overdueRes = await pool.query("SELECT COUNT(*) FROM loans WHERE status = 'overdue'");
        const borrowedRes = await pool.query("SELECT COUNT(*) FROM loans WHERE status <> 'returned'");
        const reservationsRes = await pool.query("SELECT COUNT(*) FROM reservations WHERE status = 'active'");

        // Top borrowed books (by number of loans) - return top 6
        const topBooksRes = await pool.query(
            `SELECT b.id, b.title, b.author, COUNT(l.id) AS times_borrowed
             FROM books b
             LEFT JOIN loans l ON l.book_id = b.id
             GROUP BY b.id, b.title, b.author
             ORDER BY times_borrowed DESC
             LIMIT 6`
        );

        // Build last 14 days trend for reservations and loans
        const days = 14;
        const reservationsByDayRes = await pool.query(
            `SELECT date_trunc('day', reserved_at)::date AS day, COUNT(*) AS count
             FROM reservations
             WHERE reserved_at >= CURRENT_DATE - INTERVAL '${days} days'
             GROUP BY day
             ORDER BY day ASC`
        );

        const loansTrendRes = await pool.query(
            `SELECT date_trunc('day', loan_date)::date AS day, COUNT(*) AS count
             FROM loans
             WHERE loan_date >= CURRENT_DATE - INTERVAL '${days} days'
             GROUP BY day
             ORDER BY day ASC`
        );

        res.json({
            total_readers: parseInt(totalReadersRes.rows[0].count, 10) || 0,
            total_books: parseInt(totalBooksRes.rows[0].count, 10) || 0,
            total_copies: parseInt(copiesRes.rows[0].total_copies, 10) || 0,
            available_copies: parseInt(copiesRes.rows[0].available_copies, 10) || 0,
            active_loans: parseInt(activeLoansRes.rows[0].count, 10) || 0,
            overdue_loans: parseInt(overdueRes.rows[0].count, 10) || 0,
            borrowed_books: parseInt(borrowedRes.rows[0].count, 10) || 0,
            reservations_count: parseInt(reservationsRes.rows[0].count, 10) || 0,
            top_borrowed_books: topBooksRes.rows.map(r => ({ id: r.id, title: r.title, author: r.author, times_borrowed: parseInt(r.times_borrowed, 10) }))
            ,
            reservations_by_day: reservationsByDayRes.rows.map(r => ({ day: r.day, count: parseInt(r.count, 10) })),
            loans_trend: loansTrendRes.rows.map(r => ({ day: r.day, count: parseInt(r.count, 10) }))
        });
    } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});


// Escuta em 0.0.0.0 para permitir acesso a partir de outros dispositivos na mesma rede local
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor rodando na porta ${PORT} (escutando em 0.0.0.0)`));
