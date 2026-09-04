import { useCallback, useEffect, useRef, useState } from "react";

/** A transient status message that clears itself after `duration` ms. */
export function useToast(duration = 1800) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string) => {
      setMessage(msg);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), duration);
    },
    [duration],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return { message, showToast };
}
