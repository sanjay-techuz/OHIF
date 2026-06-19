import React from 'react';
import { Button } from '../Button/Button';
import { cn } from '../../lib/utils';

interface FooterActionProps {
  children: React.ReactNode;
  className?: string;
}

interface ActionProps extends FooterActionProps {
  onClick: () => void;
  className?: string;
}

type FooterActionComponent = React.FC<FooterActionProps> & {
  Left: React.FC<FooterActionProps>;
  Right: React.FC<FooterActionProps>;
  Primary: React.FC<ActionProps>;
  Secondary: React.FC<ActionProps>;
  Auxiliary: React.FC<ActionProps>;
};

export const FooterAction: FooterActionComponent = ({ children, className }: FooterActionProps) => {
  // Convert children to array for easier inspection
  const arrayChildren = React.Children.toArray(children);

  // Check if we have a <FooterAction.Left> or <FooterAction.Right> among children
  const hasLeft = arrayChildren.some(
    (child: any) => child.type?.displayName === 'FooterAction.Left'
  );
  const hasRight = arrayChildren.some(
    (child: any) => child.type?.displayName === 'FooterAction.Right'
  );

  // Decide on the justification class based on presence of Left/Right
  let justifyClass = 'justify-between'; // default
  if (hasLeft && !hasRight) {
    justifyClass = 'justify-start';
  } else if (!hasLeft && hasRight) {
    justifyClass = 'justify-end';
  }
  // If both or neither are present, keep justify-between (or adjust if you like)
  return (
    <div className={cn('flex w-full flex-shrink-0 items-center', justifyClass, className)}>
      {children}
    </div>
  );
};

FooterAction.displayName = 'FooterAction';

FooterAction.Left = ({ children }: FooterActionProps) => {
  return <div className="flex items-center">{children}</div>;
};
FooterAction.Left.displayName = 'FooterAction.Left';

FooterAction.Right = ({ children }: FooterActionProps) => {
  return <div className="flex items-center space-x-2">{children}</div>;
};
FooterAction.Right.displayName = 'FooterAction.Right';

// BIEDX-themed action buttons. Match the ACR / Question modal pattern
// (see `platform/ui-next/src/components/ACRSelectorModal/ACRSelectorModal.tsx`
// ~ln 161-193): pink/amber highlight for primary, transparent ghost with
// dark hover for secondary, rounded-8 / min-w-28 / white text. Editing the
// single source here themes every Cancel/Save popup in the app at once
// (Edit Measurement Label, Color Picker, future dialogs).
const BIEDX_ACTION_BASE =
  'min-w-28 h-auto rounded-[8px] px-4 py-2 text-base font-medium text-white';

// Primary action: BIEDX highlight (pink) solid button.
FooterAction.Primary = ({ children, onClick, className }: ActionProps) => {
  return (
    <Button
      variant="default"
      onClick={onClick}
      className={cn(BIEDX_ACTION_BASE, className)}
      style={{ backgroundColor: 'hsl(var(--highlight))' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          'hsl(var(--highlight) / 0.9)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(var(--highlight))';
      }}
    >
      {children}
    </Button>
  );
};
FooterAction.Primary.displayName = 'FooterAction.Primary';

// Secondary action: transparent ghost with dark hover.
FooterAction.Secondary = ({ children, onClick, className }: ActionProps) => {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(BIEDX_ACTION_BASE, className)}
      style={{ backgroundColor: 'transparent' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.backgroundColor = '#2E2E2E';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </Button>
  );
};
FooterAction.Secondary.displayName = 'FooterAction.Secondary';

// Tertiary action: Ghost button with different styling
FooterAction.Auxiliary = ({ children, onClick, className }: ActionProps) => {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={className}
    >
      {children}
    </Button>
  );
};
FooterAction.Auxiliary.displayName = 'FooterAction.Auxiliary';
