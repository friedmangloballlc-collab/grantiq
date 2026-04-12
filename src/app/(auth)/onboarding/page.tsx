"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ChatInterface } from "@/components/onboarding/chat-interface";
import { ProfileCard, type ProfileData } from "@/components/onboarding/profile-card";

const TOTAL_FIELDS = 14;

export default function OnboardingPage() {
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [completedFields, setCompletedFields] = useState(0);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  const handleProfileUpdate = (
    update: Partial<ProfileData>,
    count: number
  ) => {
    setProfileData((prev) => ({ ...prev, ...update }));
    setCompletedFields(count);
  };

  const progressPercent = Math.round((completedFields / TOTAL_FIELDS) * 100);

  return (
    <div className="flex flex-col md:block min-h-[calc(100vh-8rem)]">
      {/* Mobile-only: sticky collapsible profile summary bar */}
      <div className="md:hidden sticky top-0 z-10 bg-white dark:bg-warm-900 border-b border-warm-200 dark:border-warm-800 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileProfileOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          aria-expanded={mobileProfileOpen}
          aria-controls="mobile-profile-card"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Progress bar */}
            <div className="flex-1 bg-warm-200 dark:bg-warm-700 rounded-full h-2 max-w-[120px]">
              <div
                className="bg-brand-teal rounded-full h-2 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="text-sm font-medium text-warm-700 dark:text-warm-300 whitespace-nowrap">
              {completedFields} of {TOTAL_FIELDS} fields completed
            </span>
          </div>
          {mobileProfileOpen ? (
            <ChevronUp className="h-4 w-4 text-warm-500 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-warm-500 shrink-0" aria-hidden="true" />
          )}
        </button>

        {/* Expanded profile card panel */}
        {mobileProfileOpen && (
          <div
            id="mobile-profile-card"
            className="px-4 pb-4 border-t border-warm-100 dark:border-warm-800"
          >
            <ProfileCard data={profileData} completedFields={completedFields} />
          </div>
        )}
      </div>

      {/* Main layout: chat + desktop profile card */}
      <div className="p-6 flex gap-6 max-w-5xl mx-auto flex-1">
        {/* Chat panel */}
        <div className="flex-1">
          <div className="bg-white dark:bg-warm-900 rounded-xl border border-warm-200 dark:border-warm-800 h-full p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-1 text-warm-900 dark:text-warm-50">
              Let&apos;s find grants for your organization
            </h2>
            <p className="text-sm text-warm-500 mb-6">
              Answer a few questions and our AI will match you to grants in minutes.
            </p>
            <ChatInterface onProfileUpdate={handleProfileUpdate} />
          </div>
        </div>

        {/* Profile card — desktop only */}
        <div className="hidden md:block w-80">
          <ProfileCard data={profileData} completedFields={completedFields} />
        </div>
      </div>
    </div>
  );
}
