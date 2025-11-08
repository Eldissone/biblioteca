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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/public/admin')));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ====================
// CONFIGURAÇÃO JWT
// ====================
const JWT_SECRET = process.env.JWT_SECRET || 'okukulanaua-secret';

// ====================
// AUTENTICAÇÃO JWT PARA TODOS OS USUÁRIOS
// ====================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token de acesso necessário' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// ====================
// AUTENTICAÇÃO JWT APENAS PARA ADMIN
// ====================
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado' });
        }
        
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        
        req.user = user;
        next();
    });
};

// ====================
// INICIALIZAR ADMIN PADRÃO
// ====================
async function initializeDefaultAdmin() {
    try {
        // Verificar se já existe um admin
        const adminCheck = await pool.query(
            "SELECT * FROM readers WHERE role = 'admin' AND username = 'admin'"
        );

        if (adminCheck.rows.length === 0) {
            // Criar admin padrão
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                `INSERT INTO readers (username, email, password, full_name, role, is_active) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                ['admin', 'admin@biblioteca.com', hashedPassword, 'Administrador', 'admin', true]
            );
            console.log('✅ Admin padrão criado: admin / admin123');
        } else {
            console.log('✅ Admin já existe no banco de dados');
        }
    } catch (error) {
        console.error('❌ Erro ao inicializar admin:', error);
    }
}

// ====================
// LOGIN PARA TODOS OS USUÁRIOS (INCLUINDO ADMIN)
// ====================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Buscar usuário por username ou email
        const result = await pool.query(
            'SELECT * FROM readers WHERE (email = $1 OR username = $1) AND is_active = true', 
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: { 
                id: user.id, 
                username: user.username, 
                role: user.role, 
                full_name: user.full_name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ====================
// LOGIN ADMIN (COMPATIBILIDADE)
// ====================
app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    
    console.log("Tentativa de login admin:", { username });
    
    try {
        // Buscar admin no banco de dados
        const result = await pool.query(
            "SELECT * FROM readers WHERE username = $1 AND role = 'admin' AND is_active = true",
            [username]
        );

        if (result.rows.length === 0) {
            console.log("Admin não encontrado:", username);
            return res.status(401).json({ 
                success: false, 
                error: "Credenciais inválidas" 
            });
        }

        const admin = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (!isValidPassword) {
            console.log("Senha inválida para admin:", username);
            return res.status(401).json({ 
                success: false, 
                error: "Credenciais inválidas" 
            });
        }

        const token = jwt.sign(
            { 
                id: admin.id,
                username: admin.username, 
                role: admin.role,
                email: admin.email
            }, 
            JWT_SECRET, 
            { expiresIn: "24h" }
        );
        
        return res.json({ 
            success: true, 
            token, 
            user: { 
                id: admin.id,
                username: admin.username, 
                role: admin.role,
                full_name: admin.full_name,
                email: admin.email
            } 
        });
        
    } catch (err) {
        console.error("Erro no login admin:", err);
        return res.status(500).json({ 
            success: false, 
            error: "Erro interno do servidor" 
        });
    }
});

// ====================
// REGISTRO DE USUÁRIOS COMUNS
// ====================
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address } = req.body;
        
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
        }

        // Verificar se usuário ou email já existe
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
             RETURNING id, username, email, full_name, role, created_at`,
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
// ROTA DE LEITORES (APENAS ADMIN)
// ====================
app.get('/api/readers', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, username, email, full_name, phone, address, created_at, is_active, role FROM readers WHERE role = 'reader' ORDER BY created_at DESC"
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar leitores:', error);
        res.status(500).json({ error: 'Erro ao buscar leitores' });
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

// Listar livros (público)
app.get('/api/books', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar livros:', error);
        res.status(500).json({ error: 'Erro ao buscar livros' });
    }
});

// Adicionar livro (apenas admin)
app.post('/api/books', authenticateAdmin, upload.fields([{ name: 'cover_image' }, { name: 'pdf_file' }]), async (req, res) => {
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

// Buscar um livro por ID (público)
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

// Atualizar um livro (apenas admin)
app.put('/api/books/:id', authenticateAdmin, upload.fields([{ name: 'cover_image' }, { name: 'pdf_file' }]), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, publisher, year, isbn, category, description, total_copies } = req.body;

        // Buscar livro atual primeiro
        const currentBook = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
        if (currentBook.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }

        let coverImage = currentBook.rows[0].cover_image;
        let pdfFile = currentBook.rows[0].pdf_file;

        // Se novos arquivos foram enviados, atualizar
        if (req.files) {
            if (req.files['cover_image']) {
                coverImage = `/uploads/${req.files['cover_image'][0].filename}`;
            }
            if (req.files['pdf_file']) {
                pdfFile = `/uploads/${req.files['pdf_file'][0].filename}`;
            }
        }

        const result = await pool.query(
            `UPDATE books 
             SET title=$1, author=$2, publisher=$3, year=$4, isbn=$5, 
                 category=$6, description=$7, cover_image=$8, pdf_file=$9,
                 total_copies=$10, available_copies=$11
             WHERE id=$12 
             RETURNING *`,
            [
                title, 
                author, 
                publisher || null, 
                year || null, 
                isbn || null, 
                category || null, 
                description || null,
                coverImage,
                pdfFile,
                total_copies || 1,
                total_copies || 1,
                id
            ]
        );

        res.json({
            success: true,
            message: "Livro atualizado com sucesso!",
            book: result.rows[0]
        });
    } catch (err) {
        console.error("Erro ao atualizar livro:", err);
        res.status(500).json({ error: 'Erro ao atualizar livro' });
    }
});

// Deletar um livro (apenas admin)
app.delete('/api/books/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }

        res.json({ 
            success: true,
            message: 'Livro excluído com sucesso', 
            book: result.rows[0] 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir livro' });
    }
});

// ====================
// ROTA DE ESTATÍSTICAS (DASHBOARD ADMIN)
// ====================
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const totalReadersRes = await pool.query("SELECT COUNT(*) FROM readers WHERE role = 'reader' AND is_active = true");
        const totalBooksRes = await pool.query('SELECT COUNT(*) FROM books');
        const copiesRes = await pool.query('SELECT COALESCE(SUM(total_copies),0) AS total_copies, COALESCE(SUM(available_copies),0) AS available_copies FROM books');
        const activeLoansRes = await pool.query("SELECT COUNT(*) FROM loans WHERE status = 'ongoing'");
        const overdueRes = await pool.query("SELECT COUNT(*) FROM loans WHERE status = 'overdue'");
        const borrowedRes = await pool.query("SELECT COUNT(*) FROM loans WHERE status <> 'returned'");
        const reservationsRes = await pool.query("SELECT COUNT(*) FROM reservations WHERE status = 'active'");

        // Top borrowed books
        const topBooksRes = await pool.query(
            `SELECT b.id, b.title, b.author, COUNT(l.id) AS times_borrowed
             FROM books b
             LEFT JOIN loans l ON l.book_id = b.id
             GROUP BY b.id, b.title, b.author
             ORDER BY times_borrowed DESC
             LIMIT 6`
        );

        // Trends dos últimos 14 dias
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
            top_borrowed_books: topBooksRes.rows.map(r => ({ 
                id: r.id, 
                title: r.title, 
                author: r.author, 
                times_borrowed: parseInt(r.times_borrowed, 10) 
            })),
            reservations_by_day: reservationsByDayRes.rows.map(r => ({ 
                day: r.day, 
                count: parseInt(r.count, 10) 
            })),
            loans_trend: loansTrendRes.rows.map(r => ({ 
                day: r.day, 
                count: parseInt(r.count, 10) 
            }))
        });
    } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// ====================
