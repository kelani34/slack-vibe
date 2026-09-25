const genericError = 'Sign-in could not be completed. Please try again.';

const errorMessages: Record<string, string> = {
  AccessDenied: 'GitHub access was denied. You can try signing in again.',
  Callback: 'GitHub sign-in could not be completed. Please try again.',
  Configuration: 'Sign-in is temporarily unavailable. Please try again later.',
  OAuthAccountNotLinked: 'Sign in with the GitHub account previously linked to this workspace.',
  OAuthCallbackError: 'GitHub sign-in could not be completed. Please try again.',
  OAuthSignin: 'GitHub sign-in could not be started. Please try again.',
  SessionRequired: 'Your session expired. Sign in again to continue.',
  SessionTokenError: 'Your session expired or is invalid. Sign in again to continue.',
};

export function getAuthErrorMessage(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return genericError;
  return errorMessages[value] ?? genericError;
}
