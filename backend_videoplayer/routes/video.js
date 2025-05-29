// routes/video.js
const express = require('express');
const router = express.Router();
const { 
  updateProgress, 
  getProgress, 
  getAllProgress, 
  deleteProgress 
} = require('../controller/videoController'); // Adjust path to your controller file

router.post('/progress', updateProgress);
router.get('/progress/:videoId', getProgress);
router.get('/progress', getAllProgress);
router.delete('/progress/:videoId', deleteProgress);

router.get('/progress/stats/summary', async (req, res) => {
  try {
    const VideoProgress = require('../models/Progress'); // Adjust path
    const stats = await VideoProgress.getUserStats(); // Adjust for no userId
    res.status(200).json({
      stats: {
        totalVideos: stats.totalVideos,
        totalWatchTime: Math.round(stats.totalWatchTime * 100) / 100,
        averageCompletion: Math.round(stats.averageCompletion * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/progress/bulk', async (req, res) => {
  try {
    const { updates } = req.body;
    const VideoProgress = require('../models/Progress'); // Adjust path
    const results = [];
    for (const update of updates) {
      try {
        let progress = await VideoProgress.findOne({ videoId: update.videoId });
        if (!progress) {
          progress = new VideoProgress({
            videoId: update.videoId,
            duration: update.duration,
            lastPosition: update.currentTime,
            percentage: 0,
            watchedIntervals: [],
            isCompleted: false,
          });
        }
        progress.lastPosition = update.currentTime;
        progress.duration = update.duration;
        if (update.interval) {
          progress.watchedIntervals.push(update.interval);
        }
        await progress.save();
        results.push({
          videoId: update.videoId,
          success: true,
          progress: {
            lastPosition: progress.lastPosition,
            percentage: progress.percentage,
            watchedIntervals: progress.watchedIntervals,
            isCompleted: progress.isCompleted,
          },
        });
      } catch (error) {
        results.push({
          videoId: update.videoId,
          success: false,
          error: error.message,
        });
      }
    }
    res.status(200).json({ results });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Basic error handling
router.use((error, req, res, next) => {
  console.error('Route error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

module.exports = router;