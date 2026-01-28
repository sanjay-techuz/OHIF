import { Button, Icons } from '@ohif/ui-next';
import { useAppConfig } from '@state';
import React from 'react';

const Unauthorized = () => {
  const [appConfig] = useAppConfig();

  const handleLogin = () => {
    window.location.href = 'http://localhost:8081/login';
  };

  return (
    <div className="bg-background flex h-full w-full flex-col text-white">
      {/* Header */}
      <header className="border-primary-dark flex h-16 items-center justify-between border-b px-7 py-2">
        <div className="flex items-center">
          <div>
            {appConfig.whiteLabeling?.createLogoComponentFn?.(React, {}) || <Icons.OHIFLogo />}
          </div>
        </div>
        <div className="flex items-center">
          <Button
            variant="default"
            onClick={handleLogin}
            className="px-6 py-2 text-base font-medium text-white"
            style={{
              backgroundColor: 'hsl(var(--highlight))',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--highlight) / 0.9)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--highlight))';
            }}
          >
            Login
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex max-w-2xl flex-col items-center justify-center px-6 text-center">
          {/* Banner Image/Icon */}
          <div className="mb-8 flex items-center justify-center">
            <div className="bg-muted/50 flex h-32 w-32 items-center justify-center rounded-full">
              <svg
                className="text-foreground/60 h-16 w-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-foreground mb-4 text-3xl font-semibold">Unauthorized Access</h1>

          {/* Message */}
          <p className="text-foreground/80 mb-2 text-lg">
            You are not authorized to access the viewer.
          </p>
          <p className="text-foreground/60 mb-8 text-base">
            Your session may have expired or you do not have the necessary permissions. Please login
            to continue.
          </p>

          {/* Login Button */}
          <Button
            variant="default"
            onClick={handleLogin}
            className="px-8 py-3 text-base font-medium text-white"
            style={{
              backgroundColor: 'hsl(var(--highlight))',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--highlight) / 0.9)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--highlight))';
            }}
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
