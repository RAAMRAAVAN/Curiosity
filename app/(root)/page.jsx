'use client';

import LoginModal from "@/app/(components)/MyProfile/LoginModal";

export default function RootLoginPage() {
  return (
    <LoginModal
      open={true}
      onClose={() => {}}
      fullScreen
      showSignup={false}
      showForgotPassword={false}
    />
  );
}
