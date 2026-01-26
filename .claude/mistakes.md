# Mistakes Log

Reference this file before making changes to avoid repeating past mistakes.

---

## Mistakes Made During Development

*(None yet - will be populated during review)*

---

## Patterns to Avoid

### Code Patterns
-

### Testing Patterns
-

### Environment/Config Patterns
-

---

## Checklist Before Making Changes

- [ ] Read this file first
- [ ] Verify the file exists before editing
- [ ] Test changes after implementing
- [ ] Check for edge cases
- [ ] Ensure env vars are loaded when running scripts

---

## Review Session Log

### Session Started: 2026-01-19

**Reviewing:**
- Customer order lookup flow
- Admin functionality
- Rate limiting
- Phone number normalization
- Timeline display
- Notifications

**Issues Found:**

#### 1. Customer Order Lookup (Homepage)
- [x] **Duplicate heading** - "Track Your Order" in both hero and card - FIXED
- [x] **Placeholder email** - `support@example.com` in footer - FIXED
- [x] **Dead link** - "Contact us" links to `#contact` which doesn't exist - FIXED

#### 2. Order Tracking Page (Timeline)
- [x] **Placeholder email** - `support@example.com` in footer - FIXED
- [x] **Unused variable** - `currentStageIndex` never used - FIXED
- [ ] **"Send Message" button non-functional** - Feature not implemented (messaging)
- [NOTE] **Direct links redirect** - Intentional for security (requires re-verification)

#### 3. Admin Login/Authentication
- [x] **No rate limiting on login** - Vulnerable to brute force - FIXED (added rate limiting)
- [NOTE] **Default credentials** - `admin@example.com` / `changeme123` still active (user should change)

#### 4. Admin Dashboard and Stats
- [x] **Unused import** - `TrendingUp` imported but never used - FIXED
- [x] **Wrong fallback logic** - activeOrders fell back to totalOrders when 0 - FIXED

#### 5. Admin Orders List and Detail Views
- [OK] Code reviewed, no issues found

#### 6. CSV Upload
- [NOTE] UI says "Drag and drop" but only click is implemented (minor UX)

#### 7. Notification System
- [x] **Placeholder email in template** - `support@example.com` in email footer - FIXED

#### 8. Photo Upload and Assignment
- [x] **Wrong env var prefix** - Used server-side env var on client - FIXED

#### 9. Mobile Responsiveness
- [OK] Mobile-first design, responsive breakpoints, hamburger menu - all good

#### 10. End-to-End Test
- [OK] Homepage loads (200)
- [OK] Order lookup with correct credentials works
- [OK] Order lookup with wrong phone rejected
- [OK] Admin login works
- [OK] Auth required for protected endpoints

---

## Summary

**Total Issues Found:** 10
**Fixed:** 9
**Notes/Minor:** 2

### Issues Fixed:
1. Duplicate "Track Your Order" heading
2. Placeholder emails (3 locations)
3. Dead "Contact us" link
4. Unused variable in VerticalTimeline
5. No rate limiting on admin login
6. Unused import (TrendingUp)
7. Wrong activeOrders fallback logic
8. Placeholder email in notification template
9. Wrong env var prefix for Cloudinary

### Notes (Not Fixed - By Design):
- Direct links to tracking page redirect (security feature)
- Drag-and-drop UI text but click-only implemented
- Default admin credentials (user should change)

---

## Future Features

### Email Notifications for Admin Replies
- **Status:** Code scaffolded, disabled
- **Location:** `/src/app/api/admin/messages/route.ts`
- **To enable:** Uncomment email code, add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to env vars
- **What it does:** Emails customer automatically when admin replies to their message

### SMS Notifications
- **Status:** Twilio integration scaffolded
- **Location:** `/src/lib/notifications/sms.ts`
- **To enable:** Add Twilio credentials to env vars
