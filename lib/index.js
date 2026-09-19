/**
 * dsh-hero-flex host half.
 *
 * The hero flex is a pure client-surface concern: the corner seat
 * (conversation.session.header.corner) occupant, its plugin-additive
 * `hero.flex` child slot, and the re-painted right-sidebar expand button all
 * live in the browser bundle. The host half exists so the bundle has a valid
 * entry; it currently contributes no routes or services.
 */

/** Plugin identity for cordis.yml rows. */
export const name = 'dsh-hero-flex'

/** Apply the host half (no-op today). */
export function apply() {
  // The hero flex contributes nothing on the host side yet.
}
