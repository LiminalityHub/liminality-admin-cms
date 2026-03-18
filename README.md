# Liminality Admin

**Live site:** https://liminalityhub.github.io/liminality-admin-cms/

Standalone admin frontend for managing blog content via REST API.

## Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Variables:

- `REACT_APP_API_BASE_URL` - backend API base URL, e.g. `https://api.example.com`
- `REACT_APP_TEMP_ADMIN_ENABLED` - set `true` for temporary local passcode login
- `REACT_APP_TEMP_ADMIN_PASSCODE` - fixed passcode for temporary local login

## Temporary login behavior

Temporary passcode auth is disabled by default and blocked in production builds.

To enable it locally:

```env
REACT_APP_TEMP_ADMIN_ENABLED=true
REACT_APP_TEMP_ADMIN_PASSCODE=your-local-passcode
```

## Expected API endpoints

- `POST /auth/login` -> `{ accessToken, user }`
- `POST /auth/logout`
- `GET /posts`
- `GET /posts/:id`
- `POST /posts`
- `PUT /posts/:id`
- `DELETE /posts/:id`

All post write/read endpoints require `Authorization: Bearer <token>`.

## Run

```bash
npm install
npm start
```

## Build

```bash
npm run build
```

## Deployment notes

- Uses `HashRouter`, so static hosting (including GitHub Pages) works without route rewrites.
- Host this admin app separately from the public blog and point it to your API URL via env vars.
