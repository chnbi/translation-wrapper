# Translation Wrapper - Requirements Document

*Version 2.1 | Last Updated: 2026-01-08*

> **Purpose:** Single source of truth for the Translation Wrapper application development.

## 1. Project Overview

### 1.1 Description
A translation wrapper tool for a telecommunications company content team. It facilitates AI-assisted translation from English to Bahasa Malaysia and Simplified Chinese, incorporating a strict human-in-the-loop review workflow.

**Key Value Proposition**
*   **AI Translation:** Automated batch translation via Gemini API.
*   **Consistency:** Managed glossaries for brand terms.
*   **Context:** Customizable prompts for tone (e.g., Marketing vs Legal).
*   **Control:** Role-Based Access Control (RBAC) with approval gates.

### 1.2 Supported Languages
| Code | Language | Role |
| :--- | :--- | :--- |
| **EN** | English | Source |
| **MY** | Bahasa Malaysia | Target |
| **ZH** | Simplified Chinese | Target |

### 1.3 Technology Stack
*   **Frontend:** React, Vite, TailwindCSS, ShadCN
*   **Backend:** Firebase (Firestore, Auth)
*   **AI:** Google Gemini API (`@google/genai`)
*   **File I/O:** `xlsx` library

## 2. Core Features

### 2.1 AI-Assisted Translation
*   **Status:** ✅ Completed
*   **Goal:** Automate batch translations with gracefull failure handling.
*   **Workflow:** Input (Manual/Excel) -> Queue -> Batch API Call (10 rows) -> Review Status.
*   **Tech:** `gemini-2.0-flash`, exponential backoff for rate limits.

### 2.2 Review Workflow (Human-in-the-Loop)
*   **Status:** ✅ Completed
*   **Goal:** Edit-in-Place quality control.
*   **Process:** 
    *   **Editors:** Edit text, Request Re-translation.
    *   **Managers:** Edit, Approve, Reject.
*   **Flow:** AI → Review → Manager Decision → Completed/Rejected.

### 2.3 Glossary Management
*   **Status:** ✅ Completed
*   **Goal:** Enforce mandatory terminology.
*   **Features:** Dynamic injection into prompts; Categorized terms (General, UI, Brand); Bulk Excel Import.

### 2.4 Prompt Engineering
*   **Status:** ✅ Completed
*   **Goal:** Context-aware translation styles.
*   **Use Cases:** Banner (Short/Punchy), Legal (Formal/Precise).
*   **Features:** Variable substitution (`{{target_language}}`); Prompt Lifecycle (Draft/Published).

### 2.5 Excel Import/Export
*   **Status:** ✅ Completed
*   **Goal:** Bulk handling of legacy data.
*   **Features:** Multi-sheet parsing; Full status export; Column mapping.

## 3. Application Screens

### 3.1 Dashboard (`/`)
*   **Grid:** Recent projects with status summary.
*   **Actions:** New Project, Import Excel, Manage Approvals.

### 3.2 Project Details (`/project/:id`)
*   **Table:** Status badges (Green/Yellow/Red), Bulk Actions (Translate, Approve).
*   **Header:** Export, Delete.

### 3.3 Approval Dashboard (`/approvals`)
*   **Access:** Manager/Admin.
*   **View:** Aggregated "Review" items across ALL projects.
*   **Action:** One-click Approve/Reject.

### 3.4 Image Translation (`/image-translate`)
*   **Flow:** Upload -> (Gemini Vision) Extract Text -> Verify -> Translate.

## 4. Role-Based Access Control (RBAC)

**Config:** `DEV_BYPASS_AUTH = true` (Simulates Manager).

### 4.1 Permissions
| Action | Admin | Manager | Editor | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **Create Project** | ✅ | ✅ | ✅ | ❌ |
| **Edit/Translate** | ✅ | ✅ | ✅ | ❌ |
| **Approve/Reject** | ✅ | ✅ | ❌ | ❌ |
| **Settings** | ✅ | ✅ | ❌ | ❌ |

## 5. Data Architecture

### 5.1 Type Definitions
Strict TypeScript interfaces for data consistency.

```typescript
/** Status of a translation row. */
type RunStatus = 'draft' | 'pending' | 'review' | 'completed' | 'rejected';

interface TranslationRow {
  id: string;
  en: string;               // Source
  my: string;               // Malay
  zh: string;               // Chinese
  status: RunStatus;
  promptId?: string | null; // Optional override
  updatedAt?: number;
  lastEditor?: string;
}

interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: number;
  lastUpdated: number;
}

interface GlossaryTerm {
  id: string;
  en: string;
  my: string;
  zh: string;
  category: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  status: 'draft' | 'published';
}
```

## 6. Planned Features

### 6.1 Per-Row Prompt Assignment (🚧 In Progress)
*   **Requirement:** Map specific rows to specific prompts.
*   **Optimization:** Batch rows by `promptId` before API calls.

### 6.2 Future Enhancements
*   **Auth:** Full Firebase Auth.
*   **Docs:** `.docx` support with formatting.
*   **Memory:** RAG-based lookup for past approvals.
