import { setShowUnauthorizedModal } from '@ohif/core/src/utils/showUnauthorizedModal';
import { history } from './history';

/**
 * Initialize the unauthorized redirect function
 * Redirects to /unauthorized route instead of showing a modal
 */
export const initUnauthorizedModal = () => {
  const redirectToUnauthorized = () => {
    if (history.navigate) {
      history.navigate('/unauthorized');
    } else {
      // Fallback if navigate is not available yet
      window.location.href = '/unauthorized';
    }
  };

  setShowUnauthorizedModal(redirectToUnauthorized);
};
