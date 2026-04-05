# GrantAQ Complete Audit Checklist

Use this checklist to verify every feature, page, and flow works correctly.
Test on both desktop and mobile. Check off each item as you verify it.

---

## 1. MARKETING SITE (logged out)

### Homepage (grantaq.com)
- [ ] Page loads without errors
- [ ] GrantAQ logo (not Sparkles icon) in nav bar
- [ ] Mobile hamburger menu opens and shows all links
- [ ] Hero section: "AI + Expert Grant Writers" badge visible
- [ ] Stats bar shows real grant count (not hardcoded "5,000+")
- [ ] "How It Works" section displays 3 steps
- [ ] "Features" section shows 8+ feature cards including "Expert Review"
- [ ] "How We Work" section shows 4-step AI+Human workflow
- [ ] "Free Tools" CTA section with 3 buttons
- [ ] Nonprofit Services section with 2 cards
- [ ] Pricing table shows all 5 tiers (Explorer/Seeker/Strategist/Applicant/Organization)
- [ ] Pricing subtitle says "Start free, upgrade as you grow"
- [ ] FAQ section — click each question, verify it expands
- [ ] Bottom CTA with "Get Started Free" button
- [ ] Footer has industry grant links (click one — should go to /grants/industry/...)
- [ ] Footer has state grant links (click one — should work)
- [ ] Privacy Policy link works
- [ ] Terms of Service link works
- [ ] Cookie consent banner appears on first visit

### Pricing Page (/pricing)
- [ ] Page loads (not 404)
- [ ] Shows all 5 tiers with correct prices
- [ ] "Get Started" buttons link to /signup

### Blog (/blog)
- [ ] Blog index loads with 5 posts
- [ ] Click a post — full article loads
- [ ] Article has proper formatting (headings, paragraphs)
- [ ] Back link works

### Grant Directory (/grant-directory)
- [ ] Page loads with grants listed
- [ ] Click a grant — detail page loads

### Free Tools (/tools)
- [ ] Hub page shows 7 tools
- [ ] Funding Gap Calculator (/tools/funding-gap) — fill form, get results
- [ ] Readiness Quiz (/tools/readiness-quiz) — answer all 10 questions, see score
- [ ] Eligibility Checker (/tools/eligibility-checker) — select entity type, see results
- [ ] Budget Estimator (/tools/budget-estimator) — fill all 3 fields, see estimate
- [ ] Grant Timeline (/tools/grant-timeline) — fill all 3 fields, see timeline
- [ ] Grant Finder by State (/grants/states) — page loads
- [ ] Grant Directory link works

### Partners (/partners)
- [ ] Page loads with partner info
- [ ] Application form submits

### Legal Pages
- [ ] Privacy (/privacy) — loads with all sections
- [ ] Terms (/terms) — loads with all sections
- [ ] #ai-disclosure anchor scrolls to correct section
- [ ] #cookies anchor scrolls to correct section

### Leaderboard (/leaderboard)
- [ ] Page loads

### SEO Grants Pages
- [ ] /grants/states — all 50 states listed
- [ ] /grants/state/GA — Georgia grants page loads
- [ ] /grants/industry/healthcare — industry page loads

### 404 Page
- [ ] Visit /nonexistent-page — see branded GrantAQ 404 page
- [ ] "Go to Dashboard" and "Browse Grant Matches" buttons work

---

## 2. AUTHENTICATION

### Signup (/signup)
- [ ] Page loads with social proof panel (desktop) or header (mobile)
- [ ] GrantAQ logo visible
- [ ] Enter org name, email, password → click "Start Free"
- [ ] Signup succeeds → redirected to /onboarding
- [ ] Try signing up with same email — shows error (not crash)

### Login (/login)
- [ ] Page loads with GrantAQ logo
- [ ] Enter email + password → click "Sign In"
- [ ] Redirected to /dashboard
- [ ] "Forgot password?" link goes to /reset-password
- [ ] "Sign up free" link goes to /signup

### Password Reset (/reset-password)
- [ ] Page loads
- [ ] Enter email → sends reset email (requires Resend working)

### Nonprofit Signup (/signup/nonprofit)
- [ ] Page loads
- [ ] Form works

---

## 3. ONBOARDING (/onboarding)

