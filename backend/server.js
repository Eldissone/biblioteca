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
const authenticateAdmin = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verificar se o usuário é admin no banco de dados
        const adminCheck = await pool.query(
            "SELECT * FROM readers WHERE id = $1 AND role = 'admin' AND is_active = true",
            [decoded.id]
        );

        if (adminCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }

        req.user = adminCheck.rows[0];
        req.admin = adminCheck.rows[0];
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
};

// ====================
// AUTENTICAÇÃO PARA UTILIZADORES NORMAIS (APROVADOS)
// ====================
const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verificar se o utilizador existe e está aprovado
        const userCheck = await pool.query(
            "SELECT * FROM readers WHERE id = $1 AND role = 'reader' AND is_approved = TRUE AND is_active = TRUE",
            [decoded.id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(401).json({
                error: 'Acesso não autorizado. Aguarde aprovação do administrador.'
            });
        }

        req.user = userCheck.rows[0];
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
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
                `INSERT INTO readers (username, email, password, full_name, role, is_active, is_approved) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ['admin', 'admin@biblioteca.com', hashedPassword, 'Administrador', 'admin', true, true]
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

        // Para utilizadores normais, verificar se estão aprovados
        if (user.role === 'reader' && !user.is_approved) {
            return res.status(401).json({
                error: 'Acesso pendente de aprovação. Aguarde a autorização do administrador.'
            });
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
// GESTÃO DE ACESSO - ROTAS ADMIN
// ====================

// Rota para obter utilizadores pendentes
app.get('/api/admin/pending-readers', authenticateAdmin, async (req, res) => {
    try {
        const readers = await pool.query(`
            SELECT id, username, email, full_name, phone, address, created_at, is_approved 
            FROM readers 
            WHERE is_approved = FALSE AND role = 'reader'
            ORDER BY created_at DESC
        `);
        res.json(readers.rows);
    } catch (error) {
        console.error('Erro ao buscar leitores pendentes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para obter utilizadores aprovados
app.get('/api/admin/approved-readers', authenticateAdmin, async (req, res) => {
    try {
        const readers = await pool.query(`
            SELECT id, username, email, full_name, phone, address, created_at, is_approved, approved_at
            FROM readers 
            WHERE is_approved = TRUE AND role = 'reader'
            ORDER BY approved_at DESC
        `);
        res.json(readers.rows);
    } catch (error) {
        console.error('Erro ao buscar leitores aprovados:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para aprovar utilizador
app.put('/api/admin/readers/:id/approve', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se o utilizador existe e é um leitor
        const userCheck = await pool.query(
            'SELECT * FROM readers WHERE id = $1 AND role = $2',
            [id, 'reader']
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }

        await pool.query(`
            UPDATE readers 
            SET is_approved = TRUE, approved_at = NOW(), approved_by = $1 
            WHERE id = $2 AND role = 'reader'
        `, [req.admin.id, id]);

        res.json({ success: true, message: 'Utilizador aprovado com sucesso' });
    } catch (error) {
        console.error('Erro ao aprovar utilizador:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para rejeitar utilizador
app.put('/api/admin/readers/:id/reject', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM readers WHERE id = $1 AND is_approved = FALSE AND role = $2 RETURNING *',
            [id, 'reader']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizador não encontrado ou já aprovado' });
        }

        res.json({ success: true, message: 'Utilizador rejeitado com sucesso' });
    } catch (error) {
        console.error('Erro ao rejeitar utilizador:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para suspender utilizador
app.put('/api/admin/readers/:id/suspend', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'UPDATE readers SET is_approved = FALSE WHERE id = $1 AND role = $2 RETURNING *',
            [id, 'reader']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizador não encontrado' });
        }

        res.json({ success: true, message: 'Acesso do utilizador suspenso com sucesso' });
    } catch (error) {
        console.error('Erro ao suspender utilizador:', error);
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
            `INSERT INTO readers (username, email, password, full_name, phone, address, role, is_approved) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING id, username, email, full_name, role, created_at, is_approved`,
            [username, email, hashedPassword, full_name, phone || null, address || null, "reader", false]
        );

        res.status(201).json({
            success: true,
            user: newUser.rows[0],
            message: "Conta criada com sucesso! Aguarde a aprovação do administrador."
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
            `SELECT id, username, email, full_name, phone, address, created_at, is_active, role, is_approved 
             FROM readers WHERE role = 'reader' 
             ORDER BY created_at DESC`
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
// ROTAS DA COMUNIDADE - ATUALIZADAS
// ====================

// PUT - Atualizar status online dos usuários
app.put('/api/community/users/online', authenticateToken, async (req, res) => {
    try {
        const { isOnline } = req.body;
        const userId = req.user.id;

        console.log(`🟢 Atualizando status online para usuário ${userId}: ${isOnline}`);

        await pool.query(
            'UPDATE readers SET is_online = $1, updated_at = NOW() WHERE id = $2',
            [isOnline, userId]
        );

        res.json({
            success: true,
            message: 'Status atualizado',
            isOnline
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao atualizar status'
        });
    }
});

// GET - Estatísticas da comunidade (CORRIGIDA)
app.get('/api/community/stats', async (req, res) => {
    try {
        console.log('📊 Buscando estatísticas da comunidade');

        const totalDiscussions = await pool.query('SELECT COUNT(*) FROM community_discussions');
        const totalComments = await pool.query('SELECT COUNT(*) FROM community_comments');
        const totalMembers = await pool.query("SELECT COUNT(*) FROM readers WHERE role = 'reader' AND is_approved = true");
        const onlineMembers = await pool.query("SELECT COUNT(*) FROM readers WHERE is_online = true AND role = 'reader' AND is_approved = true");

        // Membros ativos (apenas os online)
        const activeMembers = await pool.query(`
            SELECT id, username, full_name, is_online
            FROM readers 
            WHERE role = 'reader' 
            AND is_approved = true
            AND is_online = true
            ORDER BY updated_at DESC
            LIMIT 10
        `);

        const stats = {
            totalDiscussions: parseInt(totalDiscussions.rows[0].count) || 0,
            totalComments: parseInt(totalComments.rows[0].count) || 0,
            totalMembers: parseInt(totalMembers.rows[0].count) || 0,
            onlineMembers: parseInt(onlineMembers.rows[0].count) || 0,
            activeMembers: activeMembers.rows
        };

        console.log('✅ Estatísticas carregadas:', stats);

        res.json(stats);

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao buscar estatísticas'
        });
    }
});

// ====================
// ROTAS DA COMUNIDADE - CORRIGIDAS
// ====================

// GET - Listar discussões (ROTA CORRIGIDA)
app.get('/api/community/discussions', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category = 'all',
            tab = 'recent',
            search = ''
        } = req.query;

        console.log('📖 Buscando discussões:', { page, limit, category, tab, search });

        const offset = (page - 1) * limit;

        // Query básica para retornar dados de exemplo
        const discussionsQuery = `
            SELECT 
                cd.*,
                r.username as author_username,
                r.full_name as author_name,
                r.is_online as author_online,
                (SELECT COUNT(*) FROM community_likes cl WHERE cl.discussion_id = cd.id) as like_count,
                (SELECT COUNT(*) FROM community_comments cc WHERE cc.discussion_id = cd.id) as comment_count,
                false as user_liked
            FROM community_discussions cd
            LEFT JOIN readers r ON cd.author_id = r.id
            WHERE 1=1
            ORDER BY cd.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const discussionsResult = await pool.query(discussionsQuery, [limit, offset]);

        // Dados de exemplo se a tabela estiver vazia
        let discussions = discussionsResult.rows;

        if (discussions.length === 0) {
            discussions = [
                {
                    id: 1,
                    title: "Bem-vindo à Comunidade!",
                    content: "Esta é a primeira discussão da nossa comunidade. Sinta-se à vontade para participar!",
                    author_id: 1,
                    category: 'geral',
                    likes: 5,
                    comments_count: 3,
                    views: 25,
                    is_answered: true,
                    created_at: new Date(),
                    updated_at: new Date(),
                    author_username: 'admin',
                    author_name: 'Administrador',
                    author_online: true,
                    user_liked: false
                }
            ];
        }

        const total = discussions.length;
        const totalPages = Math.ceil(total / limit);

        res.json({
            discussions,
            total,
            page: parseInt(page),
            totalPages
        });

    } catch (error) {
        console.error('❌ Erro ao buscar discussões:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao buscar discussões'
        });
    }
});

