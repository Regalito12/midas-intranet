const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Asegurar que el directorio uploads existe
const uploadDir = 'uploads';
const fullUploadPath = path.join(__dirname, '../../', uploadDir);

if (!fs.existsSync(fullUploadPath)) {
    fs.mkdirSync(fullUploadPath, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, fullUploadPath);
    },
    filename: (req, file, cb) => {
        // Nombre único: timestamp-nombreOriginalDepurado
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, name + '-' + uniqueSuffix + ext);
    }
});

// Filtro de archivos (opcional, por seguridad básica)
const fileFilter = (req, file, cb) => {
    // Permitir imágenes y PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no soportado. Sube una imagen o PDF.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: fileFilter
});

exports.uploadMiddleware = upload.single('file');

exports.uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    let finalFilename = req.file.filename;

    // Optimizar si es imagen
    if (req.file.mimetype.startsWith('image/')) {
        const sharp = require('sharp');
        const optimizedFilename = `opt-${Date.now()}-${req.file.filename.split('.')[0]}.jpg`;
        const optimizedPath = path.join(fullUploadPath, optimizedFilename);

        try {
            await sharp(req.file.path)
                .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toFile(optimizedPath);

            // Borrar original
            fs.unlinkSync(req.file.path);
            finalFilename = optimizedFilename;
        } catch (err) {
            logger.error('Error optimizando imagen:', err);
            // Si falla la optimización, nos quedamos con la original (ya está guardada por multer)
        }
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${finalFilename}`;

    res.json({
        message: 'Archivo subido exitosamente',
        fileUrl: fileUrl,
        filename: finalFilename,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
};
