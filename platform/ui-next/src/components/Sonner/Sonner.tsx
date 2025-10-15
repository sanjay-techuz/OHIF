import React from 'react';
import { Toaster as Sonner } from 'sonner';
import { Icons } from '../Icons';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      loadingIcon={
        <img
          src="/biedx.png"
          alt="Loading"
          className="h-5 w-5 animate-spin"
        />
      }
      icons={{
        warning: <Icons.StatusWarning />,
        info: <Icons.Info className="text-secondary-foreground" />,
        success: <Icons.StatusSuccess />,
        error: <Icons.StatusError />,
      }}
      theme="dark"
      richColors="true"
      toastOptions={{
        style: {
          width: '430px', // Set a maximum width
          right: '8px',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
