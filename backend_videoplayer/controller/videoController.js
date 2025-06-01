// controller/videoController.js
const VideoProgress = require('../models/Progress');

const updateProgress = async (req, res) => {
  try {
    const { userId, videoId, interval, currentTime, duration } = req.body;
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      console.error('Invalid userId:', userId);
      return res.status(400).json({ error: 'Invalid or missing userId' });
    }
    if (!videoId || typeof videoId !== 'string') {
      console.error('Invalid videoId:', videoId);
      return res.status(400).json({ error: 'Invalid or missing videoId' });
    }
    if (typeof currentTime !== 'number' || currentTime < 0 || isNaN(currentTime)) {
      console.error('Invalid currentTime:', currentTime);
      return res.status(400).json({ error: 'Invalid or missing currentTime' });
    }
    if (typeof duration !== 'number' || duration <= 0 || isNaN(duration)) {
      console.error('Invalid duration:', duration);
      return res.status(400).json({ error: 'Invalid or missing duration' });
    }

    let progress = await VideoProgress.findOne({ userId, videoId });
    if (!progress) {
      progress = new VideoProgress({
        userId,
        videoId,
        duration,
        watchedIntervals: [],
        lastPosition: 0,
        percentage: 0,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    progress.lastPosition = currentTime;
    progress.duration = duration;
    progress.updatedAt = new Date();

    if (interval && Array.isArray(interval) && interval.length === 2 && interval.every(num => typeof num === 'number' && !isNaN(num))) {
      const [start, end] = interval.map(num => Math.max(0, Math.min(num, duration)));
      if (start <= end) {
        progress.watchedIntervals = mergeIntervals([...progress.watchedIntervals, [start, end]]);
      }
    }

    const totalWatchedTime = calculateWatchedTime(progress.watchedIntervals);
    progress.percentage = duration > 0 ? Math.min((totalWatchedTime / duration) * 100, 100) : 0;
    progress.isCompleted = progress.percentage >= 95;

    await progress.save();

    res.status(200).json({
      percentage: Math.round(progress.percentage * 100) / 100,
      lastPosition: progress.lastPosition,
      isCompleted: progress.isCompleted,
      watchedTime: totalWatchedTime,
      updatedAt: progress.updatedAt,
    });
  } catch (error) {
    console.error('Error updating progress:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

const getProgress = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userId, duration } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const progress = await VideoProgress.findOne({ userId, videoId });
    if (!progress) {
      return res.status(200).json({
        lastPosition: 0,
        percentage: 0,
        watchedIntervals: [],
        isCompleted: false,
        watchedTime: 0,
      });
    }

    if (duration && parseFloat(duration) !== progress.duration) {
      progress.duration = parseFloat(duration);
      const totalWatchedTime = calculateWatchedTime(progress.watchedIntervals);
      progress.percentage = progress.duration > 0 ? Math.min((totalWatchedTime / progress.duration) * 100, 100) : 0;
      progress.isCompleted = progress.percentage >= 95;
      await progress.save();
    }

    const totalWatchedTime = calculateWatchedTime(progress.watchedIntervals);

    res.status(200).json({
      lastPosition: progress.lastPosition,
      percentage: Math.round(progress.percentage * 100) / 100,
      watchedIntervals: progress.watchedIntervals,
      isCompleted: progress.isCompleted,
      watchedTime: totalWatchedTime,
      duration: progress.duration,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
    });
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

const getAllProgress = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const progressList = await VideoProgress.find({ userId });
    res.status(200).json({
      progress: progressList.map(p => ({
        videoId: p.videoId,
        lastPosition: p.lastPosition,
        percentage: Math.round(p.percentage * 100) / 100,
        isCompleted: p.isCompleted,
        duration: p.duration,
        watchedTime: calculateWatchedTime(p.watchedIntervals),
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error getting all progress:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Helper function to merge overlapping intervals
function mergeIntervals(intervals) {
  if (intervals.length <= 1) return intervals;
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const lastMerged = merged[merged.length - 1];
    if (current[0] <= lastMerged[1]) {
      lastMerged[1] = Math.max(lastMerged[1], current[1]);
    } else {
      merged.push(current);
    }
  }
  return merged;
}

// Helper function to calculate total watched time
function calculateWatchedTime(intervals) {
  return intervals.reduce((total, [start, end]) => total + (end - start), 0);
}

const bulkadd = async(req,res) => {
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
}

const summary = async(req, res) => {
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
}

module.exports = {
  updateProgress,
  getProgress,
  getAllProgress,
  bulkadd,
  summary
};