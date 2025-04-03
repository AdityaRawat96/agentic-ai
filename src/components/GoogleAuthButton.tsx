"use client";

import { Button } from "@/components/ui/button";

export function GoogleAuthButton() {
  const handleGoogleAuth = async () => {
    try {
      const response = await fetch("/api/auth/google");
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to initiate Google auth:", error);
    }
  };

  return (
    <Button
      onClick={handleGoogleAuth}
      variant="outline"
      className="w-full mt-4"
    >
      Connect with Google Search Console
    </Button>
  );
}
