import * as React from 'react';
import { Label } from '../Label';
import { Input } from '../Input';
import { cn } from '../../lib/utils';

interface UserPreferencesModalProps {
  children: React.ReactNode;
  className?: string;
}

export function UserPreferencesModal({ children, className }: UserPreferencesModalProps) {
  return <div className={cn('flex w-full max-w-4xl flex-col', className)}>{children}</div>;
}

/** Body
 *  Automatically wraps content in a scrollable area.
 */
interface BodyProps {
  children: React.ReactNode;
  className?: string;
}
function Body({ children, className }: BodyProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>
      <div className={cn('mt-1 mb-4 flex flex-col space-y-4', className)}>{children}</div>
    </div>
  );
}

/** Subheading
 *  Section labels
 */
interface SubHeadingProps {
  children: React.ReactNode;
  className?: string;
}
function SubHeading({ children, className }: SubHeadingProps) {
  return (
    <span className={cn('text-primary-light text-xl font-semibold opacity-80', className)}>
      {children}
    </span>
  );
}

/** Responsive 3-column grid for hotkeys, etc. */
interface HotkeysGridProps {
  children: React.ReactNode;
  className?: string;
}
function HotkeysGrid({ children, className }: HotkeysGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {children}
    </div>
  );
}

/** A single hotkey row: label + input */
interface HotkeyProps {
  label: string;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  hotkeys?: {
    record: (callback: (sequence: string[]) => void) => void;
    pause: () => void;
    unpause: () => void;
    startRecording: () => void;
  };
}

function Hotkey({ label, placeholder, className, value, onChange, hotkeys }: HotkeyProps) {
  const [isRecording, setIsRecording] = React.useState(false);

  const onInputKeyDown = (event: React.KeyboardEvent) => {
    event.preventDefault();
    hotkeys?.record((sequence: string[]) => {
      const keys = sequence.join('+');
      hotkeys?.unpause();
      setIsRecording(false);
      onChange?.(keys);
    });
  };

  const onFocus = () => {
    setIsRecording(true);
    hotkeys?.pause();
    hotkeys?.startRecording();
  };

  const onBlur = () => {
    setIsRecording(false);
    hotkeys?.unpause();
  };

  return (
    <div className={cn('flex flex-col items-start justify-between gap-2', className)}>
      <Label className="whitespace-nowrap">{label}</Label>
      <Input
        className={cn(
          'ml-0 text-left',
          isRecording && 'bg-accent text-accent-foreground caret-accent-foreground'
        )}
        placeholder={isRecording ? 'Press keys...' : placeholder}
        value={value}
        onKeyDown={onInputKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={!isRecording}
      />
    </div>
  );
}

/** Attach subcomponents as static properties for a nicer API */
UserPreferencesModal.Body = Body;
UserPreferencesModal.HotkeysGrid = HotkeysGrid;
UserPreferencesModal.Hotkey = Hotkey;
UserPreferencesModal.SubHeading = SubHeading;
