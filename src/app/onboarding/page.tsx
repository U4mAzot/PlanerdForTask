import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">K</span>
            </div>
            <span className="text-xl font-bold">KindCode</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
          <p className="text-muted-foreground text-sm">
            A workspace is where your team collaborates. You can always create more later.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  )
}
