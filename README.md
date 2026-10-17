# veyal.github.io

Personal site of **Andrew Salim** ([@Veyal](https://github.com/Veyal)), penetration tester and maker of
[Interseptor](https://github.com/Veyal/interseptor).

The home page leads with Interseptor: a night-pond hero where the Interseptor frog catches flying
HTTP requests, and visitors can edit, forward or drop the caught request against a pretend server
running in the browser. Below it are the real product tour, screenshots, certifications and a set
of free client-side tools:

- **Encryptor**: encrypt and decrypt text in the browser
- **Password Generator**: cryptographically random passwords
- **JSON Beautifier**: format and validate JSON
- **AES Mode Detector**: spot ECB vs CBC from ciphertext patterns
- **Bill Splitter**: AI receipt reading and fair bill splitting

[`public/media/pond-teaser.mp4`](public/media/pond-teaser.mp4) is a 10-second recording of the hero.

## Stack

Next.js 14 (App Router, static export), Tailwind CSS, framer-motion, and the Recursive variable font
(its casual and mono axes cover headlines, body and code). No backend; everything runs client-side.

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

To roll back to an earlier deploy, push a tagged `gh-pages` commit back to the branch, for example:

```bash
git push --force origin 'rollback/candy-gh-pages^{commit}:refs/heads/gh-pages'
```
