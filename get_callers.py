import json

findings = [
    {
        "file": "src/app/api/movies/search/route.ts",
        "line": 26,
        "summary": "youtubeSearch return structure might have changed slightly or it is unchanged but internal API endpoint swapped. Return shape is still { results: [] } mapping. No breaking change identified based on caller.",
        "failure_scenario": "If the new invidious instance (invidious.nerdvpn.de) responds with a different JSON structure than the previous one (vid.puffyan.us), then `data.slice(0, limit)` will fail if `data` is not an array, leading to a 500 error in search API."
    },
    {
        "file": "src/lib/youtube.ts",
        "line": 50,
        "summary": "youtubeDetail internal caller ensureMovieFromYoutube. The detail method's endpoint changed to invidious.nerdvpn.de. Return shape remains the same assuming API structure is the same.",
        "failure_scenario": "If the new invidious instance returns slightly different fields for thumbnails, lengthSeconds, etc, `youtubeDetail` might return null or crash, causing `ensureMovieFromYoutube` to return null, and a 404 in the movie API route."
    },
    {
        "file": "src/app/api/movies/[id]/route.ts",
        "line": 13,
        "summary": "The entire GET handler was wrapped in a try-catch block. The logic inside was indented but functionally the same.",
        "failure_scenario": "Any exception thrown (e.g., from ensureMovieFromYoutube failing) is now caught and returned as a 500 response rather than an unhandled rejection crashing the server. This is a fix, not a breaking change."
    },
    {
        "file": "src/components/cinema/app-shell.tsx",
        "line": 104,
        "summary": "AppShell added a mounted state check to avoid SSR mismatch, returning null initially. Callers (like src/app/page.tsx) will now get null on first render.",
        "failure_scenario": "Any parent component or test relying on AppShell rendering its children (Header, Footer, Router) synchronously on the server or first render will fail/see an empty DOM."
    },
    {
        "file": "src/components/cinema/header.tsx",
        "line": 34,
        "summary": "NavLink added a mounted state check. 'active' boolean is now dependent on 'mounted' being true.",
        "failure_scenario": "NavLinks will not appear in the 'active' state during server-side rendering or initial hydration, potentially causing a visual flash or breaking snapshot tests checking for active classes."
    },
    {
        "file": "src/views/movie.tsx",
        "line": 218,
        "summary": "MovieView updated logic for extracting YouTube and Vimeo embed URLs, checking m.source instead of just URL substrings, and handling /embed/ URLs.",
        "failure_scenario": "If a custom video URL contains 'youtube.com' or 'vimeo.com' but doesn't conform to the assumed formats (e.g., missing v= or /video/ and /embed/), it might extract an undefined ID, causing the iframe src to be invalid (e.g., 'https://www.youtube.com/embed/undefined')."
    }
]

print(json.dumps(findings, indent=2))
