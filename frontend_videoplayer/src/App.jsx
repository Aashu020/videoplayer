// src/App.js
import React from 'react';
import {Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VideoPlayer from './pages/VideoPlayer';

function App() {
  return (
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/video" element={<VideoPlayer/>} />
      </Routes>
  );
}

export default App;