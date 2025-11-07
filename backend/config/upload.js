const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuração de armazenamento
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // pasta onde os PDFs vão ficar
    },
    filename: function (req, file, cb) {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Filtro para aceitar só PDF
const fileFilter = (req, file, cb) => {
    const allowedExt = path.extname(file.originalname).toLowerCase() === '.pdf';
    const allowedMime = file.mimetype === 'application/pdf';

    if (allowedExt && allowedMime) {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos PDF são permitidos!'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // limite 10MB
    fileFilter: fileFilter
});

module.exports = upload;
