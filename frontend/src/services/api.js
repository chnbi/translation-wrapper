import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// --- Helper for custom backend calls ---
const fetchApi = async (url, options = {}) => {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network response was not ok' }));
    throw new Error(errorData.error || 'API request failed');
  }
  return response.json();
};


// --- Projects ---
export const projectAPI = {
  getAll: async () => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { data }; // Mimic axios response structure
  },
  getById: async (id) => {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return { data };
  },
  create: async (projectData) => {
    const { data, error } = await supabase.from('projects').insert(projectData).select().single();
    if (error) throw new Error(error.message);
    return { data };
  },
  update: async (id, updateData) => {
    const { data, error } = await supabase.from('projects').update(updateData).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { data: { message: 'Project deleted' } };
  },
  getStats: (id) => fetchApi(`/projects/${id}/stats`),
};


// --- Translations ---
export const translationAPI = {
  getByProject: async (projectId, params) => {
    let query = supabase.from('translations').select('*').eq('project_id', projectId);
    if (params?.status) query = query.eq('status', params.status);
    if (params?.page) query = query.eq('page', params.page);
    const { data, error } = await query.order('created_at');
    if (error) throw new Error(error.message);
    return { data };
  },
  update: async (id, updateData) => {
    // This is a manual content update, so we use the dedicated backend route
    return fetchApi(`/translations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
    });
  },
  generate: (id, { targetLang, glossaryVersion }) => fetchApi(`/translations/${id}/generate`, {
    method: 'POST',
    body: JSON.stringify({ targetLang, glossaryVersion }),
  }),
  approve: (id, reviewer) => fetchApi(`/translations/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reviewer }),
  }),
  reject: (id, notes) => fetchApi(`/translations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  }),
  bulkApprove: (translationIds, reviewer) => fetchApi('/translations/bulk/approve', {
    method: 'POST',
    body: JSON.stringify({ translationIds, reviewer }),
  }),
  bulkReject: (translationIds, notes) => fetchApi('/translations/bulk/reject', {
    method: 'POST',
    body: JSON.stringify({ translationIds, notes }),
  }),
};


// --- Upload ---
export const uploadAPI = {
  // Step 1: Upload the file to Supabase Storage
  uploadFile: async (file, projectId) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${projectId}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('project_images')
      .upload(filePath, file);

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
    return { storagePath: filePath };
  },
  // Step 2: Tell our backend to process the file from storage
  processStorageImage: (payload) => fetchApi('/upload/process-storage-image', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};


// --- Glossary ---
export const glossaryAPI = {
  getAll: async (params) => {
    let query = supabase.from('glossary').select('*');
    if (params?.version) query = query.eq('version', params.version);
    if (params?.category) query = query.eq('category', params.category);
    if (params?.active !== undefined) query = query.eq('is_active', params.active);
    const { data, error } = await query.order('en');
    if (error) throw new Error(error.message);
    return { data };
  },
  create: async (termData) => {
    const { data, error } = await supabase.from('glossary').insert(termData).select().single();
    if (error) throw new Error(error.message);
    return { data };
  },
  update: async (id, updateData) => {
    const { data, error } = await supabase.from('glossary').update(updateData).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase.from('glossary').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { data: { message: 'Glossary term deleted' } };
  },
  bulkImport: (data) => fetchApi('/glossary/bulk-import', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getVersions: () => fetchApi('/glossary/versions'),
  getCategories: () => fetchApi('/glossary/categories'),
};


// --- Export ---
export const exportAPI = {
  exportExcel: (projectId) => fetchApi(`/export/project/${projectId}/excel`, { method: 'POST' }),
  exportJSON: (projectId) => fetchApi(`/export/project/${projectId}/json`, { method: 'POST' }),
  exportPackage: (projectId, options) => fetchApi(`/export/project/${projectId}/package`, {
    method: 'POST',
    body: JSON.stringify(options),
  }),
  getDownloadUrl: (filename) => `${API_URL}/export/download/${filename}`,
};
