# Executive studio appearance refinement · October 6, 2026

CEO.ai now uses porcelain, sapphire and blue graphite, with a restrained brass undertone. Manrope is the locally bundled interface face; Newsreader supplies editorial display headings. Both fonts and their SIL Open Font Licenses are in `frontend/public/fonts/`. No runtime font-provider request is needed.

Shared materials cover the marketing/account/classic routes and executive studio. Navigation and controls have a specular rim and bounded blur; documents, reports, charts and tasks retain readable content surfaces. The studio now uses semantic color tokens, so its saved accent and surface preferences apply coherently. Curated accents are Sapphire, Petrol, Amethyst, Steel Blue, Mulberry, Jade, Atlantic and Indigo. Existing saved RGB preferences remain usable.

Dark-mode text and focus accents are lightened separately from button fills. Metric numerals keep stable widths. The executive hero has sapphire depth, a pale action and Newsreader typography. Focus, reduced motion/transparency, high contrast, mobile drawer and system-theme behavior remain active.

## Verify visually

Follow [the manual guide](MANUAL_TEST.md) to start the API and web application. Open the studio and switch Appearance through light, dark and system. Expect porcelain cards, a sapphire executive panel, luminous navigation and serif page headings in light mode; blue-graphite content, pale text and brighter text accents in dark mode. Open Visual comfort and enable all three preferences: the navigation becomes solid, transitions become immediate, and text/edges gain contrast. Reload to check persistence. At phone widths, open/close the navigation drawer and use every destination by touch and keyboard.

The fresh [light](screenshots/premium-refinement-2026-10-06/studio-light.png), [dark](screenshots/premium-refinement-2026-10-06/studio-dark.png), [phone](screenshots/premium-refinement-2026-10-06/studio-mobile.png), [comfort](screenshots/premium-refinement-2026-10-06/visual-comfort.png) and [dark marketing](screenshots/premium-refinement-2026-10-06/premium-marketing-dark.png) captures show actual isolated browser accounts/workspaces.

## Regression checks

TypeScript, ESLint and the sixteen-route production build passed. The full five-journey production browser suite passed. After the final dark action-label contrast adjustment, a fresh production build and the two affected studio/marketing journeys passed again. Both dark marketing accents and the studio primary label are checked against a 4.5:1 contrast floor. Other browser checks cover loaded Manrope/Newsreader faces, responsive navigation, persisted comfort preferences, actual nine-specialist runs, decisions/tasks/knowledge, exports/sharing, account/session handling and workspace ownership.

The production bundle must be compiled with the matching local API origin. Set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8012` before `npm run build` when using the fixture on 8012. Setting it only when starting an existing build cannot change its embedded value.

The metric regression harness now waits for the actual POST and PUT responses and checks both the numeric current value and its historical observation by the same record ID. The prior check read history before the pending update committed; trace and isolated database inspection showed the persisted data itself was correct. It still verifies version increments and real read-back.

Final browser counts and current build/font fingerprints are in the workspace's [refinement verification record](../../PREMIUM-REFINEMENT-VERIFICATION-2026-10-06.json). Platform/provider limitations remain those in the manual guide.
