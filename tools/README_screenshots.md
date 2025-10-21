# Screenshot helper

This folder contains a small Puppeteer script to capture headless screenshots of `index.html` at common breakpoints.

Usage

1. Install puppeteer (dev dependency):

```powershell
npm install puppeteer --save-dev
```

2.Run the screenshot script from the project root:

```powershell
node tools/screenshot.js screenshots
```

This will create a `screenshots` folder with `index-desktop.png`, `index-tablet.png`, and `index-mobile.png`.

Notes

- The script loads `index.html` via a `file://` URL so it doesn't require a server.
- If you want to capture other pages, modify the `url` variable in `tools/screenshot.js`.
