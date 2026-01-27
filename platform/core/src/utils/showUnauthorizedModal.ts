/**
 * Utility function to show unauthorized modal
 * This function should be set during app initialization with the UIModalService instance
 */
let showUnauthorizedModalFn: (() => void) | null = null;

export const setShowUnauthorizedModal = (fn: () => void) => {
  showUnauthorizedModalFn = fn;
};

export const showUnauthorizedModal = () => {
  if (showUnauthorizedModalFn) {
    showUnauthorizedModalFn();
  } else {
    // Fallback to direct redirect if modal function is not set
    console.warn('Unauthorized modal function not set, redirecting directly');
    window.location.href = 'http://localhost:8081/login';
  }
};
