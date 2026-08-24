# BlueHope Product Fixes Notes

## Firebase Google Auth

The current `.env.local` contains all expected `NEXT_PUBLIC_FIREBASE_*` variables, but the Web API key is rejected by Google's Identity Toolkit endpoint with:

```text
API key not valid. Please pass a valid API key.
```

This means the app cannot complete real Google sign-in until `NEXT_PUBLIC_FIREBASE_API_KEY` is replaced with the active browser Web API key from the same BlueHope Firebase project. After changing `.env.local`, restart `npm run dev`; Next.js does not reload environment variables into the browser bundle without a restart.

The app now performs a client-side key preflight before opening the Google popup and shows a developer-facing configuration message instead of the raw Firebase exception.

## Profile Loading Investigation

The profile page was mostly local/demo data, so the slow feeling was not caused by Firestore reads yet. The main blocking risk was rendering all profile sections and map content together. The fix splits critical profile content from non-critical content:

- profile header renders first;
- route-level loading skeletons were added for provider/institute profile routes;
- reviews/about/gallery/Q&A are interactive tab content;
- map preview is dynamically loaded with a skeleton;
- contact and booking panels load only when opened.

When Firestore is connected, keep public profile data and `searchListings` small, defer reviews/gallery/map reads, and paginate reviews.
