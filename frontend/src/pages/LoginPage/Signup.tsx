// src/pages/Signup.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router'; 
import Button from '../../components/Button';

export default function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Signing up:", username, email);
    // Fake a successful registration and redirect to login
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center p-4 font-sans">
      <Link to="/" className="mb-8 font-bold text-2xl text-[#4bbda6] flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
        <span className="text-3xl">🚂</span> TICKET TO RIDE
      </Link>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Create an Account</h2>
        <p className="text-gray-500 text-sm text-center mb-8">Join the railway network today.</p>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="RailwayBaron99"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4bbda6] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="baron@railway.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4bbda6] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4bbda6] focus:border-transparent transition"
            />
          </div>

          <Button variant="primary" type="submit" className="w-full py-2.5 mt-4">
            Sign Up
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-8">
          Already have an account? <Link to="/login" className="text-[#4bbda6] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}