import React from "react";
import { Navigate, Route, Routes } from "react-router";

const HomePage = React.lazy(() => import("../pages/HomePage/page"));
const LoginPage = React.lazy(() => import("../pages/LoginPage/page"));
const SignupPage = React.lazy(() => import("../pages/LoginPage/Signup"));
const ForgotPasswordPage = React.lazy(() => import("../pages/LoginPage/ForgotPassword"));
const GamePage = React.lazy(() => import("../pages/GamePage/page"));

const AppRoutes = () => {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/game" element={<GamePage />} />
        </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;