// ROTAS DA COMUNIDADE
// ====================

// GET - Listar discussões com filtros e paginação
app.get('/api/community/discussions', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            category = 'all', 
            tab = 'recent',
            search = '' 
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = ['1=1'];
        let params = [limit, offset];
        let paramCount = 2;

        // Filtro por categoria
        if (category && category !== 'all') {
            paramCount++;
            whereConditions.push(`category = $${paramCount}`);
            params.push(category);
        }

        // Filtro por busca
        if (search) {
            paramCount++;
            whereConditions.push(`(LOWER(title) LIKE LOWER($${paramCount}) OR LOWER(content) LIKE LOWER($${paramCount}))`);
            params.push(`%${search}%`);
        }

        // Ordenação por aba
        let orderBy = 'created_at DESC';
        switch (tab) {
            case 'popular':
                orderBy = 'likes DESC, created_at DESC';
                break;
            case 'unanswered':
                whereConditions.push('is_answered = false');
                orderBy = 'created_at DESC';
                break;
            case 'recent':
            default:
                orderBy = 'created_at DESC';
                break;
        }

        const whereClause = whereConditions.join(' AND ');

        // Query principal
        const discussionsQuery = `
            SELECT 
                cd.*,
                r.username as author_username,
                r.full_name as author_name,
                COUNT(cl.id) as like_count,
                COUNT(cc.id) as comment_count
            FROM community_discussions cd
            LEFT JOIN readers r ON cd.author_id = r.id
            LEFT JOIN community_likes cl ON cd.id = cl.discussion_id
            LEFT JOIN community_comments cc ON cd.id = cc.discussion_id
            WHERE ${whereClause}
            GROUP BY cd.id, r.username, r.full_name
            ORDER BY ${orderBy}
            LIMIT $1 OFFSET $2
        `;

        // Query para total
        const countQuery = `
            SELECT COUNT(*) 
            FROM community_discussions cd
            WHERE ${whereClause}
        `;

        const [discussionsResult, countResult] = await Promise.all([
            pool.query(discussionsQuery, params),
            pool.query(countQuery, params.slice(2))
        ]);

        res.json({
            discussions: discussionsResult.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        });

    } catch (error) {
        console.error('Erro ao buscar discussões:', error);
        res.status(500).json({ error: 'Erro ao buscar discussões' });
    }
});

