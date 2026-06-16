# Product brief — multi-tenant project workspace

_This is the product-level intent for the workspace epic: what the system is for and the policies it must
uphold. It is written at the altitude a product owner / lead architect works at — it states the **rules**,
not the implementation. (It is the input a skeleton-generator gets, mirroring what `/vision` consumes.)_

## What we are building
A small workspace where organizations run projects, manage who is on each project, and discuss work via
comments. Each user manages their own profile. The system is **multi-tenant**: every organization is an
isolated tenant.

## The surfaces (each built by a different engineer, in isolation)
- `createProject` — a user starts a new project.
- `listProjects` — a user lists the projects available to them.
- `addMember` — someone adds a user to a project with a role.
- `postComment` — someone comments on a project.
- `updateProfile` — a user edits a profile.

## The policies the product must uphold
These are non-negotiable product requirements. They cut across multiple surfaces, so they must hold
**uniformly** wherever they apply — a single surface that forgets one is a hole in the product.

1. **Tenant isolation.** An organization's data is private to that organization. A user must never read,
   list, or affect data that belongs to another organization. Anything a user creates belongs to *their*
   organization — the organization is never something the caller gets to pick. An attempt to act across
   organization boundaries is an error.
2. **Project membership & roles.** A project has members. Adding someone to a project is an
   **administrator** action — an ordinary member cannot add members. Commenting on a project is reserved
   for **members of that project** — a non-member cannot comment.
3. **Profile safety.** A user may edit their own profile; an administrator may edit profiles in their
   organization. A profile edit must **never** be a way to escalate privilege or change identity: it must
   not be able to change the user's role, their organization, or their id.

## How the system is built (why this brief matters)
Each surface above is implemented by a **separate engineer who sees only their own task** — they do not
see each other's code and cannot coordinate at build time. Anything left unstated, each will guess
differently, and the independently-built pieces will fail to compose (e.g. two surfaces that must share a
piece of data will represent it differently; a cross-cutting policy will be enforced on some surfaces and
forgotten on others). The architecture must therefore pin the shared decisions **up front**.
