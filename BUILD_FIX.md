# Build fix

The frontend is a Vite application. It does not use Next.js or
`@fluentui/react`.

From the project root in PowerShell, run:

```powershell
npm run install:frontend
npm run build
```

If dependencies were copied from another computer or operating system, clean
them once before reinstalling:

```powershell
Remove-Item -Recurse -Force frontend\node_modules -ErrorAction SilentlyContinue
npm run install:frontend
npm run build
```

Do not run `next build`, `npx next build`, or a build command from
`C:\Users\asily`. Those commands can select an unrelated Next.js setup and scan
Microsoft Office files under `AppData`, which produced the Fluent UI error.

For Netlify, keep the repository base at the project root. The included
`netlify.toml` changes the Netlify build base to `frontend` automatically.
