# Railway Simple Working Solution

## ✅ All Config Files Removed
- ❌ No Dockerfile
- ❌ No nixpacks.toml  
- ❌ No docker configs
- ✅ Just Procfile (simple)

## Solution: Puppeteer as Optional Dependency

Puppeteer is now in `optionalDependencies` instead of `dependencies`. This prevents Railway from auto-detecting it and trying to install Chrome system dependencies.

## Railway Configuration

### Step 1: Root Directory
Set to: `apps/backend`

### Step 2: Build Command (Manual)
In Railway Dashboard → Settings → Build & Deploy:

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
npm start
```

**Important:** Set these manually to override auto-detection.

### Step 3: Environment Variables
- `NODE_ENV=production`
- `FRONTEND_URL=https://your-frontend.vercel.app`

## How It Works

1. **npm install** - Installs dependencies (Puppeteer as optional, won't fail if missing)
2. **npm run build** - Builds TypeScript
3. **npm start** - Starts the service
4. **Puppeteer loads at runtime** - Code uses dynamic require, so it works even if optional

## Deploy

```bash
git add .
git commit -m "Fix Railway: Move Puppeteer to optionalDependencies"
git push
```

## Why This Works

✅ **optionalDependencies** - Railway won't auto-detect Puppeteer
✅ **No special configs** - Railway uses simple Node.js detection
✅ **Dynamic require** - Code already handles Puppeteer loading at runtime
✅ **No Chrome during build** - Prevents apt-get failures

This is the simplest working solution! 🚀

