"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/onboarding/chat-interface";
import { ProfileCard, type ProfileData } from "@/components/onboarding/profile-card";

export default function OnboardingPage() {
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [completedFields, setCompletedFields] = useState(0);

  const handleProfileUpdate = (
    update: Partial<ProfileData>,
    count: number
  ) => {
    setProfileData((prev) => ({ ...prev, ...update }));
    setCompletedFields(count);
  };

  return (
    <div className="p-6 flex gap-6 max-w-5xl mx-auto min-h-[calc(100vh-8rem)]">
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

      {/* Profile card — hidden on mobile */}
      <div className="hidden md:block w-80">
        <ProfileCard data={profileData} completedFields={completedFields} />
      </div>
    </div>
  );
}
