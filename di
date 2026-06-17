* [33m1161123[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmain[m[33m)[m Updated site
* [33m60716d0[m[33m ([m[1;31morigin/main[m[33m, [m[1;31morigin/HEAD[m[33m)[m Improve: Center 3D spline model, implement responsive student cards layout for mobile view, and show credentials inside admin dashboard
* [33mcac79d1[m Fix: Enhance cleanPrivateKey to robustly handle malformed PEM header/footer typos and layout variations
* [33m8509ad7[m Debug: Add private key inspection to registration endpoint debug payload
* [33m38ddaa4[m Fix: reset _initialized on Firebase Admin initialization failure
* [33m674e080[m Reconstruct PEM format if Netlify collapses newlines into spaces in the environment variable
* [33m5f0d176[m Throw detailed errors for Firebase Admin configuration and add debug payload to client alert
* [33m7a39fbd[m Evaluate Firebase Admin config at runtime not build time - fixes 'not configured' on Netlify
* [33m4bf08b6[m Lazy-initialize Firebase Admin at runtime instead of build time - fixes Netlify deploy
* [33m95f275c[m Strip carriage returns and resolve literal newlines in parsed service account private key
* [33m0588921[m Support single FIREBASE_ADMIN_SERVICE_ACCOUNT variable containing whole JSON or Base64 key
* [33m7927215[m Robust private key parsing, base64 support and debug logs for firebase admin
* [33mfb919f8[m Optimize mobile views, Spline model scroll performance, fix font loading and Firebase admin credentials
* [33m83b944e[m Migrate theme to warm greenish style, optimize Spline background, and implement admin-managed student account creation with firebase auth
* [33m9560b23[m  chore: add netlify.toml and remove conflicting package-lock.json
