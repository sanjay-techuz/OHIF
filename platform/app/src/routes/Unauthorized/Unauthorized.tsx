import { Button, Icons } from '@ohif/ui-next';
import { useAppConfig } from '@state';
import React from 'react';

const Unauthorized = () => {
  const [appConfig] = useAppConfig();

  const handleLogin = () => {
    // LMS login URL is environment-specific (UAT vs prod). Read from env
    // (webpack DefinePlugin replaces `process.env.REACT_APP_LMS_LOGIN_URL` at
    // build time); fall back to the UAT URL so nothing breaks if it's unset.
    window.location.href =
      process.env.REACT_APP_LMS_LOGIN_URL || 'https://biedx.com/learnings/login';
  };

  return (
    <div className="bg-background relative h-screen min-h-full overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#161616] px-7 py-2">
        <div className="flex items-center">
          <div>
            {appConfig.whiteLabeling?.createLogoComponentFn?.(React, {}) || <Icons.OHIFLogo />}
          </div>
        </div>
        <div className="flex items-center">
          <Button
            variant="default"
            onClick={handleLogin}
            className="h-auto px-6 py-2 text-xl font-medium text-white"
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
      <div className="container m-auto flex min-h-[calc(100vh-64px)] justify-center py-20">
        <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
          {/* Banner Image/Icon */}
          <div className="mb-8">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-[rgba(52,106,255,0.15)] bg-[linear-gradient(180deg,#346AFF_0%,#000D32_100%)] shadow-[0_12px_50px_rgba(0,0,0,0.70)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="71"
                height="71"
                viewBox="0 0 71 71"
                fill="none"
              >
                <path
                  d="M49.774 29.2792V23.4233C49.774 15.3381 43.2196 8.78369 35.1344 8.78369C27.0491 8.78369 20.4947 15.3381 20.4947 23.4233V29.2792M35.1344 42.4549V48.3107M25.765 61.4864H44.5037C49.4231 61.4864 51.8828 61.4864 53.7618 60.529C55.4145 59.6869 56.7583 58.3431 57.6004 56.6904C58.5578 54.8114 58.5578 52.3517 58.5578 47.4323V43.3332C58.5578 38.4139 58.5578 35.9542 57.6004 34.0752C56.7583 32.4224 55.4145 31.0787 53.7618 30.2366C51.8828 29.2792 49.4231 29.2792 44.5037 29.2792H25.765C20.8456 29.2792 18.3859 29.2792 16.507 30.2366C14.8542 31.0787 13.5104 32.4224 12.6683 34.0752C11.7109 35.9542 11.7109 38.4139 11.7109 43.3332V47.4323C11.7109 52.3517 11.7109 54.8114 12.6683 56.6904C13.5104 58.3431 14.8542 59.6869 16.507 60.529C18.3859 61.4864 20.8456 61.4864 25.765 61.4864Z"
                  stroke="white"
                  strokeWidth="4.87988"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-foreground mb-3 text-4xl font-semibold">Unauthorized Access</h1>

          {/* Message */}
          <p className="mb-14 text-xl text-white/70">
            You are not authorized to access the viewer.
          </p>
          <p className="mb-6 flex items-center justify-center gap-2 rounded-[100px] border border-[rgba(255,255,255,0.15)] bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.00)_100%)] px-4 py-2 text-base text-white/70">
            Your session may have expired or you do not have the necessary permissions. Please login
            to continue.
          </p>

          {/* Login Button */}
          <Button
            variant="default"
            onClick={handleLogin}
            className="h-auto px-8 py-2.5 text-xl font-medium text-white"
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
      <div className="absolute bottom-[-70%] left-1/2 h-[627px] w-[1408px] -translate-x-1/2 bg-[rgba(52,106,255,0.70)] blur-[300px]" />
    </div>
  );
};

export default Unauthorized;
