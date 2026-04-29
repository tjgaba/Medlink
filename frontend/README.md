# MedLink React Dashboard

The frontend is a React 18 + Vite admin dashboard for Public Clinic Triage. It uses Axios for API calls, React Context for auth/session state, and SignalR for live case/staff notifications.

Only admin users should access this dashboard. Other roles use the Flutter app.

## Project Structure

```text
frontend/
  src/
    api/
      httpClient.js
    auth/
      AuthContext.jsx
    components/
      CaseCard.jsx
      DelegationActions.jsx
      StatusBadge.jsx
    hooks/
      useCases.js
    pages/
      DashboardPage.jsx
      LoginPage.jsx
    resilience/
      NetworkStatus.jsx
    routes/
    services/
    utils/
    App.jsx
    main.jsx
    styles.css
  .env.example
  index.html
  package.json
  vite.config.js
```

## Main Features

- Admin-only JWT login flow.
- Live triage dashboard with case cards, map/canvas panels, status controls, and profile drawers.
- Staff and patient directories with editable contact/personal details.
- Staff filtering, case history canvas, and active case summaries.
- Delegation, completion, cancellation, escalation, and audit-supporting workflows.
- SignalR connection to `/hubs/notifications`.
- Offline/network status and central API error handling.

## Environment

Create a local `.env` from the example when needed:

```text
VITE_API_BASE_URL=http://localhost:5043/api
```

`vite.config.js` also proxies local `/api` and `/hubs` requests to the backend at `http://localhost:5043`.

## Scripts

Install dependencies:

```powershell
npm ci
```

Run development server:

```powershell
npm run dev
```

Build production assets:

```powershell
npm run build
```

Preview production build:

```powershell
npm run preview
```

## Backend Dependency

The dashboard expects the backend API to be running before login:

```text
http://localhost:5043/api
```

If login or SignalR requests show `ERR_CONNECTION_REFUSED`, start the backend first.

