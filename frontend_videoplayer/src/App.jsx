// src/App.js
import React, { useState } from 'react';
import {Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VideoPlayer from './pages/VideoPlayer';

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  return (
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/video" element={token ? <VideoPlayer token={token} /> : <Navigate to="/login" />} />
      </Routes>
  );
}

export default App;