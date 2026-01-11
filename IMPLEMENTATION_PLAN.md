# Implementation Plan - Translation Wrapper

> **Last Updated:** 2026-01-08
> **Status:** Active Development

---

## Phase 1: Core Feature Completion ✅ → In Progress

### 1.1 Per-Row Prompt Assignment [90% DONE]
**Status:** UI implemented, auto-grouping logic done

| Step | Task | Status |
|------|------|--------|
| 1 | Add `promptId` field to row data model | ✅ Done |
| 2 | Add "Assign Prompt" dropdown to bulk actions bar | ✅ Done |
| 3 | Display prompt badge in InlineRow component | ✅ Done |
| 4 | Implement auto-grouping by promptId in ProjectContext | ✅ Done |
| 5 | Add "Prompt" column header to table view | ⬜ Pending |
| 6 | Test with mixed prompt assignments | ⬜ Pending |

---

## Phase 2: Authentication & Authorization

### 2.1 Firebase Auth Integration [NOT STARTED]
**Priority:** High - Required for production

| Step | Task | Status |
|------|------|--------|
| 1 | Enable Firebase Auth (Email/Password or Google) | ⬜ Pending |
| 2 | Create `AuthContext.jsx` with login/logout/user state | ⬜ Pending |
| 3 | Add Login page (`/login`) | ⬜ Pending |
| 4 | Implement `ProtectedRoute` component | ⬜ Pending |
| 5 | Store user role in Firestore `users` collection | ⬜ Pending |
| 6 | Remove `DEV_BYPASS_AUTH` flag for production | ⬜ Pending |

### 2.2 RBAC Implementation [PARTIALLY DONE]
**Priority:** Medium - Manager flow complete, need Editor/Viewer restrictions

| Step | Task | Status |
|------|------|--------|
| 1 | Manager flow - all features | ✅ Done |
| 2 | Hide "Manage Approvals" for Editor/Viewer | ⬜ Pending |
| 3 | Hide Approve/Reject buttons for Editor | ⬜ Pending |
| 4 | Make table read-only for Viewer | ⬜ Pending |
| 5 | Hide Settings > Administration for Editor/Viewer | ⬜ Pending |
| 6 | Test all role flows end-to-end | ⬜ Pending |

---

## Phase 3: UI Enhancements

### 3.1 Prompt Library Improvements [NOT STARTED]
**Priority:** Low - Nice to have

| Step | Task | Status |
|------|------|--------|
| 1 | Replace modal with side panel editor | ⬜ Pending |
| 2 | Add structured fields: Role, Goal, Constraints, Tone | ⬜ Pending |
| 3 | Add prompt preview with variable substitution | ⬜ Pending |

### 3.2 Sidebar Improvements [NOT STARTED]
| Step | Task | Status |
|------|------|--------|
| 1 | Add "Home" item at top of sidebar | ⬜ Pending |
| 2 | Highlight current page in sidebar | ⬜ Pending |

---

## Phase 4: Document Support

### 4.1 Word Document Import/Export [NOT STARTED]
**Priority:** Medium

| Step | Task | Status |
|------|------|--------|
| 1 | Install `docx` library | ⬜ Pending |
| 2 | Create `parseDocxFile()` function | ⬜ Pending |
| 3 | Add .docx support to ImportExcelDialog | ⬜ Pending |
| 4 | Create `exportToDocx()` function | ⬜ Pending |
| 5 | Preserve formatting in export | ⬜ Pending |

---

## Phase 5: Quality & Intelligence

### 5.1 Automated Quality Checks [NOT STARTED]
**Priority:** Medium

| Step | Task | Status |
|------|------|--------|
| 1 | Validate {placeholders} preserved in translations | ⬜ Pending |
| 2 | Length check: warn if translation >2x source | ⬜ Pending |
| 3 | Add warning icons to failed validations | ⬜ Pending |
| 4 | Show validation summary in bulk actions bar | ⬜ Pending |

### 5.2 Translation Memory (RAG) [NOT STARTED]
**Priority:** Low - Future enhancement

| Step | Task | Status |
|------|------|--------|
| 1 | Design translation memory schema | ⬜ Pending |
| 2 | Save approved translations to memory | ⬜ Pending |
| 3 | Query memory before new translation | ⬜ Pending |
| 4 | Suggest similar past translations | ⬜ Pending |

---

## Phase 6: Deployment

### 6.1 Production Preparation [NOT STARTED]
**Priority:** High - When ready to deploy

| Step | Task | Status |
|------|------|--------|
| 1 | Set `DEV_BYPASS_AUTH = false` | ⬜ Pending |
| 2 | Configure Firebase production project | ⬜ Pending |
| 3 | Set up production environment variables | ⬜ Pending |
| 4 | Run production build (`npm run build`) | ⬜ Pending |
| 5 | Deploy to Vercel/Netlify | ⬜ Pending |
| 6 | Test all features in production | ⬜ Pending |

---

## Bug Fixes & Maintenance

| Issue | Description | Status |
|-------|-------------|--------|
| ~~Prompt duplication~~ | React StrictMode race condition | ✅ Fixed |
| ~~Glossary import~~ | Missing `createGlossaryTerms` function | ✅ Fixed |
| ~~Language order~~ | Swapped to EN → MY → ZH | ✅ Fixed |

---

## Quick Reference

**Recommended Next Steps:**
1. Complete Phase 1.1 (test prompt assignment flow)
2. Start Phase 2.1 (Firebase Auth) when ready for production
3. Clean up Firestore duplicate data

**Files frequently modified:**
- `src/pages/project-details.jsx` - Main project view
- `src/context/ProjectContext.jsx` - Project state management
- `src/services/firebase/*.js` - Firebase CRUD operations
