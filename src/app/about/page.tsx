import { AppNav } from "@/components/layout/app-nav";
import { Card } from "@/components/ui/primitives";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Card className="p-8">
          <h1 className="text-4xl font-extrabold text-slate-950">About BlueHope</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            BlueHope helps families discover structured, trustworthy support for children and family members with
            special needs. This foundation keeps parent data private while making provider discovery easier.
          </p>
        </Card>
      </main>
    </div>
  );
}
