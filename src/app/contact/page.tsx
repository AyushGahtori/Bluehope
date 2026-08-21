import { AppNav } from "@/components/layout/app-nav";
import { Card, LinkButton } from "@/components/ui/primitives";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Card className="p-8">
          <h1 className="text-4xl font-extrabold text-slate-950">Contact BlueHope</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Reach out for support, provider onboarding, or marketplace questions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href="/search">Find support</LinkButton>
            <LinkButton href="/onboarding/provider" variant="outline">List services</LinkButton>
          </div>
        </Card>
      </main>
    </div>
  );
}
