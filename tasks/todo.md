# Dark Neon Retheme + Landing Redesign

Reference: dark AI-agency hero (deep purple-black, violet→cyan neon gradients, glowing orb,
centered nav pill, trusted-by logo marquee, services section).

Decisions (confirmed with user):
- Whole-app retheme via design tokens (not per-component).
- Sign-in form moves OFF home → dedicated `/signin` route. Home CTAs link there.
- Keep THIS product's real story (PDF RAG, "Ask your documents, get answers with receipts").

## Tasks
- [ ] 1. `globals.css`: rewrite `:root` tokens to dark neon palette (default = dark).
      Add neon utilities: `.text-gradient`, `.grid-bg`, `.glow`, gradient-border button,
      and keyframes: marquee, orb-spin/pulse, float, aurora.
- [ ] 2. `layout.tsx`: add a distinctive display font (Bricolage Grotesque) for headings.
- [ ] 3. `tailwind.config.ts`: point `display` family at the new font var.
- [ ] 4. New `components/PlasmaOrb.tsx`: animated CSS/SVG plasma sphere (hero visual).
- [ ] 5. Rewrite `app/page.tsx`: nav, hero+orb, trusted-by marquee, services, how-it-works,
      CTA band, footer. Remove `<LoginForm/>`; CTAs → `/signin`.
- [ ] 6. New `app/signin/page.tsx`: branded dark split layout housing `LoginForm`
      (redirect to /chatroom if already signed in).
- [ ] 7. Polish `loginForm.tsx` for the dark theme.
- [ ] 8. Quick fixes: skeleton loaders `bg-gray-200` → `bg-muted` so they don't glare on dark.
- [ ] 9. Verify: typecheck + render landing & /signin in browser (desktop + mobile).

## Review
Done — verified in-browser (desktop + mobile) with a clean typecheck and no console errors.

- Retheme is token-level: rewrote `:root` in `globals.css` to a deep violet-black palette
  with violet→magenta→cyan neon gradients. The whole app shifts because every surface reads
  semantic tokens. Added utilities: `.text-gradient`, `.grid-bg`, `.aurora`, `.glow`,
  `.border-gradient`, `.marquee-mask`, and keyframes (marquee, orb-spin, orb-pulse, gradient-pan).
- Display font swapped Fraunces → Bricolage Grotesque (geometric grotesk) for the tech look.
- `PlasmaOrb` is pure CSS/SVG (layered conic gradients + a turbulence-displaced filament web +
  glowing nucleus) — no image asset needed.
- Home rebuilt: sticky nav pill, hero + orb with floating proof chips, formats marquee,
  services, how-it-works, FAQ (`<details>`, no JS), CTA band, footer. Form removed from home.
- New `/signin` route houses `LoginForm` in a branded split layout; redirects to /chatroom if
  already authed. Both home and /signin redirect signed-in users.
- Fixed: `.border-gradient` sets `position:relative`, which clobbered `absolute` on the orb
  chips → switched chips to a solid token border.
- Cleanups: deleted orphaned googleLogin/discordLogin; dark skeleton loaders; product renamed
  "Levia"; metadata title/description fixed.

Gotcha for future: don't combine `.border-gradient` with `absolute` — the utility forces
`position:relative`. Use a plain border on positioned elements.
