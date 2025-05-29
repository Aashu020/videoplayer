const mongoose = require("mongoose");

const videoProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  videoId: { type: String, required: true },
  duration: { type: Number, required: true },
  watchedIntervals: [[Number]], // Array of [start, end] intervals
  lastPosition: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

videoProgressSchema.statics.getUserStats = async function (userId) {
  const progresses = await this.find({ userId });
  const totalWatchTime = progresses.reduce(
    (sum, p) => sum + calculateWatchedTime(p.watchedIntervals),
    0
  );
  const averageCompletion =
    progresses.length > 0
      ? progresses.reduce((sum, p) => sum + p.percentage, 0) / progresses.length
      : 0;
  return {
    totalVideos: progresses.length,
    totalWatchTime,
    averageCompletion,
    completedVideos: progresses.filter((p) => p.isCompleted).length,
  };
};

function calculateWatchedTime(intervals) {
  return intervals.reduce((total, [start, end]) => total + (end - start), 0);
}

module.exports = mongoose.model("VideoProgress", videoProgressSchema);