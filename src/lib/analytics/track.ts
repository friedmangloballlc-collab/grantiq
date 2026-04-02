import posthog from "posthog-js";

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.capture(event, properties);
  }
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.identify(userId, properties);
  }
}
