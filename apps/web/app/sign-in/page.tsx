import type { Metadata } from "next"
import Link from "next/link"

import { AuthForm } from "@/components/auth-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@agent-ui/ui/card"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function SignInPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back — your agent conversations are waiting.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="sign-in" />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            No account?{" "}
            <Link href="/sign-up" className="underline underline-offset-2 hover:text-foreground">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
