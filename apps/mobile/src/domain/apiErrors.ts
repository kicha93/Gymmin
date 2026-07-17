const networkFailurePatterns = [
  /network request failed/i,
  /failed to fetch/i,
  /network error/i,
  /load failed/i,
  /expo\.modules\.fetch\.nativeresponse/i,
  /cannot convert provided javascriptobject to the sharedobject/i
];

export function isNetworkRequestFailure(error: unknown) {
  return error instanceof Error
    && networkFailurePatterns.some((pattern) => pattern.test(error.message));
}

export function getErrorMessageOrFallback(
  error: unknown,
  fallback: string,
  networkFallback: string
) {
  if (isNetworkRequestFailure(error)) {
    return networkFallback;
  }

  return error instanceof Error ? error.message : fallback;
}
