import React from 'react';
import { Toaster as Sonner } from 'sonner';
import { Icons } from '../Icons';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * BIEDX-themed toaster.
 *
 * Wraps the `sonner` library but disables `richColors` (the maroon/red,
 * green, amber surfaces that ship out-of-the-box and look generic) and
 * applies our own dark surface + brand accent palette via `toastOptions.
 * classNames`. This keeps the toast looking like part of the BIEDX viewer
 * rather than the default OHIF/sonner appearance.
 *
 * Palette:
 *   - surface = `--background` (dark navy used by the viewer chrome)
 *   - border  = `--highlight` (#FF2768 BIEDX pink) for error / brand accent
 *   - text    = `--foreground` for body, `--highlight` for error titles
 */
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
        info: <Icons.Info className="text-[#F59E0B]" />,
        success: <Icons.StatusSuccess />,
        error: <Icons.StatusError className="text-[#F59E0B]" />,
      }}
      theme="dark"
      // Distance from viewport edges. The previous `20px` value (less
      // than Sonner's 32px default) pushed toasts closer to the right
      // edge and clipped the inline action button (e.g. ErrorBoundary
      // "Show Details"). 48px gives comfortable right-margin breathing
      // room. The CSS rule for [data-sonner-toaster] in tailwind.css
      // also forces `right: 48px` as a belt-and-suspenders fallback in
      // case the Sonner version doesn't honour this prop format.
      offset="48px"
      toastOptions={{
        style: {
          width: '380px',
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid #2D2728',
          borderRadius: '12px',
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
          padding: '12px 14px',
          // Inter is the BIEDX app font — explicitly set so sonner can't
          // fall back to the OS default sans-serif.
          fontFamily: "'Inter', sans-serif",
        },
        classNames: {
          toast: 'biedx-toast',
          title: 'biedx-toast__title',
          description: 'biedx-toast__description',
          actionButton: 'biedx-toast__action',
          cancelButton: 'biedx-toast__cancel',
          closeButton: 'biedx-toast__close',
          icon: 'biedx-toast__icon',
          error: 'biedx-toast--error',
          success: 'biedx-toast--success',
          warning: 'biedx-toast--warning',
          info: 'biedx-toast--info',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
