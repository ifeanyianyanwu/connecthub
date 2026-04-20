import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function Page({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="mb-2 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MailCheck className="h-6 w-6" />
                </div>
              </div>
              <CardTitle className="text-center text-2xl">
                Check your email
              </CardTitle>
              <CardDescription className="text-center">
                We sent a confirmation link to verify your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {email ? (
                <p className="text-center text-sm text-muted-foreground">
                  A confirmation email has been sent to{" "}
                  <span className="font-medium text-foreground break-all">
                    {email}
                  </span>
                  . Click the link in the email to activate your account.
                </p>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Please check your inbox and click the confirmation link to
                  activate your account before signing in.
                </p>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder or try
                signing in to resend it.
              </p>

              {/* PWA-friendly navigation — standalone mode has no browser chrome */}
              <Button asChild className="w-full" variant="outline">
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
