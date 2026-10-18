# veyal.github.io

Portfolio of [@Veyal](https://github.com/Veyal), penetration tester and maker of
[Interseptor](https://github.com/Veyal/interseptor), in a Kirby "Dream Land" style.

The home page leads with Interseptor: Kirby inhales floating HTTP requests, and visitors can edit
the caught request, then forward it (Kirby spits it out as a star) or drop it (he swallows it),
against a pretend server running in the browser. When a tampered request turns into a finding, Kirby copies
a matching ability (IDOR makes him Ninja, privilege escalation Sword, price tampering Hammer, and so on). Below it are the real product tour, screenshots, certifications and a set
of free client-side tools:

- **Encryptor**: encrypt and decrypt text in the browser
- **Password Generator**: cryptographically random passwords
- **JSON Beautifier**: format and validate JSON
- **AES Mode Detector**: spot ECB vs CBC from ciphertext patterns
- **Bill Splitter**: AI receipt reading and fair bill splitting

[`public/media/kirby-teaser.mp4`](public/media/kirby-teaser.mp4) is a short recording of the hero, including a copy-ability transformation.

## Stack

Next.js 14 (App Router, static export), Tailwind CSS, framer-motion, Fredoka for display type and
Recursive for body and code. Kirby art was generated with agy and chroma-keyed to transparent WebP. No backend; everything runs client-side.

## Development

```bash
npm install
npm run dev
```

## Deploy

Static export deployed to GitHub Pages (`gh-pages` branch):

```bash
npm run deploy
```

To roll back to an earlier deploy, push a tagged `gh-pages` commit back to the branch (`rollback/candy-gh-pages` is the original candy site, `rollback/pond-gh-pages` the frog version), for example:

```bash
git push --force origin 'rollback/pond-gh-pages^{commit}:refs/heads/gh-pages'
```
