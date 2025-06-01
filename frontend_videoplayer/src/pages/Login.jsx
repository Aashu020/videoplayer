import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import img from "../assets/bg.jpg";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    console.log('Login button clicked');
  
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
  
      console.log('Login response:', res); // Log the response to check token and user
      const { token, user } = res.data;
  
      if (token && user) {
        console.log('Token and user data received. Navigating to /video',res.data); // Log navigation step
        localStorage.setItem('token', token);
        localStorage.setItem('userId', user.id);
        navigate('/video');
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data || 'Login failed. Please try again.');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-no-repeat" style={{ backgroundImage: `url(${img})` }}>
      <div className="p-8 rounded-lg shadow-md w-full max-w-sm backdrop-blur-xs">
        <h2 className="text-2xl font-semibold text-center text-white mb-6">Login</h2>

        {error && (
          <div className="mb-4 text-center text-red-500">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="px-4 py-2 text-white backdrop-blur-lg bg-white/5 rounded-md focus:outline-none focus:ring focus:ring-gray-600"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="px-4 py-2 text-white backdrop-blur-lg bg-white/5 rounded-md focus:outline-none focus:ring focus:ring-gray-600"
          />
          <button
            onClick={handleLogin}
            className="hover:bg-[#238ba6] bg-[#1075b0] text-white py-2 rounded-md transition duration-200"
          >
            Login
          </button>
          <p className="text-center text-sm text-white">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
