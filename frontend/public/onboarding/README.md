# Onboarding clips

Four vertical clips play inside a phone frame the first time someone opens the
dashboard. Drop the files here and they appear automatically — no code change.

| File | Step | What to record |
|---|---|---|
| `01-ask.mp4` | Give the board something to argue about | Opening the chat tile, tapping the mic or typing a goal, sending it |
| `02-convene.mp4` | Watch nine specialists file | The boardroom ring filling desk by desk, scores counting up, verdict resolving |
| `03-spread.mp4` | Read where they disagree | Operations, the conviction band, the two named outliers |
| `04-review.mp4` | Work the tasks, let the board score you | Ticking a task, then setting a weekly cadence in Board |

Optional `01-ask.jpg` … `04-review.jpg` posters show as the first frame while
each clip loads. Without them the frame stays dark for a moment.

## Recording spec

- **9:16 vertical**, 1080×1920. The frame is 9:19.5 and crops with `object-fit:
  cover`, so keep anything important away from the top and bottom eighth.
- **8–14 seconds.** They loop silently and autoplay, so a clip that runs long
  gets watched twice before anyone reads the text.
- **No audio.** Muted is required for autoplay in every browser, so a voiceover
  will never be heard. Put the message in the on-screen copy instead.
- **H.264 MP4** for the widest support. Target under 2MB each — they load on
  first paint of the dashboard.
- Record on a real phone or Chrome DevTools device mode at 390×844, then scale
  to 1080×1920.

## Compressing

```
ffmpeg -i raw.mov -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -c:v libx264 -crf 28 -preset slow -an -movflags +faststart 01-ask.mp4
```

`-an` strips audio, `+faststart` lets playback begin before the file finishes
downloading.

## Until the clips exist

Each frame shows a placeholder naming the file it expects. The tour is fully
usable without any video — the copy carries it — so shipping before the clips
are recorded is fine.

Editing the steps, their copy, or the filenames: `src/components/dashboard/onboarding.tsx`.
