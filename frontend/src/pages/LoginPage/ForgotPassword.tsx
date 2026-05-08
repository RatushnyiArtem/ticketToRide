// src/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { Link } from 'react-router'; 
import Button from '../../components/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Password reset requested for:", email);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center items-center p-4 font-sans">
      <Link to="/" className="mb-8 font-bold text-2xl text-[#4bbda6] flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
        <span className="text-3xl">🚂</span> TICKET TO RIDE
      </Link>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Reset Password</h2>
        
        {!isSubmitted ? (
          <>
            <p className="text-gray-500 text-sm text-center mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleReset} className="flex flex-col gap-5">
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

              <Button variant="primary" type="submit" className="w-full py-2.5 mt-2">
                Send Reset Link
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-800 font-medium mb-2">Check your email!</p>
            <p className="text-gray-500 text-sm mb-6">If an account exists for {email}, a reset link has been sent.</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-gray-500 hover:text-[#4bbda6] font-medium transition">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}