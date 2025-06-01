import React, { useState, useEffect, useRef, useCallback } from 'react';
import video from '../video.mp4';
import ReactPlayer from 'react-player';
import { debounce } from 'lodash';
import Toast from "../components/Toaster";

const VIDEO_ID = 'my-video-id';
const API_BASE_URL = '/api/video';

const VideoPlayer = () => {
  const playerRef = useRef(null);
  const [progress, setProgress] = useState({ played: 0, loaded: 0, playedSeconds: 0 });
  const [duration, setDuration] = useState(0);
  const [seekHistory, setSeekHistory] = useState([]);
  const [watchedTimestamps, setWatchedTimestamps] = useState(new Set());
  const [showToast, setShowToast] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [lastSavedSecond, setLastSavedSecond] = useState(0);
  const [error, setError] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [getUserId, setGetUserId] = useState("0");
  const [hasResumed, setHasResumed] = useState(false); // Track if we've already resumed

  // Fixed: getUserId should be a function that returns the user ID
  const getUserIdValue = useCallback(() => {
    return getUserId;
  }, [getUserId]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      setGetUserId(userId);
    }
  }, []);

  const apiCall = async (url, options = {}) => {
    try {
      // console.log(`Making API call to: ${url}`, options.method || 'GET');
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
        setError('Missing duration. Waiting for video to load.');
        return;
      }

      try {
        setError(null);
        const userId = getUserIdValue(); // Fixed: Use the function
        const data = await apiCall(`${API_BASE_URL}/progress/${VIDEO_ID}?duration=${duration}&userId=${userId}`);
        // console.log('Fetched progress from API:', data);

        const { lastPosition, watchedIntervals, isCompleted } = data;

        // Initialize watchedTimestamps from API data
        const timeSet = new Set();
        if (Array.isArray(watchedIntervals)) {
          watchedIntervals.forEach(([start, end]) => {
            for (let i = Math.floor(start); i <= Math.floor(end); i++) {
              timeSet.add(i);
            }
          });
        }
        setWatchedTimestamps(timeSet);
        setSavedProgress(data);
        setHasCompleted(isCompleted || false);
        
        // Fixed: Set the last saved second from API data
        if (lastPosition) {
          setLastSavedSecond(Math.floor(lastPosition));
        }

        // Auto-resume: Seek to saved position if it exists and we haven't resumed yet
        if (lastPosition && lastPosition > 0 && !hasResumed && playerRef.current) {
          // console.log(`Auto-resuming video at position: ${lastPosition}s`);
          playerRef.current.seekTo(lastPosition, 'seconds');
          setHasResumed(true);
        }
      } catch (error) {
        let errorMessage = 'Failed to fetch progress from API';
        if (error.message.includes('Rate limit')) {
          errorMessage = error.message;
        } else if (error.message.includes('Internal server')) {
          errorMessage = `Server error. ${
            retryCount < maxRetries ? `Retrying ${retryCount + 1}/${maxRetries}...` : 'Unable to load progress.'
          }`;
          if (retryCount < maxRetries) {
            setTimeout(() => fetchProgress(retryCount + 1, maxRetries), 2000);
            return;
          }
        }

        // console.error('Failed to fetch progress:', error);
        setError(errorMessage);
        setSavedProgress({
          lastPosition: 0,
          watchedIntervals: [],
          percentage: 0,
          isCompleted: false,
          watchedTime: 0,
        });
      } 
    },
    [duration, getUserIdValue, hasResumed]
  );

  const sendProgressToBackend = useCallback(
    debounce(
      async (currentTime, interval) => {
        if (!duration || currentTime < 0 || !VIDEO_ID) {
          // console.warn('Invalid progress data:', { currentTime, duration, videoId: VIDEO_ID });
          return;
        }
        if (interval && (!Array.isArray(interval) || interval.length !== 2 || !interval.every(num => typeof num === 'number'))) {
          // console.warn('Invalid interval:', interval);
          return;
        }

        try {
          const userId = getUserIdValue(); // Fixed: Use the function
          // console.log('Sending progress:', { userId, videoId: VIDEO_ID, currentTime, interval, duration });

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

          // console.log('Progress sent successfully:', data);

          // Update watchedTimestamps with the new interval from API response
          if (Array.isArray(data.watchedIntervals)) {
            const timeSet = new Set(watchedTimestamps);
            data.watchedIntervals.forEach(([start, end]) => {
              for (let i = Math.floor(start); i <= Math.floor(end); i++) {
                timeSet.add(i);
              }
            });
            setWatchedTimestamps(timeSet);
          }

          if (data.isCompleted && !hasCompleted) {
            setHasCompleted(true);
          }
          if (localWatchedPercent.toFixed(2) == 100.00 && !hasCompleted) {
            setShowToast(true);
          }

          setSavedProgress(data);
        } catch (error) {
          // console.error('Failed to send progress:', error);
          setError(error.message);
        }
      },
      2000,
      { leading: false, trailing: true }
    ),
    [duration, hasCompleted, watchedTimestamps, getUserIdValue]
  );

  const handleVideoReady = useCallback(() => {
    // console.log('Video is ready');
    setVideoReady(true);
  }, []);

  const handleDuration = useCallback((dur) => {
    // console.log('Duration set:', dur);
    setDuration(dur);
  }, []);

  const handleSeek = useCallback(
    (seconds) => {
      const fromSeconds = progress.playedSeconds;
      // console.log(`Seek from ${fromSeconds} to ${seconds}`);

      setSeekHistory((prev) => [...prev, { from: fromSeconds, to: seconds, timestamp: Date.now() }]);

      // Fixed: Only send progress if there's a meaningful difference
      if (Math.abs(fromSeconds - seconds) > 1) {
        const intervalStart = Math.min(fromSeconds, seconds);
        const intervalEnd = Math.max(fromSeconds, seconds);
        sendProgressToBackend(seconds, [intervalStart, intervalEnd]);
      }
    },
    [progress.playedSeconds, sendProgressToBackend]
  );

  const handleProgress = useCallback(
    (state) => {
      const currentSecond = Math.floor(state.playedSeconds);
      setProgress(state);

      // Fixed: Add current second to watched timestamps
      if (currentSecond <= duration && currentSecond >= 0) {
        setWatchedTimestamps((prev) => {
          if (!prev.has(currentSecond)) {
            const newSet = new Set(prev);
            newSet.add(currentSecond);
            return newSet;
          }
          return prev;
        });
      }

      // Fixed: Send progress every 2 seconds or when there's a significant jump
      if ((Math.abs(currentSecond - lastSavedSecond) >= 2 && currentSecond > 0) || 
          (currentSecond > 0 && lastSavedSecond === 0)) {
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
    // console.log('Video ended at:', endSecond);

    setWatchedTimestamps((prev) => {
      const newSet = new Set(prev);
      newSet.add(endSecond);
      return newSet;
    });

    sendProgressToBackend(endSecond, [endSecond, endSecond]);
  }, [duration, sendProgressToBackend]);

  useEffect(() => {
    if (videoReady && duration > 0) {
      fetchProgress();
    }
  }, [videoReady, duration, fetchProgress]);

  // Calculate watched percentage based on watched time (watchedTimestamps)
  const localWatchedTime = watchedTimestamps.size;
  const localWatchedPercent = duration > 0 ? Math.min((localWatchedTime / duration) * 100, 100) : 0;

  if (error && !savedProgress) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️ Error</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => {
              setError(null);
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
      <div className="flex md:flex-row flex-col w-full pr-4 gap-8 bg-gray-300">
        <div className="bg-white w-full md:w-[30%] h-[100vh] border-r border-gray-200 shadow-md overflow-y-auto">
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Video Stats</h2>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Watched Time:</span>
                  <span className="font-medium">{localWatchedTime} sec</span>
                </div>
                <div className="flex justify-between">
                  <span>Watched Percent:</span>
                  <span className="font-medium">{localWatchedPercent.toFixed(2)}%</span>
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
                {/* {savedProgress && (
                  <div className="flex justify-between text-blue-600">
                    <span>Resume Point:</span>
                    <span className="font-medium">{savedProgress.lastPosition}s</span>
                  </div>
                )} */}
                {hasCompleted && (
                  <div className="flex justify-between text-green-600">
                    <span>Status:</span>
                    <span className="font-medium">✅ Completed</span>
                  </div>
                )}
              </div>

              {seekHistory.length > 0 && (
              <div className="pt-4 border-t border-gray-300 shadow-md p-4">
                <h3 className="font-semibold text-gray-800 mb-2">⏩ All Seeks:- {seekHistory.length}</h3>
                <div className="h-[45vh] overflow-y-auto hide-scrollbar">
                  <ul className="text-xs text-gray-700 space-y-1">
                    {seekHistory.map((seek, index) => (
                      <li key={seek.timestamp} className="flex justify-between">
                        <span>{index + 1})</span>
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
            height="80vh"
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
                style={{ width: `${localWatchedPercent}%` }}
              />
            </div>
            <p className="text-center font-medium mt-2 text-lg">
              {localWatchedPercent.toFixed(1)}% Watched {hasCompleted}
            </p>
          </div>
        </div>
      </div>

      <Toast
        message="🎉 Congratulations! You've completed the video!"
        show={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  );
};

export default VideoPlayer