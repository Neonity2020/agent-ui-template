import type { Metadata } from "next"
import Link from "next/link"

import { AuthForm } from "@/components/auth-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@agent-ui/ui/card"

export const metadata: Metadata = {
  title: "Sign up",
}

export default function SignUpPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Sign up to keep your chats across sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="sign-up" />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="underline underline-offset-2 hover:text-foreground">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
