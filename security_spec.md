# Security Specifications - SavanaXP E-Learning Platform

This document describes the validation rules, security invariants, and test attack payloads ("Dirty Dozen") for the Firestore security rules.

## 1. Core Data Invariants

1. **Identity & Authorization Roles**: 
   - Public users can only read published courses.
   - Creating/modifying courses, modules, or performance reports demands authenticated instructor privilege verification.
   - Students can ONLY read and write their own progress, registrations, notifications, and chat messages.

2. **System Field Immutability**:
   - Fields such as `id`, `createdAt`, `userId`, or `amount` are immutable once configured.
   - Admin RBAC levels can never be modified by clients (zero self-assigned roles).

3. **Temporal Integrity**:
   - `createdAt` and `updatedAt` timestamps must match `request.time`.

---

## 2. The "Dirty Dozen" Threat Payloads

Here are 12 specific payloads representing illegal actions that the security rules MUST reject.

### T1: Self-Assigning Admin Role
- **Path**: `/leaderboard/attacker_uid`
- **Method**: CREATE/UPDATE
- **Payload**: `{"userId": "attacker_uid", "role": "instructor", "xp": 99999}`
- **Vulnerability**: Attacker changes privilege role to "instructor" on client-side to see performance reports or steal user lists.
- **Expected Result**: `PERMISSION_DENIED`

### T2: Spoofing Owner Id on Progress
- **Path**: `/progress/some_progress_id`
- **Method**: CREATE
- **Payload**: `{"userId": "victim_uid", "courseId": "course-1", "progressPercentage": 100}`
- **Vulnerability**: Attacker injects completed progress for other students.
- **Expected Result**: `PERMISSION_DENIED`

### T3: Injecting Arbitrary Ghost Fields (Shadow Update)
- **Path**: `/courses/course-1`
- **Method**: UPDATE
- **Payload**: `{"title": "Updated Course", "ghostField": "maliciousScript", "isPublished": true}`
- **Vulnerability**: App allows arbitrary writes because user is authorized, risking document pollution.
- **Expected Result**: `PERMISSION_DENIED`

### T4: Bypass Payment of Course Registration
- **Path**: `/payments/hack_id`
- **Method**: CREATE
- **Payload**: `{"id": "hack_id", "userId": "attacker_uid", "courseId": "course-1", "paymentStatus": "completed", "amount": 0.00}`
- **Vulnerability**: Free registration creation bypassing Stripe simulated checks.
- **Expected Result**: `PERMISSION_DENIED` 

### T5: Deleting Other Student's Forum Thread
- **Path**: `/forumThreads/thread-1`
- **Method**: DELETE
- **Request Auth**: `attacker_uid` (Thread owner is `user-2`)
- **Vulnerability**: Any authenticated user deleting resources they do not own.
- **Expected Result**: `PERMISSION_DENIED`

### T6: Modifying Likes Count Exorbitantly
- **Path**: `/forumThreads/thread-1`
- **Method**: UPDATE
- **Payload**: `{"likes": 999999}` (affecting keys check bypassed or modified directly)
- **Vulnerability**: Inflation of social gamification without actual forum value.
- **Expected Result**: `PERMISSION_DENIED`

### T7: Path Variable Overrun / ID Poisoning
- **Path**: `/courses/JUNK_CHARACTERS_THAT_ARE_VERY_LONG_AND_EXHAUST_QUOTAS_OR_DENIAL_OF_WALLET`
- **Method**: GET/CREATE
- **Vulnerability**: Massive string index insertion.
- **Expected Result**: `PERMISSION_DENIED` (blocks non-standard size strings)

### T8: Blanket Unbounded Reads on Student Transactions
- **Path**: `/payments`
- **Method**: LIST (unfiltered query)
- **Vulnerability**: Scraping private enrollment receipts of other students.
- **Expected Result**: `PERMISSION_DENIED`

### T9: Modifying Locked Finished Course Status
- **Path**: `/progress/progress-1`
- **Method**: UPDATE
- **Payload**: Attempting to decrease progress of a certified student.
- **Expected Result**: `PERMISSION_DENIED`

### T10: Temporal Spoofing
- **Path**: `/notifications/notif-1`
- **Method**: CREATE
- **Payload**: `{"createdAt": "2030-01-01T00:00:00Z"}` instead of server timestamp.
- **Expected Result**: `PERMISSION_DENIED`

### T11: Writing Messages under Tutor Identity
- **Path**: `/chatMessages/msg-1`
- **Method**: CREATE
- **Payload**: `{"senderRole": "instructor", "senderName": "Tutor Gabriel"}` by standard student authenticated socket.
- **Expected Result**: `PERMISSION_DENIED`

### T12: Anonymous Access to Private User Database
- **Path**: `/leaderboard/any`
- **Method**: READ
- **Request Auth**: Unauthenticated (null)
- **Vulnerability**: Anonymous crawler leaks user avatars and scores.
- **Expected Result**: `PERMISSION_DENIED`