// GET - Buscar uma discussão específica
app.get('/api/community/discussions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Incrementar visualizações
        await pool.query(
            'UPDATE community_discussions SET views = views + 1 WHERE id = $1',
            [id]
        );

        const discussionQuery = `
            SELECT 
                cd.*,
                r.username as author_username,
                r.full_name as author_name
            FROM community_discussions cd
            LEFT JOIN readers r ON cd.author_id = r.id
            WHERE cd.id = $1
        `;

        const discussionResult = await pool.query(discussionQuery, [id]);

        if (discussionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Discussão não encontrada' });
        }

        // Buscar comentários
        const commentsQuery = `
            SELECT 
                cc.*,
                r.username as author_username,
                r.full_name as author_name
            FROM community_comments cc
            LEFT JOIN readers r ON cc.author_id = r.id
            WHERE cc.discussion_id = $1
            ORDER BY cc.created_at ASC
        `;

        const commentsResult = await pool.query(commentsQuery, [id]);

        res.json({
            discussion: discussionResult.rows[0],
            comments: commentsResult.rows
        });

    } catch (error) {
        console.error('Erro ao buscar discussão:', error);
        res.status(500).json({ error: 'Erro ao buscar discussão' });
    }
});

// POST - Criar nova discussão
app.post('/api/community/discussions', authenticateToken, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        const authorId = req.user.id;

        if (!title || !content) {
            return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        const result = await pool.query(
            `INSERT INTO community_discussions 
             (title, content, author_id, category) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [title, content, authorId, category || 'geral']
        );

        res.status(201).json({
            success: true,
            discussion: result.rows[0],
            message: 'Discussão criada com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao criar discussão:', error);
        res.status(500).json({ error: 'Erro ao criar discussão' });
    }
});

// POST - Adicionar comentário
app.post('/api/community/discussions/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const authorId = req.user.id;

        if (!content) {
            return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
        }

        // Verificar se a discussão existe
        const discussionCheck = await pool.query(
            'SELECT id FROM community_discussions WHERE id = $1',
            [id]
        );

        if (discussionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Discussão não encontrada' });
        }

        // Inserir comentário
        const commentResult = await pool.query(
            `INSERT INTO community_comments 
             (discussion_id, author_id, content) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [id, authorId, content]
        );

        // Atualizar contador de comentários e marcar como respondida
        await pool.query(
            `UPDATE community_discussions 
             SET comments_count = comments_count + 1, 
                 is_answered = true,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [id]
        );

        res.status(201).json({
            success: true,
            comment: commentResult.rows[0],
            message: 'Comentário adicionado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        res.status(500).json({ error: 'Erro ao adicionar comentário' });
    }
});

// POST - Curtir/Descurtir discussão
app.post('/api/community/discussions/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar se já curtiu
        const existingLike = await pool.query(
            'SELECT id FROM community_likes WHERE discussion_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (existingLike.rows.length > 0) {
            // Remover like
            await pool.query(
                'DELETE FROM community_likes WHERE discussion_id = $1 AND user_id = $2',
                [id, userId]
            );
            await pool.query(
                'UPDATE community_discussions SET likes = GREATEST(likes - 1, 0) WHERE id = $1',
                [id]
            );

            res.json({
                success: true,
                liked: false,
                message: 'Like removido'
            });
        } else {
            // Adicionar like
            await pool.query(
                'INSERT INTO community_likes (discussion_id, user_id) VALUES ($1, $2)',
                [id, userId]
            );
            await pool.query(
                'UPDATE community_discussions SET likes = likes + 1 WHERE id = $1',
                [id]
            );

            res.json({
                success: true,
                liked: true,
                message: 'Discussão curtida!'
            });
        }

    } catch (error) {
        console.error('Erro ao curtir discussão:', error);
        res.status(500).json({ error: 'Erro ao curtir discussão' });
    }
});

// GET - Estatísticas da comunidade
app.get('/api/community/stats', async (req, res) => {
    try {
        const totalDiscussions = await pool.query('SELECT COUNT(*) FROM community_discussions');
        const totalComments = await pool.query('SELECT COUNT(*) FROM community_comments');
        const totalMembers = await pool.query("SELECT COUNT(*) FROM readers WHERE role = 'reader'");
        const onlineMembers = await pool.query("SELECT COUNT(*) FROM readers WHERE is_online = true AND role = 'reader'");

        // Discussões mais populares
        const popularDiscussions = await pool.query(`
            SELECT cd.*, r.username as author_username, r.full_name as author_name
            FROM community_discussions cd
            LEFT JOIN readers r ON cd.author_id = r.id
            ORDER BY cd.likes DESC, cd.views DESC
            LIMIT 5
        `);

        // Membros ativos
        const activeMembers = await pool.query(`
            SELECT id, username, full_name, is_online
            FROM readers 
            WHERE role = 'reader' 
            ORDER BY is_online DESC, created_at DESC
            LIMIT 10
        `);

        res.json({
            totalDiscussions: parseInt(totalDiscussions.rows[0].count),
            totalComments: parseInt(totalComments.rows[0].count),
            totalMembers: parseInt(totalMembers.rows[0].count),
            onlineMembers: parseInt(onlineMembers.rows[0].count),
            popularDiscussions: popularDiscussions.rows,
            activeMembers: activeMembers.rows
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// PUT - Atualizar status online dos usuários
app.put('/api/community/users/online', authenticateToken, async (req, res) => {
    try {
        const { isOnline } = req.body;
        const userId = req.user.id;

        await pool.query(
            'UPDATE readers SET is_online = $1 WHERE id = $2',
            [isOnline, userId]
        );

        res.json({ success: true, message: 'Status atualizado' });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});

// ====================
// ROTA DE VERIFICAÇÃO DE TOKEN
// ====================
app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
    res.json({ 
        success: true, 
        user: { 
            id: req.user.id,
            username: req.user.username, 
            role: req.user.role,
            email: req.user.email
        } 
    });
});

// ====================
// ROTA DE SAÚDE DO SERVIDOR
// ====================
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'ERROR', 
            database: 'disconnected' 
        });
    }
});

// ====================
// MIDDLEWARE DE ERRO
// ====================
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 20MB' });
        }
    }
    
    console.error('Erro:', error);
    res.status(500).json({ 
        error: 'Erro interno do servidor'
    });
});

// ====================
// ROTAS FALLBACK PARA SPA
// ====================
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/admin/index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ====================
// INICIALIZAR SERVIDOR
// ====================
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT} (escutando em 0.0.0.0)`);
    console.log(`📊 Painel Admin: http://localhost:${PORT}/admin`);
    console.log(`🌐 Site Público: http://localhost:${PORT}`);
    
    // Inicializar admin padrão
    await initializeDefaultAdmin();
    console.log(`🔑 Credenciais Admin - Usuário: admin, Senha: admin123`);
});