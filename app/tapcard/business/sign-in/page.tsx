import { Suspense } from "react";
import SignInForm from "./SignInForm";

export const metadata = { title: "Sign in to TapCard", robots: { index: false, follow: false } };

// One sign-in for company administrators and advisers: enter your email and the link we send takes you to the right place.
// The form reads ?error=expired from the address, so it sits inside Suspense for the production build.
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
