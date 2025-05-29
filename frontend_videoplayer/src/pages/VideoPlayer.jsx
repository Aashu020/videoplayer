import React, { useState, useEffect, useRef, useCallback } from 'react';
import video from '../video.mp4';
import ReactPlayer from 'react-player';
import { debounce } from 'lodash';

const VIDEO_ID = 'my-video-id';
const API_BASE_URL = '/api/video';

const Toast = ({ message, show, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ease-in-out">
      {message}
    </div>
  );
};

const ResumePrompt = ({ show, onResume, onStartOver, lastPosition }) => {
  if (!show) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h3 className="text-xl font-semibold mb-2">Resume Watching?</h3>
          <p className="text-gray-600 mb-6">
            You were watching this video at {formatTime(lastPosition)}. Would you like to resume from where you left off?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onStartOver}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={onResume}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const VideoPlayer = () => {
  const playerRef = useRef(null);
  const [progress, setProgress] = useState({ played: 0, loaded: 0, playedSeconds: 0 });
  const [duration, setDuration] = useState(0);
  const [seekHistory, setSeekHistory] = useState([]);
  const [watchedTimestamps, setWatchedTimestamps] = useState(new Set());
  const [showToast, setShowToast] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [lastSavedSecond, setLastSavedSecond] = useState(0);
  const [watchedPercent, setWatchedPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [resumeHandled, setResumeHandled] = useState(false);

  // Get or generate userId
  const getUserId = () => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      // userId = crypto.randomUUID();
      localStorage.setItem('userId', userId);
    }
    return userId;
  };

  const apiCall = async (url, options = {}) => {
    try {
      console.log(`Making API call to: ${url}`, options.method || 'GET');
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  const fetchProgress = useCallback(
    async (retryCount = 0, maxRetries = 3) => {
      if (!duration || duration <= 0) {
        setError('Missing duration. Using local storage.');
        const localProgress = localStorage.getItem(`progress_${VIDEO_ID}_${getUserId()}`);
        if (localProgress) {
          const parsedProgress = JSON.parse(localProgress);
          setSavedProgress(parsedProgress);
          setWatchedPercent(parsedProgress.percentage || 0);
          setHasCompleted(parsedProgress.isCompleted || false);
          if (parsedProgress.lastPosition > 10 && !resumeHandled) {
            setShowResumePrompt(true);
          } else {
            setResumeHandled(true);
          }
        } else {
          setSavedProgress({
            lastPosition: 0,
            watchedIntervals: [],
            percentage: 0,
            isCompleted: false,
            watchedTime: 0,
          });
          setResumeHandled(true);
        }
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const userId = getUserId();
        const data = await apiCall(`${API_BASE_URL}/progress/${VIDEO_ID}?duration=${duration}&userId=${userId}`);
        console.log('Fetched progress:', data);

        const { lastPosition, watchedIntervals, percentage, isCompleted, watchedTime } = data;

        if (Array.isArray(watchedIntervals)) {
          const timeSet = new Set();
          watchedIntervals.forEach(([start, end]) => {
            for (let i = Math.floor(start); i <= Math.floor(end); i++) {
              timeSet.add(i);
            }
          });
          setWatchedTimestamps(timeSet);
        }

        setSavedProgress(data);
        setWatchedPercent(percentage || 0);
        setHasCompleted(isCompleted || false);

        localStorage.setItem(`progress_${VIDEO_ID}_${userId}`, JSON.stringify(data));

        if (lastPosition > 10 && !resumeHandled) {
          setShowResumePrompt(true);
        } else {
          setResumeHandled(true);
        }
      } catch (error) {
        let errorMessage = 'Failed to fetch progress';
        if (error.message.includes('Rate limit')) {
          errorMessage = error.message;
        } else if (error.message.includes('Internal server')) {
          errorMessage = `Server error. ${
            retryCount < maxRetries ? `Retrying ${retryCount + 1}/${maxRetries}...` : 'Using local storage.'
          }`;
          if (retryCount < maxRetries) {
            setTimeout(() => fetchProgress(retryCount + 1, maxRetries), 5000);
            return;
          }
        }

        console.error('Failed to fetch progress:', error);
        setError(errorMessage);

        const userId = getUserId();
        const localProgress = localStorage.getItem(`progress_${VIDEO_ID}_${userId}`);
        if (localProgress) {
          const parsedProgress = JSON.parse(localProgress);
          setSavedProgress(parsedProgress);
          setWatchedPercent(parsedProgress.percentage || 0);
          setHasCompleted(parsedProgress.isCompleted || false);
          if (parsedProgress.lastPosition > 10 && !resumeHandled) {
            setShowResumePrompt(true);
          } else {
            setResumeHandled(true);
          }
        } else {
          setSavedProgress({
            lastPosition: 0,
            watchedIntervals: [],
            percentage: 0,
            isCompleted: false,
            watchedTime: 0,
          });
          setResumeHandled(true);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [duration, resumeHandled]
  );

  const sendProgressToBackend = useCallback(
    debounce(
      async (currentTime, interval) => {
        if (!duration || currentTime < 0 || !VIDEO_ID) {
          console.warn('Invalid progress data:', { currentTime, duration, videoId: VIDEO_ID });
          return;
        }
        if (interval && (!Array.isArray(interval) || interval.length !== 2 || !interval.every(num => typeof num === 'number'))) {
          console.warn('Invalid interval:', interval);
          return;
        }

        try {
          const userId = getUserId();
          console.log('Sending progress:', { userId, videoId: VIDEO_ID, currentTime, interval, duration });

          const data = await apiCall(`${API_BASE_URL}/progress`, {
            method: 'POST',
            body: JSON.stringify({
              userId,
              videoId: VIDEO_ID,
              interval,
              currentTime,
              duration,
            }),
          });

          console.log('Progress sent successfully:', data);

          setWatchedPercent(data.percentage || 0);
          if (data.isCompleted && !hasCompleted) {
            setHasCompleted(true);
            setShowToast(true);
          }

          localStorage.setItem(`progress_${VIDEO_ID}_${userId}`, JSON.stringify(data));
        } catch (error) {
          console.error('Failed to send progress:', error);
          setError(error.message);

          const userId = getUserId();
          const localProgress = {
            lastPosition: currentTime,
            watchedIntervals: savedProgress?.watchedIntervals
              ? [...savedProgress.watchedIntervals, interval].filter(Boolean)
              : [interval].filter(Boolean),
            percentage: watchedPercent,
            isCompleted: hasCompleted,
            watchedTime: savedProgress?.watchedTime || 0,
            duration,
          };
          localStorage.setItem(`progress_${VIDEO_ID}_${userId}`, JSON.stringify(localProgress));
        }
      },
      2000,
      { leading: false, trailing: true }
    ),
    [duration, hasCompleted, savedProgress, watchedPercent]
  );

  const handleVideoReady = useCallback(() => {
    console.log('Video is ready');
    setVideoReady(true);
  }, []);

  const handleDuration = useCallback((dur) => {
    console.log('Duration set:', dur);
    setDuration(dur);
  }, []);

  const handleResume = useCallback(() => {
    if (savedProgress && playerRef.current) {
      console.log(`Resuming from ${savedProgress.lastPosition} seconds`);
      playerRef.current.seekTo(savedProgress.lastPosition, 'seconds');
      setLastSavedSecond(savedProgress.lastPosition);
    }
    setShowResumePrompt(false);
    setResumeHandled(true);
  }, [savedProgress]);

  const handleStartOver = useCallback(() => {
    console.log('Starting from beginning');
    if (playerRef.current) {
      playerRef.current.seekTo(0, 'seconds');
    }
    setLastSavedSecond(0);
    setShowResumePrompt(false);
    setResumeHandled(true);
  }, []);

  const handleSeek = useCallback(
    (seconds) => {
      const fromSeconds = progress.playedSeconds;
      console.log(`Seek from ${fromSeconds} to ${seconds}`);

      setSeekHistory((prev) => [...prev, { from: fromSeconds, to: seconds, timestamp: Date.now() }]);

      const intervalStart = Math.min(fromSeconds, seconds);
      const intervalEnd = Math.max(fromSeconds, seconds);
      sendProgressToBackend(seconds, [intervalStart, intervalEnd]);
    },
    [progress.playedSeconds, sendProgressToBackend]
  );

  const handleProgress = useCallback(
    (state) => {
      const currentSecond = Math.floor(state.playedSeconds);
      setProgress(state);

      if (currentSecond <= duration && currentSecond >= 0) {
        setWatchedTimestamps((prev) => {
          if (!prev.has(currentSecond)) {
            return new Set([...prev, currentSecond]);
          }
          return prev;
        });
      }

      if (Math.abs(currentSecond - lastSavedSecond) >= 5 && currentSecond > 0) {
        const intervalStart = Math.min(lastSavedSecond, currentSecond);
        const intervalEnd = Math.max(lastSavedSecond, currentSecond);
        sendProgressToBackend(currentSecond, [intervalStart, intervalEnd]);
        setLastSavedSecond(currentSecond);
      }
    },
    [duration, lastSavedSecond, sendProgressToBackend]
  );

  const handleEnded = useCallback(() => {
    const endSecond = Math.floor(duration);
    console.log('Video ended at:', endSecond);

    setWatchedTimestamps((prev) => new Set([...prev, endSecond]));

    sendProgressToBackend(endSecond, [endSecond, endSecond]);
  }, [duration, sendProgressToBackend]);

  useEffect(() => {
    if (videoReady && duration > 0) {
      fetchProgress();
    }
  }, [videoReady, duration, fetchProgress]);

  const localWatchedTime = watchedTimestamps.size;
  const localWatchedPercent = duration > 0 ? Math.min((localWatchedTime / duration) * 100, 100) : 0;
  const displayWatchedPercent = watchedPercent > 0 ? watchedPercent : localWatchedPercent;

  if (error && !savedProgress) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️ Error</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => {
              setError(null);
              setResumeHandled(false);
              fetchProgress();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex md:flex-row flex-col w-full pr-4 gap-8">
        <div className="bg-white w-full md:w-[30%] h-[100vh] border-r border-gray-200 shadow-md overflow-y-auto">
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Video Stats</h2>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <div className="text-sm text-gray-500 mt-2">Loading progress...</div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Watched Time:</span>
                  <span className="font-medium">{localWatchedTime} sec</span>
                </div>
                <div className="flex justify-between">
                  <span>Watched Percent:</span>
                  <span className="font-medium">{displayWatchedPercent.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{duration.toFixed(0)} sec</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Position:</span>
                  <span className="font-medium">{progress.playedSeconds.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Saved:</span>
                  <span className="font-medium">{lastSavedSecond.toFixed(0)}s</span>
                </div>
                {savedProgress && (
                  <div className="flex justify-between text-blue-600">
                    <span>Resume Point:</span>
                    <span className="font-medium">{savedProgress.lastPosition}s</span>
                  </div>
                )}
                {hasCompleted && (
                  <div className="flex justify-between text-green-600">
                    <span>Status:</span>
                    <span className="font-medium">✅ Completed</span>
                  </div>
                )}
              </div>
            )}

            {seekHistory.length > 0 && (
              <div className="pt-4 border-t border-gray-300">
                <h3 className="font-semibold text-gray-800 mb-2">⏩ Recent Seeks</h3>
                <div className="max-h-32 overflow-y-auto">
                  <ul className="text-xs text-gray-700 space-y-1">
                    {seekHistory.slice(-5).map((seek, index) => (
                      <li key={seek.timestamp} className="flex justify-between">
                        <span>#{seekHistory.length - 5 + index + 1}</span>
                        <span>
                          {seek.from.toFixed(1)}s → {seek.to.toFixed(1)}s
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full mt-10 flex flex-col items-center">
          <ReactPlayer
            ref={playerRef}
            url={video}
            width="100%"
            height="83vh"
            controls={true}
            onProgress={handleProgress}
            onSeek={handleSeek}
            onDuration={handleDuration}
            onEnded={handleEnded}
            onReady={handleVideoReady}
          />

          <div className="w-full mt-4 px-2">
            <div className="w-full h-4 bg-gray-300 rounded overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-out"
                style={{ width: `${displayWatchedPercent}%` }}
              />
            </div>
            <p className="text-center font-medium mt-2 text-lg">
              {displayWatchedPercent.toFixed(1)}% Watched {hasCompleted && ' 🎉'}
            </p>
          </div>
        </div>
      </div>

      <ResumePrompt
        show={showResumePrompt}
        onResume={handleResume}
        onStartOver={handleStartOver}
        lastPosition={savedProgress?.lastPosition || 0}
      />

      <Toast
        message="🎉 Congratulations! You've completed the video!"
        show={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  );
};

export default VideoPlayer;