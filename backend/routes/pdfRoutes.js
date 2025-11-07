const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const pool = require('../config/database');
const authenticateToken = require('../middleware/auth');

// Upload de PDF e salvando no banco
router.post('/upload-pdf', authenticateToken, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum PDF foi enviado' });
        }

        // Caminho do arquivo
        const fileUrl = `/uploads/${req.file.filename}`;

        // Exemplo: salvar no banco (tabela pdfs)
        const result = await pool.query(
            'INSERT INTO pdfs (filename, filepath, uploaded_at) VALUES ($1, $2, NOW()) RETURNING *',
            [req.file.originalname, fileUrl]
        );

        res.json({
            success: true,
            message: 'PDF enviado com sucesso!',
            file: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Erro no upload do PDF:', error);
        res.status(500).json({ error: 'Erro ao fazer upload do PDF' });
    }
});

module.exports = router;
