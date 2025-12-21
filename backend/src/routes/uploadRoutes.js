const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

// A single route to process an image already uploaded to Supabase Storage
router.post('/process-storage-image', uploadController.processStorageImage);

module.exports = router;
