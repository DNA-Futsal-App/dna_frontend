import { AlertCircle, RotateCcw } from "lucide-react";

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-label="Carregando conteúdo">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface h-32 rounded-2xl p-4">
          <div className="skeleton h-4 w-24 rounded-full" />
          <div className="mt-6 flex items-center justify-between">
            <div className="skeleton h-10 w-36 rounded-xl" />
            <div className="skeleton h-9 w-14 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="surface rounded-2xl p-6 text-center" role="alert">
      <AlertCircle className="mx-auto size-8 text-coral" aria-hidden="true" />
      <p className="mt-3 font-bold text-ivory">Não foi possível carregar</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{message}</p>
      {onRetry ? (
        <button onClick={onRetry} type="button" className="btn-ghost mt-4 !min-h-10 !px-4 !py-2 text-sm">
          <RotateCcw className="size-4" aria-hidden="true" /> Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface rounded-2xl px-5 py-10 text-center">
      <p className="font-bold text-ivory">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}
