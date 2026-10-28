# Origin AI — Serper Web Search Integration

This package preserves the existing Origin Browser dashboard and adds live Serper web search plus optional AI answers grounded in those search results.

## Important security note

The Serper key pasted in chat should be revoked/regenerated before deployment. Do not paste API keys into `app.js`, `index.html`, or any other public frontend file.

## Deploy to Netlify

1. Copy the files in this folder into your existing website repository, replacing `index.html`, `app.js`, and `style.css` with these integrated versions.
2. Make sure your existing `favicon.png` is still in the published root folder.
3. Deploy the project to Netlify.
4. In Netlify, open **Site configuration → Environment variables** (menu wording may vary).
5. Add:
   - `SERPER_API_KEY` = your newly regenerated Serper API key
   - `OPENROUTER_API_KEY` = your OpenRouter API key (needed for AI answers)
   - `OPENROUTER_MODEL` = optional model ID available in your OpenRouter account; default is `openai/gpt-4o-mini`
   - `SITE_URL` = your deployed site URL, e.g. `https://ai-origin.netlify.app`
6. Trigger a new deploy so the function receives the environment variables.
7. Open the deployed website and submit a question in the main search bar or click the ✦ AI button.

## What it does

- Calls Serper from a Netlify Function, keeping the Serper key on the server.
- Shows clickable source links and search snippets.
- If `OPENROUTER_API_KEY` is configured, sends the question and numbered search results to OpenRouter and displays an answer with inline source-number citations.
- If only Serper is configured, it still shows web search results and explains that AI answers are not enabled.
- Preserves the existing dashboard, theme controls, notes, bookmarks, history, shortcuts, and other frontend features.

## Local testing

Use Node.js and Netlify CLI from this folder:

```bash
npm install -g netlify-cli
netlify dev
```

Set environment variables in your local shell before starting `netlify dev`, or use a local `.env` file that is **never committed** to Git. Do not open `index.html` directly with `file://`; the serverless function needs Netlify's local development server.

## Notes

This is prepared source code, not a prebuilt installer. It requires deployment and API keys to run real searches. The current dashboard's navigation still opens regular websites in new browser tabs; the main dashboard search and trending search buttons now use Origin's Serper-backed search.
