# Event-Driven Architecture — Reasoning and Decisions

## Context

The requirement was to implement three new notification features:
1. Notify everybody when a Reaction is added to an Activity
2. Notify everybody when a WorkRequest is promoted to an Activity
3. Notify a specific user at 20:00 if they have not logged any Activities that day

The broader constraint was that future functionality — including a "house spirit" character called Kimbalontek reacting to the overall state of WorkRequests — should be independently deployable and not require changes to existing modules.

---

## Options Considered for Publishing Events

### Option A: Frontend publishes events explicitly
The GUI calls `EventPublisher.publish(...)` after each meaningful operation, as already done for `WorkRequestCreated`.

**Advantage:** Intent is declared explicitly and unambiguously — the code says exactly what happened and why.  
**Problem:** The frontend has to know which events other modules care about. Adding Kimbalontek or a new notification type could require GUI changes, coupling Core to its consumers.

### Option B: Backend infers intent from DynamoDB stream changes
A Lambda listens to DynamoDB Streams and infers what happened from the data change — e.g., a WorkRequest with `completed = true` means a promotion occurred.

**Advantage:** Frontend stays a pure data writer.  
**Problem:** The same data change can have different business meanings. As the system grows, these inferences become fragile. A `completed = true` write could be a promotion, a manual admin correction, or a migration script — the Lambda cannot always tell.

### Option C (Selected): Frontend declares intent via data fields; backend publishes events
The GUI writes an `source` field on Activity records to declare intent (e.g. `"direct"` or `"promotion"`). A dedicated backend Lambda reads this field from the stream and publishes the correct semantic EventBridge event. No inference is needed — intent is explicit in the data.

**Why this was chosen:**
- Frontend remains a pure data writer with no knowledge of consumers
- Intent is unambiguous — declared by the writer, not guessed by the reader
- Adding new operations means adding a new `source` value and a new case in the domain-events Lambda, with zero changes to consumers
- Consistent: the same mechanism works for all future event types

---

## Independence Principle

Each functional area must be independently deployable. Adding or removing one must not require changes to any other.

The mechanism that enforces this is **EventBridge as the integration boundary**:
- Core writes data and publishes semantic domain events to EventBridge. It has no knowledge of who consumes them.
- Every other module (Notifications, Kimbalontek, future features) subscribes to EventBridge events via its own Lambda and its own rules.
- Adding a new module = new Lambda + new EventBridge rule. Zero changes elsewhere.

---

## Notification Channels

Initially only email notifications are implemented (via the existing `sebcel-chocoop-notifications` channel). Push notifications (Web Push API for PWA) are planned for the future.

Bundling email and push into a single `notifications-function` would couple the two channels — adding push would require modifying the email Lambda.

**Decision:** each notification channel is a separate, independently deployable Lambda, all subscribing to the same EventBridge events:
- `email-notifications-function` — handles email delivery
- `push-notifications-function` (future) — handles Web Push delivery; requires its own subscription storage and Service Worker integration on the frontend

---

## Resulting Architecture

```
┌─────────────────────────────────────────────────────┐
│  CORE                                               │
│                                                     │
│  GUI (React PWA)                                    │
│    └─ writes data to DynamoDB (via Amplify)         │
│    └─ sets `source` field to declare intent         │
│                                                     │
│  domain-events-function (Lambda)                    │
│    └─ triggered by DynamoDB Streams                 │
│       (Activity, Reaction, WorkRequest tables)      │
│    └─ reads `source` field, publishes semantic      │
│       events to EventBridge                         │
└───────────────────────┬─────────────────────────────┘
                        │ EventBridge
          ┌─────────────┼──────────────┬──────────────┐
          ▼             ▼              ▼              ▼
 email-notifications  push-          activity-      kimbalontek
 -function           notifications  reminder-       (future)
 (Lambda)            -function      function
                     (future,       (Lambda,
                     requires       scheduled
                     sub storage    19:00 UTC)
                     + SW)
```

### EventBridge events published by `domain-events-function`

| Trigger | Condition | Event type |
|---|---|---|
| WorkRequest INSERT | always | `WorkRequestCreated` |
| Activity INSERT | `source = "direct"` | `ActivityCreated` |
| Activity INSERT | `source = "promotion"` | `WorkRequestCompleted` |
| Reaction INSERT | always | `ReactionAdded` (fetches Activity for context) |
| WorkRequest MODIFY | `completed` changed (future, for Kimbalontek) | `WorkRequestStateChanged` |

### `activity-reminder-function`

Scheduled Lambda (EventBridge rule, 19:00 UTC daily):
- Determines today's date in the Polish timezone (CET/CEST, UTC+1/+2)
- Scans the Activity table for today's date
- Fetches all users from Cognito
- Publishes `ActivityReminderNeeded` to EventBridge for each user with zero activities today
- Note: fires at 20:00 CET in winter and 21:00 CEST in summer; DST-aware scheduling deferred

---

## Changes to Existing Code

- `source` field added to Activity data model and mappers
- `WorkRequestPromotionUseCase` sets `source = "promotion"` on the Activity before creation
- Direct activity creation sets `source = "direct"`
- `publishWorkRequestCreated` removed from `WorkRequestService` — this event is now published by `domain-events-function` from the stream
- `src/events/` directory removed from frontend
- `eventBridgePublishPolicy` removed from the authenticated Cognito user IAM role
