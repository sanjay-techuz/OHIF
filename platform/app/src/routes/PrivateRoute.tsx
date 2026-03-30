import { useUserAuthentication } from '@ohif/ui-next';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const PrivateRoute = ({ children, handleUnauthenticated }) => {
  const [{ user, enabled }] = useUserAuthentication();
  const location = useLocation();

  // 1. If OIDC auth is enabled, use the standard OIDC flow
  if (enabled && !user) {
    return handleUnauthenticated();
  }

  // 2. If OIDC is NOT enabled, require the encrypted 'data' URL param.
  //    Users must arrive from the LMS with a valid 'data' param in the URL.
  //    A stored token alone is not sufficient — it could be a leftover from a previous session.
  if (!enabled) {
    const searchParams = new URLSearchParams(location.search);
    const hasDataParam = searchParams.has('data');

    if (!hasDataParam) {
      return (
        <Navigate
          to="/unauthorized"
          replace
        />
      );
    }
  }

  return children;
};

export default PrivateRoute;