- [ ] Chat interface loads
- [ ] Grantie asks first question
- [ ] Answer all 5 core questions
- [ ] Profile card visible on desktop (right side)
- [ ] Mobile: progress bar visible at top
- [ ] After completing, see "See Your Matches" (primary) and "Go to Dashboard" (secondary)
- [ ] Click "See Your Matches" → goes to /matches

---

## 4. DASHBOARD (/dashboard)

### New User (no data)
- [ ] Shows onboarding checklist (not 11 empty widgets)
- [ ] Checklist has 5 items with progress bar
- [ ] Each checklist item links to correct page
- [ ] Stats overview shows zeros
- [ ] Free tier upgrade banner visible

### Returning User (with data)
- [ ] Stats overview shows real numbers
- [ ] Today's Focus section displays
- [ ] Calendar Preview shows upcoming deadlines (if any)
- [ ] Profile Completion card shows answered fields
- [ ] Vault Summary shows upload count
- [ ] A-Z Qualification score displays
- [ ] Industry Insights section shows (if industry set)
- [ ] What's Changed section shows recent activity
- [ ] Referral mini card with referral code

### Enterprise User
- [ ] No upgrade banner
- [ ] All widgets visible
- [ ] Monthly Impact card shows

---

## 5. GRANT MATCHES (/matches)

- [ ] Page loads with matches (or empty state if no matches run)
- [ ] Empty state says "Complete your organization profile" with CTA
- [ ] If matches exist:
  - [ ] Filter by source type (Federal/State/Foundation/Corporate)
  - [ ] Sort by Match Score / Deadline / Amount
  - [ ] Deadline range filter (30/60/90 days)
  - [ ] "Reset filters" link appears when filter active
  - [ ] Click a match card → goes to grant detail page
  - [ ] Match score visible on each card
- [ ] "Run Matches" button triggers AI matching (requires Anthropic key)

---

## 6. GRANT DETAIL (/grants/[id])

- [ ] Page loads with grant name, funder, type badge
- [ ] Amount, deadline, category, recurrence displayed
- [ ] Readiness Gauge shows REAL scores (not hardcoded)
  - [ ] Eligibility status based on your entity type
  - [ ] Geography based on your state
  - [ ] Documents based on your vault
  - [ ] Financials based on your budget
- [ ] "Apply Through GrantAQ" card visible
  - [ ] If NOT in pipeline: shows "Add to Pipeline" action
  - [ ] If IN pipeline: shows current stage + "Go to Pipeline" link
- [ ] "Evaluate This Grant" link works
- [ ] "Build Budget" link works
- [ ] Application Checklist section shows requirements
- [ ] Full Description accordion expands (blurred for free, visible for paid)
- [ ] Eligibility Details accordion shows real data
- [ ] Application Requirements accordion shows requirements by grant type
- [ ] "Report an Issue" button at bottom opens dialog
  - [ ] Select field, enter issue, submit → shows success toast

---

## 7. GRANT LIBRARY (/library)

- [ ] Page loads with search bar
- [ ] Header says "thousands of grants" (not hardcoded number)
- [ ] Tabs: Grants / Loans / In-Kind / Matching
- [ ] Search by keyword → results appear
- [ ] Filter by type (Federal/State/Foundation/Corporate)
- [ ] Filter by state dropdown
- [ ] Filter by amount range (min/max)
- [ ] "Clear" button resets filters
- [ ] Click "View Details" → goes to grant detail page
- [ ] Click "Start Application" → goes to grant detail page
- [ ] Loading skeleton shows while fetching
- [ ] "No grants found" empty state with "Clear all filters"
- [ ] "Load more grants" button appears if more results

---

## 8. PIPELINE (/pipeline)

- [ ] Page loads with Kanban board (or empty state)
- [ ] Empty state uses pipeline variant (Kanban icon, correct CTA)
- [ ] "Add Grant" button in header
  - [ ] Click → opens search dialog
  - [ ] Search for a grant → results appear
  - [ ] Click a result → adds to pipeline → shows success toast
- [ ] Stage Guide sidebar visible on desktop
  - [ ] Shows all 8 stages with descriptions
