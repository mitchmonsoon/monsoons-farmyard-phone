MONSOONS FARMYARD | M009 FRIEND PLAYTEST EDITION

THIS IS A READY-TO-HOST WEB GAME, NOT AN IPHONE IPA OR ANDROID APK.
For iPhone, send an HTTPS web link. The friend opens it in Safari, then taps Share > Add to Home Screen.
For Android, open the link in Chrome and use menu > Add to Home Screen / Install app.

The game starts in its own full-screen-style player, without World Builder.
The start screen has Continue, New farm, How to play, and Send test feedback.
It works offline AFTER the first successful online load, if the browser supports service workers.
The game autosaves on that phone only. It does not access the owner's Windows saves.

To host permanently: upload the CONTENTS of this folder to any HTTPS static web host
(Netlify Drop, Cloudflare Pages, Vercel, etc.) and send the resulting URL.
Do not send the ZIP straight to an iPhone and expect it to run from Files: ES modules require a web server.
For testing on a PC connected to the same Wi-Fi, run: python -m http.server 8765 --directory <THIS FOLDER>
Then connect another device to http://<PC-IP>:8765 (service worker requires HTTPS).

TESTER QUESTIONS
1. Could you start playing without instructions?
2. Did it feel fun to cut, stack, and sell?
3. Was the camera easy to use in landscape?
4. Were the customer timers fair?
5. Did the farm continue where you left it?
6. Did anything freeze or disappear?

Build: M009 Phone Playtest, based on Monsoons Farmyard M008 / game engine 1.5.0.
This is not an App Store-signed install package. No online account or save sync is included.
