# User Management Functional Specification

## Status

Proposed scope for the next user-management increment.

## Purpose

This document defines the functional scope for user management in Cogito Review.

The goal is to turn the current read-mostly user listing into a practical
administration workflow that fits the existing single-organization, multi-team,
RBAC-driven product model.

This specification is intentionally limited to responsibilities that belong to a
review system:

- organization user visibility
- organization role administration
- team membership administration
- account activation lifecycle for access to this product

This specification intentionally excludes workflows that belong to broader
identity, directory, or enterprise provisioning systems.

## Product assumptions

This specification assumes the current product boundaries remain unchanged:

- one deployed organization per application instance
- browser access is authenticated through local bootstrap login, OIDC, or SAML
- RBAC remains the source of truth for authorization
- teams remain the primary collaboration and data-access partition
- user provisioning for SSO users continues to happen at first successful login

This specification also assumes the product is **SSO-first** for day-to-day user
management, while local accounts remain limited to bootstrap and emergency
administrator fallback.

## Current state

Current implementation relevant to user management:

- a paginated users list exists
- organization roles can be changed through an API
- team membership is managed from team detail pages
- SSO users are provisioned just in time on login
- RBAC supports `user.read`, `user.assign_org_admin`, and `user.deactivate`

Current gaps:

- no dedicated user detail view
- no user-centric workflow for managing memberships across teams
- no UI for changing organization role
- no real deactivate/reactivate user workflow
- no strong operational visibility such as account status or last login

## Goals

The next increment should let an organization administrator:

1. find a user quickly
2. inspect that user's effective place in the organization
3. change the user's organization role
4. manage the user's team memberships across multiple teams
5. deactivate or reactivate the user's product access

The design should minimize surprises, make destructive actions explicit, and fit
the existing backend and frontend architecture.

## Non-goals

The following items are explicitly out of scope for this specification:

- audit log design and implementation
- invitation workflows
- email-based onboarding flows
- local user self-service management
- full local user administration such as create, reset password, rotate
  password, or lifecycle management beyond bootstrap or emergency fallback
- SCIM provisioning
- SSO group-to-role synchronization
- multi-organization administration
- external directory ownership of team structures

These areas may be handled later in separate modules or tracks.

## Target users

Primary actor:

- organization administrator

Secondary actors:

- superuser acting through the same RBAC-backed organization-admin capabilities
- team administrators, who continue to manage members within a single team, but
  do not gain organization-wide user-administration powers from this
  specification

## Functional scope

### 1. Users list page

The users list becomes the entry point for user administration.

#### Objectives

- support fast discovery of users
- expose enough summary information to decide whether deeper action is needed
- provide a clear path into a user detail view

#### Required information per row

- email
- display name
- auth source
- organization role summary
- team membership count
- account status
- created date

#### Required filters

- free-text search by email, display name, and username when present
- filter by auth source
- filter by organization role
- filter by account status
- optional filter by team

#### Row actions

- open user detail view
- quick role-change action is optional, but only if the same action is also
  available in the detail view

### 2. User detail view

The system needs a dedicated user-centric administration surface.

This may be implemented as a full page or a drawer, but it must support
multi-step administration without sending the admin back to team pages.

#### Required sections

##### Identity

- email
- display name
- auth source
- username when present
- created date
- current account status

##### Organization access

- current organization role
- clear explanation of what the role means at a high level
- action to change organization role when permitted

##### Team memberships

- list of all current team memberships
- per-team role
- add membership action
- change team role action
- remove membership action

##### Access lifecycle

- deactivate action when the user is active
- reactivate action when the user is inactive

### 3. Organization role management

Organization role management is part of user administration and should no longer
be API-only.

#### Supported roles

- `org_admin`
- `org_member`

#### Functional requirements

- an org admin can promote an org member to org admin
- an org admin can demote an org admin to org member
- a superuser cannot be demoted below org admin
- the UI must clearly show whether the target user is a superuser

#### Guardrails

- the system must prevent demotion of the last active organization admin
- the system must prevent a user from removing their own last remaining path to
  organization administration if that would leave the organization without an
  admin
- role-change actions should require explicit confirmation when privileges are
  increased or reduced

#### Effects

- changes apply immediately to new permission checks
- the updated role should be reflected in the user detail view and users list
  without a manual refresh

### 4. Team membership management from the user view

Team membership management should be possible from both sides:

- team-centric workflows remain on team detail pages
- user-centric workflows are added to the user detail view

This avoids forcing administrators to navigate across many teams to update a
single person.

#### Supported actions

- add the user to a team
- change the user's role inside a team
- remove the user from a team

#### Supported team roles

- `team_admin`
- `member`
- `viewer`

#### Functional rules

- adding a membership to a team where the user is already a member updates the
  team role instead of creating a duplicate record
- team choices should exclude teams the user already belongs to when using a
  dedicated "add membership" flow
- the UI should show current memberships in a stable order, preferably by team
  name

#### Guardrails

- if a change would remove the last effective administrator from a team, the
  system should block it
