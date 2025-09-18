import { getCustomParams, type CustomParams } from '@ohif/core';

export { type CustomParams };

export function useCustomParams(): CustomParams {
  // Use the common function - it automatically reads from current URL
  return getCustomParams();
}
