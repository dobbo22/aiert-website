import SignInForm from "./SignInForm";

export const metadata = { title: "Sign in to TapCard", robots: { index: false, follow: false } };

// One sign-in for company administrators and advisers: enter your email and the link we send takes you to the right place.
export default function SignInPage() {
  return <SignInForm />;
}