// POST - Criar discussão (ROTA CORRIGIDA)
app.post('/api/community/discussions', authenticateToken, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        const authorId = req.user.id;

        console.log('📝 Criando discussão:', { title, category, authorId });

        // Validações básicas
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                error: 'Título e conteúdo são obrigatórios'
            });
        }

        // Inserir discussão
        const result = await pool.query(
            `INSERT INTO community_discussions 
             (title, content, author_id, category) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [title, content, authorId, category || 'geral']
        );

        // Buscar dados completos
        const discussion = result.rows[0];

        // Adicionar dados do autor
        const authorResult = await pool.query(
            'SELECT username, full_name, is_online FROM readers WHERE id = $1',
            [authorId]
        );

        const discussionWithAuthor = {
            ...discussion,
            author_username: authorResult.rows[0]?.username,
            author_name: authorResult.rows[0]?.full_name,
            author_online: authorResult.rows[0]?.is_online,
            like_count: 0,
            comment_count: 0,
            user_liked: false
        };

        res.status(201).json({
            success: true,
            discussion: discussionWithAuthor,
            message: 'Discussão criada com sucesso!'
        });

    } catch (error) {
        console.error('❌ Erro ao criar discussão:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao criar discussão'
        });
    }
});

// GET - Buscar uma discussão específica
app.get('/api/community/discussions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📖 Buscando discussão ${id}`);

        // Buscar discussão
        const discussionQuery = `
            SELECT 
                cd.*,
                r.username as author_username,
                r.full_name as author_name,
                r.is_online as author_online,
                (SELECT COUNT(*) FROM community_likes cl WHERE cl.discussion_id = cd.id) as like_count,
                (SELECT COUNT(*) FROM community_comments cc WHERE cc.discussion_id = cd.id) as comment_count,
                false as user_liked
            FROM community_discussions cd
            LEFT JOIN readers r ON cd.author_id = r.id
            WHERE cd.id = $1
        `;

        const discussionResult = await pool.query(discussionQuery, [id]);

        if (discussionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Discussão não encontrada'
            });
        }

        const discussion = discussionResult.rows[0];

        // Buscar comentários
        const commentsQuery = `
            SELECT 
                cc.*,
                r.username as author_username,
                r.full_name as author_name,
                r.is_online as author_online
            FROM community_comments cc
            LEFT JOIN readers r ON cc.author_id = r.id
            WHERE cc.discussion_id = $1
            ORDER BY cc.created_at ASC
        `;

        const commentsResult = await pool.query(commentsQuery, [id]);

        res.json({
            success: true,
            discussion,
            comments: commentsResult.rows
        });

    } catch (error) {
        console.error('❌ Erro ao buscar discussão:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao buscar discussão'
        });
    }
});

