"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ConfirmEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid confirmation link");
      return;
    }

    confirmEmail(token);
  }, [searchParams]);

  const confirmEmail = async (token) => {
    try {
      const res = await fetch(`/api/auth/confirm-email?token=${token}`);
      const data = await res.json();

      if (res.ok) {
        // Store the auth token
        localStorage.setItem("auth_token", data.token);
        setStatus("success");
        setMessage("Email confirmed successfully! Redirecting to profile...");
        
        // Redirect to profile after 2 seconds
        setTimeout(() => {
          router.push("/profile");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to confirm email");
      }
    } catch (error) {
      console.error("Error confirming email:", error);
      setStatus("error");
      setMessage("An error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                <h2 className="text-2xl font-bold">Confirming Email...</h2>
                <p className="text-muted-foreground">
                  Please wait while we verify your email address
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
                <h2 className="text-2xl font-bold text-green-600">
                  Email Confirmed!
                </h2>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-16 w-16 text-red-600 mx-auto" />
                <h2 className="text-2xl font-bold text-red-600">
                  Confirmation Failed
                </h2>
                <p className="text-muted-foreground">{message}</p>
                <div className="pt-4">
                  <Link href="/">
                    <Button>Return to Home</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
