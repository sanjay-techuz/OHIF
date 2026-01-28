/**
 * Utility function to redirect to unauthorized page
 * This function should be set during app initialization with the navigate function
 */
let redirectToUnauthorizedFn: (() => void) | null = null;

export const setShowUnauthorizedModal = (fn: () => void) => {
  redirectToUnauthorizedFn = fn;
};

export const showUnauthorizedModal = () => {
  if (redirectToUnauthorizedFn) {
    redirectToUnauthorizedFn();
  } else {
    // Fallback to direct redirect if navigate function is not set
    console.warn('Unauthorized redirect function not set, redirecting directly');
    window.location.href = '/unauthorized';
  }
};
