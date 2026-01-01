export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">
          Next.js + Supabase + shadcn/ui
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Tu proyecto está listo. Comienza a construir tu aplicación.
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>✅ Next.js 15 con App Router</p>
          <p>✅ Supabase configurado</p>
          <p>✅ shadcn/ui + Lucide React</p>
          <p>✅ TypeScript + Tailwind CSS v4</p>
        </div>
      </div>
    </div>
  );
}
