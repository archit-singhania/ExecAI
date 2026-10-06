# Executive motion and design collections · October 6, 2026

CEO.ai adds **Sapphire & Porcelain**, **Petrol & Mineral**, and **Mulberry & Linen** collections. Each coordinates an accent with both light/dark surface tones. Visual comfort exposes accessible radio choices and retains existing custom accents/surfaces. Selection is stored on the device, restored before first paint, and shared by marketing, account and studio routes. Manrope controls, Newsreader display type, tabular metrics and readable documents retain their distinct hierarchy.

Route content rises eight pixels and settles in 280 ms while navigation stays steady. Metric entrances use a bounded 35 ms stagger; navigation markers, notifications, search sheets, controls and fields have coherent short feedback. Search sheets preserve their centered position throughout their transition. Hover effects apply only to accurate pointers; press feedback remains available on touch. Reports and input buffers keep their readable surfaces and state.

Both system reduced motion and the saved Reduce motion preference skip/cancel route transitions and disable decorative CSS motion. High contrast, solid surfaces, keyboard focus and mobile navigation remain supported. Collection changes use semantic roles rather than recoloring individual screens.

## Manual inspection

1. Follow [the setup guide](MANUAL_TEST.md), using the same API origin when building and starting the web app. Open the studio and Visual comfort.
2. Choose each collection, compare light/dark, then reload. The radio selection, accent, surfaces and body tones should remain coordinated. Custom theme swatches remain usable.
3. Navigate Overview → Boardroom → Decisions → Execution. New content should settle quickly and the navigation shell should remain anchored. Open search and Visual comfort; sheets stay centered and focus returns on Escape.
4. Run the board, save a decision/task, update a metric and reopen records. Actual API progress/results remain visible; notification motion never substitutes for success.
5. Enable Reduce motion, Reduce transparency and Increase contrast, then repeat routes and reload. Motion should become immediate, floating surfaces solid and focus outlines stronger. On a phone, check every drawer destination and keyboard traversal.

The production motion regression samples an actual rendered animation through its settled state and verifies no route animation under operating-system reduction. The existing full suite checks owned runs, roles, numeric/history read-back, exports, persistence and mobile/keyboard recovery. Exact current results/artifacts are in the workspace motion verification report. This is not a measured reference-device 60 fps claim.
