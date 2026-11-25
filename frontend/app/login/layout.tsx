import { Suspense, type ReactNode } from "react";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <p className="text-sm text-muted-foreground">Loading sign in...</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