// POST - Adicionar comentário
app.post('/api/community/discussions/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const authorId = req.user.id;

        console.log(`💬 Adicionando comentário à discussão ${id}`);

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Conteúdo do comentário é obrigatório'
            });
        }

        // Verificar se a discussão existe
        const discussionCheck = await pool.query(
            'SELECT id FROM community_discussions WHERE id = $1',
            [id]
        );

        if (discussionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Discussão não encontrada'
            });
        }

        // Inserir comentário
        const commentResult = await pool.query(
            `INSERT INTO community_comments 
             (discussion_id, author_id, content) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [id, authorId, content]
        );

        // Buscar dados completos do comentário
        const authorResult = await pool.query(
            'SELECT username, full_name, is_online FROM readers WHERE id = $1',
            [authorId]
        );

        const commentWithAuthor = {
            ...commentResult.rows[0],
            author_username: authorResult.rows[0]?.username,
            author_name: authorResult.rows[0]?.full_name,
            author_online: authorResult.rows[0]?.is_online
        };

        res.status(201).json({
            success: true,
            comment: commentWithAuthor,
            message: 'Comentário adicionado com sucesso!'
        });

    } catch (error) {
        console.error('❌ Erro ao adicionar comentário:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao adicionar comentário'
        });
    }
});

// POST - Curtir/Descurtir discussão
app.post('/api/community/discussions/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        console.log(`❤️  Toggle like para discussão ${id} pelo usuário ${userId}`);

        // Verificar se a discussão existe
        const discussionCheck = await pool.query(
            'SELECT id FROM community_discussions WHERE id = $1',
            [id]
        );

        if (discussionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Discussão não encontrada'
            });
        }

        // Verificar se já curtiu
        const existingLike = await pool.query(
            'SELECT id FROM community_likes WHERE discussion_id = $1 AND user_id = $2',
            [id, userId]
        );

        let liked = false;
        let message = '';

        if (existingLike.rows.length > 0) {
            // Remover like
            await pool.query(
                'DELETE FROM community_likes WHERE discussion_id = $1 AND user_id = $2',
                [id, userId]
            );
            liked = false;
            message = 'Like removido';
        } else {
            // Adicionar like
            await pool.query(
                'INSERT INTO community_likes (discussion_id, user_id) VALUES ($1, $2)',
                [id, userId]
            );
            liked = true;
            message = 'Discussão curtida!';
        }

        res.json({
            success: true,
            liked,
            message
        });

    } catch (error) {
        console.error('❌ Erro ao curtir discussão:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao curtir discussão'
        });
    }
});

// GET - Estatísticas da comunidade
app.get('/api/community/stats', async (req, res) => {
    try {
        console.log('📊 Buscando estatísticas da comunidade');

        const totalDiscussions = await pool.query('SELECT COUNT(*) FROM community_discussions');
        const totalComments = await pool.query('SELECT COUNT(*) FROM community_comments');
        const totalMembers = await pool.query("SELECT COUNT(*) FROM readers WHERE role = 'reader' AND is_approved = true");
        const onlineMembers = await pool.query("SELECT COUNT(*) FROM readers WHERE is_online = true AND role = 'reader' AND is_approved = true");

        // Membros ativos
        const activeMembers = await pool.query(`
            SELECT id, username, full_name, is_online
            FROM readers 
            WHERE role = 'reader' 
            AND is_approved = true
            ORDER BY is_online DESC, created_at DESC
            LIMIT 10
        `);

        const stats = {
            totalDiscussions: parseInt(totalDiscussions.rows[0].count) || 0,
            totalComments: parseInt(totalComments.rows[0].count) || 0,
            totalMembers: parseInt(totalMembers.rows[0].count) || 0,
            onlineMembers: parseInt(onlineMembers.rows[0].count) || 0,
            activeMembers: activeMembers.rows
        };

        console.log('✅ Estatísticas carregadas:', stats);

        res.json(stats);

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao buscar estatísticas'
        });
    }
});

// PUT - Atualizar status online
app.put('/api/community/users/online', authenticateToken, async (req, res) => {
    try {
        const { isOnline } = req.body;
        const userId = req.user.id;

        console.log(`🟢 Atualizando status online para usuário ${userId}: ${isOnline}`);

        await pool.query(
            'UPDATE readers SET is_online = $1, updated_at = NOW() WHERE id = $2',
            [isOnline, userId]
        );

        res.json({
            success: true,
            message: 'Status atualizado',
            isOnline
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno ao atualizar status'
        });
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

        // Leitores pendentes de aprovação
        const pendingReadersRes = await pool.query("SELECT COUNT(*) FROM readers WHERE role = 'reader' AND is_approved = false");

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
            pending_readers: parseInt(pendingReadersRes.rows[0].count, 10) || 0,
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
// ROTA DE VERIFICAÇÃO DE TOKEN
// ====================
app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            email: req.user.email,
            full_name: req.user.full_name
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