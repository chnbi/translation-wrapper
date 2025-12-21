import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Image, Play, Eye, FileDown, ArrowLeft } from 'lucide-react';
import { projectAPI, translationAPI, uploadAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddText, setShowAddText] = useState(false);
  const [newText, setNewText] = useState({
    page: '',
    section: '',
    elementType: 'heading',
    content: ''
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectAPI.getById(projectId).then(res => res.data),
  });

  const { data: translations } = useQuery({
    queryKey: ['translations', projectId],
    queryFn: () => translationAPI.getByProject(projectId).then(res => res.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['stats', projectId],
    queryFn: () => projectAPI.getStats(projectId).then(res => res.data.data),
  });

  const createTextMutation = useMutation({
    mutationFn: (data) => translationAPI.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['translations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['stats', projectId] });
      const message = response.data.message || 'Content added successfully';
      toast.success(message);
      setShowAddText(false);
      setNewText({ page: '', section: '', elementType: 'heading', content: '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add content');
    }
  });

  const processImageMutation = useMutation({
    mutationFn: async (file) => {
      // Step 1: Upload file to Supabase Storage
      toast.loading(`Uploading ${file.name}...`, { id: file.name });
      const { storagePath } = await uploadAPI.uploadFile(file, projectId);
      
      // Step 2: Call backend to process the image from storage
      toast.loading(`Processing ${file.name}...`, { id: file.name });
      const payload = {
        projectId,
        page: newText.page,
        section: newText.section,
        elementType: 'other',
        elementName: file.name,
        storagePath,
      };
      return uploadAPI.processStorageImage(payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['translations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['stats', projectId] });
      const fileName = response.data.translation.element_name;
      toast.success(`Processed ${fileName}! Extracted: "${response.data.ocr.text.substring(0, 50)}..."`, { id: fileName });
    },
    onError: (error, file) => {
      toast.error(error.message || `Failed to process ${file.name}`, { id: file.name });
    }
  });

  const batchTranslateMutation = useMutation({
    mutationFn: (data) => translationAPI.batchTranslate(projectId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['translations', projectId] });
      toast.success(`Generated ${response.data.data.success} translations!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Translation failed');
    }
  });

  const onDrop = (acceptedFiles) => {
    if (!newText.page || !newText.section) {
      toast.error('Please enter Page and Section first');
      return;
    }

    acceptedFiles.forEach(file => {
      processImageMutation.mutate(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'] },
    multiple: true
  });

  const handleAddText = (e) => {
    e.preventDefault();
    if (!newText.content.trim() || !newText.page || !newText.section) {
      toast.error('Please fill in all fields');
      return;
    }

    createTextMutation.mutate({
      projectId,
      page: newText.page,
      section: newText.section,
      elementType: newText.elementType,
      content: { en: newText.content }
    });
  };

  const handleGenerateTranslations = (targetLang) => {
    batchTranslateMutation.mutate({
      targetLang,
      glossaryVersion: project?.glossaryVersion || 'v1.0'
    });
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500">{project.description}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/review`)}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>Review</span>
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500">Total Items</div>
          <div className="text-3xl font-bold text-gray-900">{stats?.totalItems || 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Approved</div>
          <div className="text-3xl font-bold text-green-600">{stats?.approvedItems || 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-3xl font-bold text-yellow-600">{stats?.pendingItems || 0}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Progress</div>
          <div className="text-3xl font-bold text-primary-600">
            {stats?.totalItems > 0 ? Math.round((stats.approvedItems / stats.totalItems) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Add Content</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowAddText(true)}
            className="btn btn-secondary flex items-center justify-center space-x-2 py-4"
          >
            <FileText className="w-5 h-5" />
            <span>Add Text Manually</span>
          </button>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
          }`}>
            <input {...getInputProps()} />
            <Image className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {isDragActive ? 'Drop images here...' : 'Drag & drop images or click to upload'}
            </p>
            <p className="text-xs text-gray-500 mt-1">OCR will extract text automatically</p>
          </div>
        </div>

        {stats?.pendingItems > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Need to regenerate translations?</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.pendingItems} item(s) need translation
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleGenerateTranslations('bm')}
                  className="btn btn-secondary flex items-center space-x-2"
                  disabled={batchTranslateMutation.isPending}
                >
                  <Play className="w-4 h-4" />
                  <span>Regenerate BM</span>
                </button>
                <button
                  onClick={() => handleGenerateTranslations('zh')}
                  className="btn btn-secondary flex items-center space-x-2"
                  disabled={batchTranslateMutation.isPending}
                >
                  <Play className="w-4 h-4" />
                  <span>Regenerate ZH</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Text Modal */}
      {showAddText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Add Text Content</h2>
            <form onSubmit={handleAddText} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Page *</label>
                  <input
                    type="text"
                    className="input"
                    value={newText.page}
                    onChange={(e) => setNewText({ ...newText, page: e.target.value })}
                    placeholder="Homepage"
                  />
                </div>
                <div>
                  <label className="label">Section *</label>
                  <input
                    type="text"
                    className="input"
                    value={newText.section}
                    onChange={(e) => setNewText({ ...newText, section: e.target.value })}
                    placeholder="Hero"
                  />
                </div>
              </div>
              <div>
                <label className="label">Element Type</label>
                <select
                  className="input"
                  value={newText.elementType}
                  onChange={(e) => setNewText({ ...newText, elementType: e.target.value })}
                >
                  <option value="heading">Heading</option>
                  <option value="paragraph">Paragraph</option>
                  <option value="button">Button</option>
                  <option value="label">Label</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">English Content *</label>
                <textarea
                  className="input"
                  rows={3}
                  value={newText.content}
                  onChange={(e) => setNewText({ ...newText, content: e.target.value })}
                  placeholder="Enter English text..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddText(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createTextMutation.isPending}
                >
                  {createTextMutation.isPending ? 'Adding...' : 'Add Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content List */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Content Items ({translations?.length || 0})</h2>
        {translations && translations.length > 0 ? (
          <div className="space-y-2">
            {translations.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">{item.page}</span>
                    <span className="text-xs text-gray-500">{item.section}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.status === 'approved' ? 'bg-green-100 text-green-800' :
                      item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-900">{item.content_en}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No content added yet</p>
        )}
      </div>
    </div>
  );
}
