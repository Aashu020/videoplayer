# Video Player with Progress Tracking

A React-based video player component with advanced progress tracking, auto-resume functionality, and comprehensive viewing analytics.

## How to run Project:-
 # Frontend:
   Go to frontend_videoplayer directory by :- 1) cd frontend_videoplayer
                                              2) npm i
                                              3)npm run dev
# Backend
  Go to backend_videoplayer directory by :- 1) cd backend_videoplayer
                                            2) npm i
                                            3) nodemon / npx nodemon index.js / node index.js

## Features

### Core Functionality
- Auto-Resume: Automatically resumes video from where user left off on page reload/login
- Progress Tracking: Real-time tracking of watched segments and overall progress
- Seek History: Complete log of all user navigation within the video
- Completion Detection: Automatic detection and celebration when video is fully watched
- Error Handling: Robust error handling with retry mechanisms

### Analytics Dashboard
- Watched Time: Total seconds of video content viewed
- Watch Percentage: Percentage of video completed
- Current Position: Real-time playback position
- Resume Point: Last saved position for auto-resume
- Completion Status: Visual indicator when video is fully watched

## Prerequisites

- React 16.8+
- Node.js 14+
- Backend API for progress storage
- Video file (MP4 format recommended)

## Dependencies

```json
{
  "react": "^16.8.0",
  "react-player": "^2.x.x",
  "lodash": "^4.x.x"
}
```

## Installation

1. Install required dependencies:
```bash
npm install react-player lodash
```

2. Add your video file to the project:
```
src/
  video.mp4
```

3. Create/implement the Toast component:
```javascript
// components/Toaster.js
const Toast = ({ message, show, onClose }) => {
  // Your toast implementation
};
```

## Configuration

### Environment Variables
```javascript
const VIDEO_ID = 'your-unique-video-id';
const API_BASE_URL = '/api/video';
```

### API Endpoints Required

#### GET Progress
```
GET /api/video/progress/:videoId?duration=:duration&userId=:userId
```

**Response:**
```json
{
  "lastPosition": 120.5,
  "watchedIntervals": [[0, 45], [60, 120]],
  "percentage": 75.2,
  "isCompleted": false,
  "watchedTime": 105
}
```

#### POST Progress
```
POST /api/video/progress
```

**Request Body:**
```json
{
  "userId": "user123",
  "videoId": "video456",
  "interval": [120, 125],
  "currentTime": 125.3,
  "duration": 300
}
```

## Usage

### Basic Implementation
```javascript
import VideoPlayer from './components/VideoPlayer';

function App() {
  return (
    <div className="App">
      <VideoPlayer />
    </div>
  );
}
```

### User ID Setup
The component expects a userId in localStorage:
```javascript
localStorage.setItem("userId", "your-user-id");
```

## Component Structure

The VideoPlayer component manages:
- State Management: Progress tracking, video metadata, user session, error handling
- API Integration: Progress fetching, saving, and error recovery
- Event Handlers: Video events, seek tracking, progress updates
- UI Components: Video player, statistics panel, progress visualization

## Statistics Panel

The left sidebar displays:
- Watched Time: Total seconds viewed
- Watched Percent: Completion percentage
- Duration: Total video length
- Current Position: Real-time playback position
- Last Saved: Most recent saved position
- Resume Point: Position for auto-resume
- Status: Completion indicator
- All Seeks: Complete navigation history

## Customization

### Styling
The component uses Tailwind CSS classes. Modify these for customization:
- Panel width: `md:w-[30%]`
- Video height: `height="83vh"`
- Progress bar colors: `from-green-400 to-green-600`

### Behavior
```javascript
// Adjust save frequency (default: every 5 seconds)
if (Math.abs(currentSecond - lastSavedSecond) >= 5) {
  // Save progress
}

// Modify debounce delay (default: 2000ms)
debounce(sendProgressToBackend, 2000)
```

## Error Handling

The component handles:
- API Failures: Retry logic with exponential backoff
- Rate Limiting: User-friendly error messages
- Network Issues: Graceful degradation
- Invalid Data: Data validation and sanitization

## Troubleshooting

### Common Issues

**Video doesn't auto-resume:**
- Check if lastPosition is returned from API
- Verify playerRef.current is available
- Ensure hasResumed state is working correctly

**Progress not saving:**
- Check API endpoint configuration
- Verify userId in localStorage
- Check network connectivity
- Review debounce timing

**Statistics not updating:**
- Verify video duration is set
- Check watchedTimestamps state updates
- Ensure progress calculations are correct

## Performance Optimization

- Debounced API calls reduce server load
- Efficient Set operations for timestamp tracking
- Memoized callbacks prevent unnecessary re-renders
- Optimized re-render cycles with proper dependencies

**Note**: This component requires a backend API for full functionality. Ensure your backend implements the required endpoints before deployment.
