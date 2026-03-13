/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {{
 *   callbackUrl?: string | null;
 *   callbackHeaders?: Record<string, string> | null;
 * }} options
 */
export function createProgressReporter(options) {
  const callbackUrl = options.callbackUrl ?? null;
  const callbackHeaders = options.callbackHeaders ?? {};

  /**
   * @param {string} status
   * @param {number} progress
   * @param {Record<string, unknown>} [extra]
  */
  return async (status, progress, extra = {}) => {
    console.log(
      JSON.stringify({
        type: "progress",
        status,
        progress,
        ...extra,
      }),
    );

    if (!callbackUrl) {
      return;
    }

    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "remotion-proxy-spike-node/1.0",
        ...callbackHeaders,
      },
      body: JSON.stringify({
        status,
        progress,
        ...extra,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Callback returned HTTP ${response.status}: ${details || "unknown error"}`,
      );
    }
  };
}
