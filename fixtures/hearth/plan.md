# Hearth — plan

Hearth is a brand-new B2B team workspace. Companies bring their teams into Hearth to organize
work into projects and tasks, keep the right people in the right rooms, attach the files that work
depends on, and stay accountable to each other and to their auditors. It is sold per seat, so the
people who run a company need to be able to grow and shrink their team and pay for exactly what
they use.

This is greenfield. There is no existing product, no user accounts, no billing relationship, and no
data to migrate. We are stating the outcomes a customer and the people on their team care about —
the team will work out everything underneath.

## Who it's for

The buyer is a company. Inside that company there are people who run the organization (they own the
account and decide who belongs and who pays), people who help run it day to day, and people who just
do the work. Hearth should feel right for all three, and it should never let someone do something
their role does not entitle them to.

## What people should be able to do

**Get in the door.** People sign in to Hearth using their own company's identity provider — the same
single sign-on they already use for everything else at work. Once they are in, they stay in as they
move around the product, and they can sign out when they are done. There is no separate Hearth
password to remember; the company's identity provider is the only way in.

**Form the org and bring the team.** A company has an organization in Hearth, and within it teams.
Someone running the org can invite teammates by email. An invited person can accept and join, or
decline. The org's roster reflects who has actually joined.

**Hold the right roles.** Not everyone can do everything. Owners and admins can do things ordinary
members cannot — manage the org, manage who belongs, change roles, and reach the sensitive parts of
the product — while members get on with the work. What a person sees and what a person is allowed to
do should follow from their role, everywhere it matters.

**Do the work: projects and tasks.** The team organizes work into projects, and within a project
into tasks. Members create tasks, assign them to people, edit them, and mark them complete. A
project is a place a team works together, and a task moves from open to done.

**Keep the files with the work.** A task can have files attached to it — the spec, the screenshot,
the contract. People upload files onto a task and download them again later when they need them.

**Stay accountable.** The organization keeps an audit log: a durable record of who did what and
when, across the things that matter for compliance — joining and leaving, role changes, changes to
work, access to files, billing events. The people who run the org can review this record when an
auditor asks.

**Stay in the loop.** As things happen in the workspace — a task assigned, an invite accepted, a
comment, a project update — the people who care should find out. Hearth surfaces a feed of recent
activity, and reaches people through in-app and email notifications so changes do not get missed.

**Pay for the team.** The organization is on a paid subscription, billed per seat. The people who
run the org choose a plan, pay for the number of seats they need, and the size of the team they can
actually have follows from what they are paying for. Growing the team or letting people go is
reflected in what the organization is billed.

## What "good" looks like

- A person can sign in through their company's SSO, stay signed in while they use Hearth, and sign
  out.
- An org owner or admin can invite a teammate by email, and that person can accept or decline.
- Owners and admins can do org- and people-management things that ordinary members cannot, and the
  product enforces that distinction wherever it applies.
- A member can create a task in a project, assign it, edit it, and mark it complete.
- A person can attach a file to a task and download it later.
- The org has an audit trail of who-did-what that the people running it can review for compliance.
- The right people are notified, in-app and by email, when things they care about change.
- An organization can subscribe and pay per seat, and how many people it can have follows from what
  it is paying for.

Beyond these, we want all the obvious-in-hindsight things a real product like this needs to be
trustworthy and coherent — but those are for the team to enumerate, not something we are going to
spell out here.
