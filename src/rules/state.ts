import type { Rule } from "../types.js";

export const stateManagementRules: Rule = {
  id: "state-management",
  name: "State Management",
  applies: (a) => a.detected.stateManagement !== null,
  gaps: [
    {
      category: "store-organization",
      severity: "medium",
      check: (a) => !a.structure.hasStoreDir,
      message: "No store directory detected",
      details:
        "Without a dedicated store/ directory, Claude will create stores in random locations.",
    },
  ],
  conventions: [
    // Zustand-specific
    {
      id: "state-zustand-small-stores",
      description: "Small, focused stores (Zustand)",
      rule: "Create one store per domain concern (useAuthStore, useCartStore, useUIStore). Never put everything in a single store.",
    },
    {
      id: "state-zustand-selectors",
      description: "Use selectors (Zustand)",
      rule: "Always use selectors to subscribe to specific state slices: `useStore(state => state.count)`. Never subscribe to the entire store.",
    },
    // Redux-specific
    {
      id: "state-redux-slices",
      description: "RTK slices (Redux)",
      rule: "Use createSlice from @reduxjs/toolkit. One slice per feature. Never use the legacy connect() API.",
    },
    // General
    {
      id: "state-server-vs-client",
      description: "Separate server state from client state",
      rule: "Server data (API responses) belongs in React Query/SWR. Client state (UI state, forms) belongs in Zustand/Redux/Context. Never mix them.",
    },
    {
      id: "state-no-derived",
      description: "No derived state in stores",
      rule: "Compute derived values outside the store (selectors, useMemo). Never store computed data that can be derived from other state.",
    },
  ],
  interdictions: [
    "NEVER store server-fetched data in Zustand/Redux when React Query/SWR is available.",
    "NEVER put async logic (API calls) directly inside Zustand stores — use actions that call services.",
    "NEVER use global state for data that only one component needs — use local state instead.",
  ],
  crossRefs: [],
};
