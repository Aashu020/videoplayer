// routes/video.js
const express = require('express');
const router = express.Router();
const { updateProgress, getProgress, getAllProgress, bulkadd,summary} = require('../controller/videoController'); // Adjust path to your controller file

router.post('/progress', updateProgress);
router.get('/progress/:videoId', getProgress);
router.get('/progress', getAllProgress);
router.get('/progress/stats/summary', summary);
router.post('/progress/bulk', bulkadd);

// Basic error handling
router.use((error, req, res, next) => {
  console.error('Route error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

module.exports = router;