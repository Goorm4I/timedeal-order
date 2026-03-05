import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';

const AdminRoute = ({ children }) => {
  const user = getCurrentUser();
  const isAdmin = user?.email === 'admin@test.com';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;