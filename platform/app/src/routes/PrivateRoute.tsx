import {
  getTokenPayloadCache,
  getViewerTokenFromSearch,
  resolveViewerTokenIfPresent,
} from '@ohif/core';
import { LoadingIndicatorProgress, useUserAuthentication } from '@ohif/ui-next';
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type TokenStatus = 'idle' | 'resolving' | 'ok' | 'failed';

export const PrivateRoute = ({ children, handleUnauthenticated }) => {
  const [{ user, enabled }] = useUserAuthentication();
  const location = useLocation();

  const tokenInUrl = getViewerTokenFromSearch(location.search);
  const initialStatus: TokenStatus = !tokenInUrl
    ? 'idle'
    : getTokenPayloadCache()
      ? 'ok'
      : 'resolving';
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(initialStatus);

  useEffect(() => {
    if (!tokenInUrl) {
      return;
    }
    let cancelled = false;
    setTokenStatus('resolving');
    resolveViewerTokenIfPresent().then(ok => {
      if (cancelled) {
        return;
      }
      setTokenStatus(ok ? 'ok' : 'failed');
    });
    return () => {
      cancelled = true;
    };
  }, [tokenInUrl]);

  // 1. OIDC auth gate
  if (enabled && !user) {
    return handleUnauthenticated();
  }

  // 2. Non-OIDC: require either ?data= (legacy) OR a resolved ?t= viewer token
  if (!enabled) {
    const searchParams = new URLSearchParams(location.search);
    const hasDataParam = searchParams.has('data');

    if (!hasDataParam && !tokenInUrl) {
      return (
        <Navigate
          to="/unauthorized"
          replace
        />
      );
    }

    if (tokenInUrl && !hasDataParam) {
      if (tokenStatus === 'resolving' || tokenStatus === 'idle') {
        return (
          <div className="relative h-screen w-screen bg-black">
            <LoadingIndicatorProgress className="h-full w-full" />
          </div>
        );
      }
      if (tokenStatus === 'failed') {
        return (
          <Navigate
            to="/unauthorized"
            replace
          />
        );
      }
    }
  }

  return children;
};

export default PrivateRoute;