- [ ] Kanban columns: Identified → Qualified → In Development → Under Review → Submitted → Pending Decision → Awarded → Declined
- [ ] Drag a card between columns (desktop)
- [ ] Pipeline summary shows counts at top

---

## 9. WRITING (/writing)

- [ ] Page loads with writing projects list or empty state
- [ ] Empty state uses writing variant (correct icon + CTA)
- [ ] "AI Draft → Expert Review → Ready to Submit" workflow banner visible
- [ ] "New Application" button links to /matches
- [ ] If drafts exist: status indicators show (progress, stage)

### Write Page (/grants/[id]/write)
- [ ] Free/Seeker/Strategist users: see upgrade gate (requires Applicant tier)
- [ ] Applicant+ users: writing interface loads

---

## 10. CALENDAR (/calendar)

- [ ] Page loads (with loading skeleton first)
- [ ] Calendar view displays
- [ ] Upcoming deadlines shown (if pipeline has grants with deadlines)
- [ ] Fiscal cycle component visible
- [ ] Proactive alerts section

---

## 11. VAULT / DOCUMENTS (/vault)

- [ ] Page loads
- [ ] Free tier: shows "2 of 2 uploads remaining" banner
- [ ] Free tier: can upload up to 2 documents
- [ ] Free tier: after 2 uploads, shows upgrade paywall
- [ ] Paid tier: full upload access
- [ ] Document checklist shows which docs are needed
- [ ] Upload a document → appears in the list
- [ ] Document completeness bar updates

---

## 12. ANALYTICS (/analytics)

- [ ] Free tier: shows upgrade gate
- [ ] Seeker+ tier: shows analytics dashboard
- [ ] Win Rate chart (if outcome data exists)
- [ ] Win Rate by Grant Type chart
- [ ] Top Rejection Reasons chart
- [ ] Win Rate by Match Score chart
- [ ] Improvement Suggestions list
- [ ] Time to Submit widget
- [ ] Funding by Source pie chart
- [ ] Export button works (growth+ tier)

### Reports (/analytics/reports)
- [ ] Growth+ tier: reports page loads
- [ ] Print-friendly layout

---

## 13. FUNDERS (/funders)

- [ ] Page loads with funder directory
- [ ] Click a funder → detail page loads
- [ ] Funder detail shows grants from that funder
- [ ] Match scores display (if user has matches)

---

## 14. ROADMAP (/roadmap)

- [ ] Page loads with funding roadmap
- [ ] Diversity score widget
- [ ] Goal progress tracking
- [ ] Timeline visualization

---

## 15. SETTINGS

### Organization (/settings)
- [ ] Profile settings load
- [ ] Can update org name, entity type, other fields
- [ ] Save works

### Notifications (/settings/notifications)
- [ ] Notification preferences load
- [ ] Toggle switches work
- [ ] Save works

### Team (/settings/team)
- [ ] Team member list loads
- [ ] Can invite new members (paid tier)

### Billing (/settings/billing)
- [ ] Current plan displayed with correct tier name
- [ ] Correct pricing shown for all tiers including growth/Applicant
- [ ] Usage limits display correctly
- [ ] "Manage Subscription" button works (requires Stripe)

### Referrals (/settings/referrals)
- [ ] Referral dashboard loads
- [ ] Referral code visible
- [ ] Share buttons work

---

## 16. UPGRADE (/upgrade)

- [ ] Page loads with personalized banner showing current tier
- [ ] 4 plan cards (Seeker/Strategist/Applicant/Organization)
- [ ] Monthly/Annual toggle works
- [ ] Annual prices show discount
- [ ] Current plan marked
- [ ] Downgrade detection works (shows "Downgrade" label)
- [ ] Growth tier included in downgrade comparison
- [ ] "Upgrade" button triggers Stripe checkout (requires Stripe setup)

---

## 17. ADMIN (/admin)

- [ ] Only accessible by admin email (getreachmediallc@gmail.com)
- [ ] Non-admin users redirected to /dashboard
- [ ] Admin link visible in sidebar (only for admin)

### Admin Dashboard
- [ ] User count, org count, grant count displayed
- [ ] Signups this week/month
- [ ] Revenue by tier breakdown
- [ ] Pending corrections preview

