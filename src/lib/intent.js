/* ==========================================================================
   INTENT — lets one page ask the next to open ready for a specific job.

   "Ôn ngay" on the home page should land on the flashcards page with the
   review already running, not on a page where the same button must be found
   and pressed again. The receiving page peeks at the intent while it sets
   up, then clears it once it has mounted.
   ========================================================================== */

let pending = null;

export const setIntent = (intent) => {
  pending = intent;
};

export const peekIntent = (expected) => pending === expected;

export const clearIntent = () => {
  pending = null;
};
