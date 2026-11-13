# Monsoons Farmyard M009: permanent Render website

This package contains the complete game-only mobile playtest in `public/`.
The World Builder is not included. There are **no save files, secrets or private desktop tools**.

## Deployment

1. Create a new **private or public GitHub repository** for this release, e.g. `monsoons-farmyard-phone`.
2. Upload everything in this ZIP to the repository root, retaining the `public/` folder and `render.yaml`.
3. In Render (https://dashboard.render.com), select **New > Static Site** and connect the repository.
4. Use build command `echo "Farmyard static build ready"` and publish directory `public`.
5. Select the free tier if available and check the Render billing terms before confirming.
6. After successful deployment, test the `onrender.com` link in Safari on an iPhone, then Share > Add to Home Screen.

Alternatively, use a Render Blueprint with the included `render.yaml`; preview/approve its initial infrastructure sync before deployment.

## Game

- Mobile game-only title screen, Continue / New Farm and onboarding
- Local autosave and recovery backups, mobile landscape/portrait responsive controls
- Farm Noticeboard, customer timers, helpers and other M008 gameplay
- Feedback form with Share/Copy actions; sharing only occurs when the player taps it
- Offline caching on compatible browsers after successful first HTTPS load

## Important caveats

- Saves are LOCAL to each browser/device and do not synchronise automatically.
- This is a PWA/web game, **not** an iOS .ipa or Android .apk.
- Internet is required for the first load, even if subsequent offline access works.
- The source was QA-tested in desktop Edge at iPhone landscape/portrait sizes; physical iPhone/Android play still needs testing.
- A permanent Render URL is available only AFTER the site is actually deployed.
