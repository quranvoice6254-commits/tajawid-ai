# Security Specification & "Dirty Dozen" Threat Model

This document outlines the security architecture and data invariants for the **Tajaweed** application, following a zero-trust model of attribute-based access control (ABAC).

## 1. Core Data Invariants

1. **Owner-Is-Self Constraint**:
   - A student can only read, create, or update data that has a `userId` matching their `request.auth.uid`.
   - A user cannot spoof their identity by writing a document representing Another Student (`userId` spoofing).

2. **Session Immutability**:
   - A recorded `LearningSession` (`/learning_sessions/{id}`) is a historical log of recitation or quizzing. Once created, it cannot be modified by any client (`allow update: if false`).

3. **Chat Relationship Invariant (Master Gate)**:
   - A `ChatMessage` belongs to a parent `ChatSession`.
   - A user can only write a message to a session if they are the verified owner of that session (`get(/chat_sessions/$(incoming().sessionId)).data.userId == request.auth.uid`).

4. **Structure & Size Hardening**:
   - Document ID sizes must be strictly bounded (`<= 128` characters) and conform to `^[a-zA-Z0-9_\-]+$`.
   - String fields such as title, text, and matnName must have maximum size limits to prevent Denial of Wallet (DoW) attacks.

5. **Email Verification**:
   - For all destructive operations or sessions writing, the user must be authenticated with a verified email address (`request.auth.token.email_verified == true`), unless explicitly excused.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 malicious inputs or operation attempts are designed to attack the system. The finalized security rules must fail-closed and return `PERMISSION_DENIED` for all:

### Threat 1: Identity Spoofing (Learning Session)
1. **Payload 1**: Creating a learning session with a simulated `userId` belonging to another user.
   ```json
   {
     "userId": "victim_user_abc123",
     "matnName": "تحفة الأطفال",
     "type": "recitation",
     "date": "2026-06-05",
     "score": 95,
     "createdAt": "2026-06-05T15:00:00.000Z"
   }
   ```
   *Expected outcome*: `PERMISSION_DENIED` (auth UID mismatch).

### Threat 2: Altering Completed History
2. **Payload 2**: Attempting to update a completed recitation session to inflate the score.
   ```json
   {
     "score": 100
   }
   ```
   *Expected outcome*: `PERMISSION_DENIED` (learning_sessions must be update-blocked).

### Threat 3: Unauthorized Peeking (Learning Session List)
3. **Payload 3**: Listing/querying other students' learning sessions without passing the secure filter `userId == auth.uid`.
   *Expected outcome*: `PERMISSION_DENIED` (Query Enforcer protects lists).

### Threat 4: Chat Ownership Spoofing
4. **Payload 4**: Creating a `ChatSession` for another student.
   ```json
   {
     "userId": "other_uid",
     "title": "Malicious Chat",
     "matnName": "الجزرية",
     "lastUpdated": "2026-06-05T15:30:00.000Z"
   }
   ```
   *Expected outcome*: `PERMISSION_DENIED` (auth UID mismatch for owner).

### Threat 5: Chat Cross-Peeking
5. **Payload 5**: Reading a `ChatSession` document belonging to a different user.
   *Expected outcome*: `PERMISSION_DENIED` (resource check failed).

### Threat 6: Rogue Session Deletion
6. **Payload 6**: Deleting a `ChatSession` owned by another user.
   *Expected outcome*: `PERMISSION_DENIED` (only the resource's authentic owner can delete).

### Threat 7: Orphaned Message Injection
7. **Payload 7**: Writing a `ChatMessage` to a non-existent or target victim's `ChatSession`.
   ```json
   {
     "sessionId": "victim_chat_session_xyz",
     "sender": "user",
     "text": "Injecting text into other student's logs",
     "timestamp": "2026-06-05T15:35:00.000Z"
   }
   ```
   *Expected outcome*: `PERMISSION_DENIED` (Session relation validation fails).

### Threat 8: Injecting Fraudulent Scores
8. **Payload 8**: Creating a learning session with an extremely high score value (Value Poisoning / Type Violation).
   ```json
   {
     "userId": "my_auth_uid",
     "matnName": "تحفة الأطفال",
     "type": "recitation",
     "date": "2026-06-05",
     "score": 99999,
     "createdAt": "2026-06-05T15:35:00.000Z"
   }
   ```
   *Expected outcome*: `PERMISSION_DENIED` (score must be `<= 100`).

### Threat 9: Denial-of-Wallet Character Flooding
9. **Payload 9**: Creating a chat session with an extremely long title (e.g. 50,000 characters) to exhaust storage.
   ```json
   {
     "userId": "my_auth_uid",
     "title": "[50,000 character junk string...]",
     "matnName": "تحفة الأطفال",
     "lastUpdated": "2026-06-05T15:35:00.000Z"
   }
   ```
   *Expected outcome*: `PERMISSION_DENIED` (size check limits titles to `<= 250`).

### Threat 10: State Transition Violations
10. **Payload 10**: Attempting to update a message's sender type from `user` to `bot` (forged response).
    ```json
    {
      "sender": "bot"
    }
    ```
    *Expected outcome*: `PERMISSION_DENIED` (chat_messages are immutable or strict).

### Threat 11: Bypassing Email Verification Check
11. **Payload 11**: Writing new items with `request.auth.token.email_verified == false`.
    *Expected outcome*: `PERMISSION_DENIED` (email verification is strictly required for database modification).

### Threat 12: Injection of Malicious Path IDs
12. **Payload 12**: Trying to target single-document operations with excessively large document IDs or special characters to crash querying.
    *Expected outcome*: `PERMISSION_DENIED` (caught by `isValidId` on document ID).
