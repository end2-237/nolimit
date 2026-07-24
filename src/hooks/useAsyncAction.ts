import { useState, useRef, useCallback } from 'react';

/**
 * Empêche la double-soumission d'une action asynchrone (double-clic / Enter
 * répété), en particulier quand le réseau est lent.
 *
 * - `lock` (useRef) est un verrou SYNCHRONE : il bloque le 2e appel dans le
 *   même tick, AVANT que React n'ait re-rendu le bouton en `disabled`.
 * - `pending` (state) sert à désactiver visuellement le bouton et afficher un
 *   état de chargement.
 *
 * Usage :
 *   const { run, pending } = useAsyncAction(async () => { await save(); });
 *   <form onSubmit={(e) => { e.preventDefault(); run(); }}>
 *     <Button type="submit" disabled={pending}>{pending ? 'Envoi…' : 'Valider'}</Button>
 */
export function useAsyncAction<A extends any[]>(fn: (...args: A) => Promise<unknown> | void) {
  const [pending, setPending] = useState(false);
  const lock = useRef(false);

  const run = useCallback(
    async (...args: A) => {
      if (lock.current) return;
      lock.current = true;
      setPending(true);
      try {
        await fn(...args);
      } finally {
        lock.current = false;
        setPending(false);
      }
    },
    [fn],
  );

  return { run, pending };
}
