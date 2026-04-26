# Security Specification for WildLife Connect

## Data Invariants
1. A user profile MUST match the request.auth.uid.
2. A post MUST have a valid status ('pending', 'approved', 'rejected').
3. Initially, all posts are 'pending'. Only admins can change status.
4. Users can only increment likes on posts.
5. Users can only create comments for themselves.
6. The `isAdmin` field in the user profile is immutable by the user.

## The Dirty Dozen Payloads (Targeting Rejection)
1. **Privilege Escalation**: Attempt to set `isAdmin: true` during profile creation.
2. **Identity Spoofing**: Creating a post with a `userId` that doesn't match `request.auth.uid`.
3. **Status Hijacking**: Creating a post with `status: 'approved'` directly.
4. **Outcome Tampering**: Updating a post's status as a non-admin.
5. **PII Leak**: Reading another user's private data (if any).
6. **Shadow Fields**: Adding a `verified: true` field to a post.
7. **Resource Exhaustion**: Sending a 2MB string as a title.
8. **Relational Break**: Posting a comment to a non-existent post.
9. **History Erasure**: Modifying the `createdAt` timestamp of a post.
10. **Admin Bypass**: Deleting a post as a regular user.
11. **Negative Increment**: Decrementing the `likes` count.
12. **ID Poisoning**: Passing a 2KB string as a document ID.
