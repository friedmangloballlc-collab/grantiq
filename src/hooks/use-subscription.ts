"use client";

import { useOrg } from "./use-org";

const TIER_FEATURES = {
  free: {
    matchingRuns: 1,
    pipelineItems: 3,
    teamMembers: 1,
    aiDrafts: 0,
    hasRoadmap: false,
    hasDigest: false,
  },
  starter: {
    matchingRuns: 5,
    pipelineItems: 10,
    teamMembers: 2,
    aiDrafts: 0,
    hasRoadmap: true,
    hasDigest: true,
  },
  pro: {
    matchingRuns: Infinity,
    pipelineItems: Infinity,
    teamMembers: 5,
    aiDrafts: 1,
    hasRoadmap: true,
    hasDigest: true,
  },
  growth: {
    matchingRuns: Infinity,
    pipelineItems: Infinity,
    teamMembers: 10,
    aiDrafts: 3,
    hasRoadmap: true,
    hasDigest: true,
  },
  enterprise: {
    matchingRuns: Infinity,
    pipelineItems: Infinity,
    teamMembers: Infinity,
    aiDrafts: 5,
    hasRoadmap: true,
    hasDigest: true,
  },
} as const;

export function useSubscription() {
  const { tier } = useOrg();
  return { tier, features: TIER_FEATURES[tier] };
}
