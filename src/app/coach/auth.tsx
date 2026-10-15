import { Redirect } from 'expo-router';

// Target of the Google sign-in redirect. The sign-in screen finishes the
// exchange itself; this route just returns to the coach area if opened directly.
export default function AuthRedirect() {
  return <Redirect href="/coach" />;
}
