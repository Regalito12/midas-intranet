const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');
const path = require('path');

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('No es una imagen, manín. Sube un JPG o PNG.'), false);
        }
    }
});

const verifyToken = require('../middleware/authMiddleware');

// =============================================
// RUTAS DE USUARIOS
// =============================================

router.use(verifyToken);

const authorize = verifyToken.authorize;
const auditInterceptor = require('../middleware/auditInterceptor');

// Auditoría automática para usuarios
router.use(auditInterceptor('user'));

// GET todos los usuarios (Admin)
router.get('/', verifyToken.hasPermission('admin_users'), userController.getAllUsers);

// POST crear usuario (Admin)
router.post('/', verifyToken.hasPermission('admin_users'), userController.createUser);

// PUT actualizar usuario
router.put('/:id', upload.single('avatar'), userController.updateUser);

// DELETE eliminar usuario (Admin)
router.delete('/:id', verifyToken.hasPermission('admin_users'), userController.deleteUser);

// PATCH cambiar contraseña (usuario propio)
router.patch('/:id/password', userController.changePassword);

// PATCH resetear contraseña (Admin)
router.patch('/:id/reset-password', verifyToken.hasPermission('admin_users'), userController.resetPassword);

module.exports = router;
