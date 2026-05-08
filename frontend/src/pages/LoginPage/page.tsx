// src/pages/Login.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router'; // Using React Router for navigation
import Button from '../../components/Button';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Later, you will connect this to your Python FastAPI backend!
    console.log("Logging in with:", email, password);
    
    // For now, let's fake a successful login and send them to the game board
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center p-4 font-sans">
      
      {/* Logo / Back to Home */}
      <Link to="/" className="mb-8 font-bold text-2xl text-[#4bbda6] flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
        <span className="text-3xl">🚂</span> TICKET TO RIDE
      </Link>

      {/* Login Card */}
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Welcome Back</h2>
        <p className="text-gray-500 text-sm text-center mb-8">Enter your details to access your account.</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Email Input */}
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

          {/* Password Input */}
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

          {/* Forgot Password Link */}
         <div className="flex justify-end">
  <Link to="/forgot-password" className="text-sm text-[#4bbda6] hover:underline">
    Forgot password?
  </Link>
</div>

          {/* Submit Button */}
          <Button variant="primary" type="submit" className="w-full py-2.5 mt-2">
            Sign In
          </Button>
        </form>

        {/* Sign Up Redirect */}
        <p className="text-center text-sm text-gray-600 mt-8">
  Don't have an account? <Link to="/signup" className="text-[#4bbda6] font-medium hover:underline">Sign up</Link>
</p>
      </div>
    </div>
  );
}