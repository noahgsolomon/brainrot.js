"use client";

import { useEffect, useMemo, useState } from "react";

export function formatEtaSeconds(ms: number | null | undefined) {
  if (ms === null || ms === undefined) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  return `${totalSeconds}s`;
}

export function useLiveEta(
  estimatedMs: number | null | undefined,
  isActive: boolean,
) {
  const [anchor, setAnchor] = useState(() => ({
    estimatedMs: estimatedMs ?? null,
    startedAt: Date.now(),
  }));
  const [tickNow, setTickNow] = useState(() => Date.now());

  useEffect(() => {
    const now = Date.now();
    setAnchor({
      estimatedMs: estimatedMs ?? null,
      startedAt: now,
    });
    setTickNow(now);
  }, [estimatedMs]);

  useEffect(() => {
    if (!isActive || anchor.estimatedMs === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTickNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [anchor.estimatedMs, isActive]);

  return useMemo(() => {
    if (!isActive || anchor.estimatedMs === null) {
      return anchor.estimatedMs;
    }

    return Math.max(anchor.estimatedMs - (tickNow - anchor.startedAt), 0);
  }, [anchor, isActive, tickNow]);
}