### User Management (/admin/users)
- [ ] All users listed with email, org, tier, role
- [ ] Tier dropdown to change user's tier
- [ ] Change saves successfully

### Corrections (/admin/corrections)
- [ ] Pending corrections listed
- [ ] Approve button applies correction to grant
- [ ] Reject button marks as rejected
- [ ] Row disappears after action

---

## 18. GRANTIE AI CHAT

- [ ] Chat button visible (bottom right or in sidebar)
- [ ] Click → panel opens
- [ ] Greeting message appears
- [ ] Type a message → AI responds
- [ ] Response is contextual (mentions your org name/tier)
- [ ] Close panel → reopen → conversation persisted
- [ ] "New conversation" button clears history
- [ ] Error message shows retry button (simulate by going offline)
- [ ] Rate limit message shows when daily limit reached

---

## 19. COMMAND PALETTE (Cmd+K)

- [ ] Press Cmd+K (Mac) or Ctrl+K (Windows) → palette opens
- [ ] "Pages" section shows all navigation items
- [ ] Click a page → navigates there
- [ ] Type a grant name → search results appear
- [ ] Click a grant result → goes to /grants/[id]
- [ ] "Actions" section shows Open Grantie, Run Matches, Export
- [ ] Press Escape → palette closes

---

## 20. MOBILE RESPONSIVENESS

### Marketing Site (phone)
- [ ] Hamburger menu opens with all nav links
- [ ] Hero text readable, CTA buttons tappable
- [ ] Pricing cards stack vertically (not cramped)
- [ ] Footer links accessible
- [ ] Free tools work on mobile

### App (phone)
- [ ] Bottom tab bar shows: Dashboard, Matches, Pipeline, Library, More
- [ ] "More" button opens full nav sheet with ALL pages
- [ ] Dashboard has proper padding (not edge-to-edge)
- [ ] Matches page has proper padding
- [ ] Grant detail page scrollable
- [ ] Pipeline kanban scrolls horizontally
- [ ] Settings pages have proper padding
- [ ] Grantie chat panel works on mobile

---

## 21. EMAIL (requires Resend domain verified)

- [ ] Signup triggers welcome email
- [ ] Password reset sends email
- [ ] Weekly digest sends (test via /api/digest/send with ADMIN_SECRET)

---

## 22. PAYMENTS (requires Stripe setup)

- [ ] Click upgrade → Stripe checkout opens
- [ ] Complete test payment → subscription updated in database
- [ ] Webhook fires → tier updated correctly
- [ ] Billing page shows new tier
- [ ] Features unlock immediately after payment
- [ ] Cancel subscription via billing portal

---

## 23. EXTERNAL SERVICES

- [ ] Crisp chat widget visible on marketing pages
- [ ] Crisp chat widget visible in app
- [ ] PostHog tracking events (check PostHog dashboard for activity)
- [ ] Stripe webhook receiving events (check Stripe dashboard)
- [ ] Resend domain verified and sending emails

---

## 24. CRON JOBS (requires ADMIN_SECRET in Vercel)

Test by hitting the endpoints manually:
- [ ] GET /api/cron/refresh-grants (with Bearer ADMIN_SECRET header)
- [ ] GET /api/cron/validate-grants (with Bearer ADMIN_SECRET header)
- [ ] GET /api/cron/check-urls (with Bearer ADMIN_SECRET header)

---

## 25. SECURITY CHECKS

- [ ] Visit any /api/ route without auth → returns 401
- [ ] Visit /admin as non-admin → redirected to /dashboard
- [ ] Try accessing another org's data → returns 403
- [ ] Signup with invalid email → proper error message (no internal details)
- [ ] Rapid requests → rate limited (429 response)

---

## NOTES

Date tested: _______________
Tested by: _______________
Browser: _______________
Mobile device: _______________

### Issues found:
1.
2.
3.

### Items that need external setup first:
- [ ] Stripe products created + price IDs in Vercel
- [ ] Stripe webhook configured
- [ ] OpenAI $10 billing added
- [ ] Resend domain verified
- [ ] PostHog key in Vercel
- [ ] Crisp website ID in Vercel
- [ ] ADMIN_SECRET in Vercel
- [ ] ADMIN_EMAIL in Vercel
- [ ] Google Search Console sitemap submitted
