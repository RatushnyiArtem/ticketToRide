import React from "react";
import { Navigate, Route, Routes } from "react-router";

const HomePage = React.lazy(() => import("../pages/HomePage/page"));

const AppRoutes = () => {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;