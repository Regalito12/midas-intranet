const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', verifyToken.hasPermission('view_policies'), policyController.getAllPolicies);
router.get('/search', verifyToken.hasPermission('view_policies'), policyController.searchPolicies);
router.get('/category/:category', verifyToken.hasPermission('view_policies'), policyController.getPoliciesByCategory);
router.get('/:id', verifyToken.hasPermission('view_policies'), policyController.getPolicyById);
router.post('/', verifyToken.hasPermission('manage_policies'), policyController.createPolicy);
router.put('/:id', verifyToken.hasPermission('manage_policies'), policyController.updatePolicy);
router.delete('/:id', verifyToken.hasPermission('manage_policies'), policyController.deletePolicy);

module.exports = router;
