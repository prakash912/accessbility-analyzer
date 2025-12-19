# Render Build Fix - TypeScript Errors

## Problem

You're getting TypeScript compilation errors during build on Render:
- `Could not find a declaration file for module 'express'`
- `Cannot find name 'process'`
- `Cannot find name 'console'`

## Root Cause

Render sets `NODE_ENV=production` by default, which causes `npm install` to skip `devDependencies`. TypeScript and type definitions (`@types/*`) are in `devDependencies` but are needed for compilation.

## Solution

Update your **Build Command** in Render dashboard:

### Current (Broken):
```bash
cd apps/backend && npm install && npm run build
```

### Fixed:
```bash
cd apps/backend && NODE_ENV=development npm install && npm run build
```

## Steps to Fix

1. Go to your Render service dashboard
2. Navigate to **Settings** → **Build & Deploy**
3. Update the **Build Command** to:
   ```bash
   cd apps/backend && NODE_ENV=development npm install && npm run build
   ```
4. Click **Save Changes**
5. Render will automatically trigger a new deployment

## Why This Works

- `NODE_ENV=development` ensures all dependencies (including devDependencies) are installed
- TypeScript compiler and type definitions are now available during build
- Runtime still uses only production dependencies (they're in `dependencies`)

## Alternative Solutions

### Option 1: Using npm ci
```bash
cd apps/backend && NODE_ENV=development npm ci && npm run build
```

### Option 2: Install TypeScript globally (not recommended)
```bash
npm install -g typescript && cd apps/backend && npm install && npm run build
```

## Verification

After updating the build command, check the build logs. You should see:
- ✅ TypeScript compilation succeeds
- ✅ No "Cannot find name" errors
- ✅ No "Could not find a declaration file" errors

## Additional Fixes Applied

The `tsconfig.json` has been updated to include:
```json
{
  "compilerOptions": {
    "types": ["node"],
    "moduleResolution": "node"
  }
}
```

This ensures Node.js types are properly recognized.