- if product policy later decides that org admins do not need explicit team
  membership for team administration, this rule must still preserve operational
  ownership for team-scoped workflows

### 5. Account activation lifecycle

The system should support product-level deactivation and reactivation for users.

This is not a directory-management feature. It is a Cogito Review access-control
feature.

#### Required user states

- active
- deactivated

#### Deactivation semantics

When a user is deactivated:

- new interactive login to Cogito Review is denied
- existing browser sessions for that user should be revoked as part of the same
  workflow or immediately after it
- existing organization roles and team memberships remain stored
- historical reviews, findings, and references to that user remain unchanged

#### Reactivation semantics

When a user is reactivated:

- the user may log in again through the existing configured auth flow
- previous organization roles and team memberships become effective again

#### Guardrails

- the system must prevent deactivation of the last active organization admin
- the UI must show the impact clearly before confirmation
- deactivation must be reversible through reactivation

### 6. Operational user signals

To support real administration decisions, the system should expose a minimal set
of operational signals.

#### Required additions

- account status
- last successful login timestamp

#### Nice-to-have additions

- last authentication source used
- whether the user was provisioned through SSO or local bootstrap

These fields improve usability without expanding the system into a directory
product.

## Business rules

### User creation

- SSO users are still created through first successful login
- no invite flow is introduced
- no manual creation of standard local accounts is introduced

### Local accounts

- local accounts remain restricted to bootstrap and emergency administrator use
- this specification does not add UI or APIs for full local account management

### Team administration model

- organization admins retain organization-wide authority
- team administrators continue to manage memberships within their own teams
- this specification does not widen team-admin scope into organization-wide user
  administration

### Data retention

- deactivating a user does not delete the user row
- deactivating a user does not delete team memberships
- deactivating a user does not rewrite historical review data

## UX expectations

### Principles

- user administration should be efficient for repeated operational work
- destructive actions should be explicit and reversible when possible
- privilege changes should be understandable before confirmation
- admins should not need to open multiple unrelated settings areas to complete a
  single user-management task

### Expected flow: promote a user to org admin

1. open Users
2. search for the user
3. open the user detail view
4. change organization role to `org_admin`
5. confirm the change
6. see updated permissions reflected immediately

### Expected flow: grant access to several teams

1. open the user detail view
2. add team membership
3. choose a team
4. choose a team role
5. repeat for additional teams without leaving the user view

### Expected flow: suspend access temporarily

1. open the user detail view
2. review current status and role impact
3. deactivate the account
4. confirm the action
5. see status change to deactivated

## API expectations

This section describes expected contract evolution, not a final route design.

### Keep

- `GET /api/v1/users`
- `PUT /api/v1/users/{user_id}/organization-role`
- existing team member APIs under `/api/v1/teams/{team_id}/members`

### Add

- a user detail endpoint for one user
- a deactivate user endpoint
- a reactivate user endpoint
- either:
  - a dedicated endpoint to list all memberships for one user, or
  - an enriched user detail endpoint that includes memberships
- either:
  - a dedicated endpoint to update a user's membership within a team from the
    user-management surface, or
  - reuse of existing team-member upsert semantics with frontend orchestration

### Recommended direction

Prefer API contracts that make user-centric screens simple to build, instead of
forcing the frontend to stitch together many team-scoped reads one by one.

## Data model expectations

This specification likely requires extending the `users` table with at least:

- activation status
- last login timestamp

It may also require:

- session invalidation support for user-wide revocation

Team membership storage can continue to use the existing `team_members` table.

## Permissions model expectations

Current relevant action keys:

- `user.read`
- `user.assign_org_admin`
- `user.deactivate`
- `team.member.read`
- `team.member.add`
- `team.member.update_role`
- `team.member.remove`

Expected direction:

- use the existing action keys where they already match the workflow
- wire dedicated enforcement for `user.deactivate`
- prefer `team.member.update_role` when a dedicated role-change path is added,
  instead of hiding role changes inside a generic add-or-upsert operation

## Edge cases

The implementation should define behavior for the following cases:

- attempting to demote a superuser
- attempting to demote the last active org admin
- attempting to deactivate the last active org admin
- attempting to remove the last operational admin from a team
- deactivated user attempts login through OIDC
- deactivated user attempts login through SAML
- deactivated local fallback admin attempts login
- user exists in historical data but no longer has active access
- user has no team memberships but remains an org member

## Rollout priority

Recommended implementation order:

1. user detail endpoint and view
2. organization role management in the UI
3. user-centric team membership management
4. deactivate/reactivate workflow
5. operational signals such as status and last login

This order keeps the first iteration focused on the biggest administrative gaps
without expanding scope into identity-platform features.

## Deferred future topics

The following topics are intentionally deferred to separate design tracks:

- audit integration for user-management events
- invitation flows
- non-bootstrap local account administration
- SSO group-to-role mapping
- SCIM provisioning and deprovisioning
- advanced identity governance policies

If the product later needs tighter enterprise identity integration, that work
should be specified as an identity-lifecycle module rather than folded into the
core review-system user-management scope.
