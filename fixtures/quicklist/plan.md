# quicklist — plan

A minimal shared to-do list. Three things a user must be able to do: **see all items**, **add an
item**, and **check one off**.

## Outcomes
- A user opening the app sees the current list of items.
- A user can add a new item and it appears in the list.
- A user can mark an item done (and undo it).

## Features (build order)
1. **schema** *(foundation)* — an `items` table (`id`, `text`, `done`) + a db connection. Everything
   else depends on this.
2. **list-view** *(core)* — an API route + view that renders all items. Depends on schema.
3. **add-item** *(core)* — an API route + form to create an item. Depends on schema. Must validate
   input (no empty item text).
4. **toggle-done** *(feature)* — flip an item's `done` flag. Depends on schema and on list-view (it
   renders the checkbox).

## Must-haves
- A user can add an item.
- A user can see all items.

## Concerns
- **input-validation** (required, applies to add-item): reject empty / oversized item text.
