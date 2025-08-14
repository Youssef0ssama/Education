import { useState, useEffect } from 'react';
import { 
  File, 
  Folder, 
  Download, 
  Eye, 
  Play, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter,
  BookOpen,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

const StudentContentViewer = ({ courseId, user }) => {
  const [materials, setMaterials] = useState([]);
  const [folders, setFolders] = useState([]);
  const [modules, setModules] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentModule, setCurrentModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('materials'); // 'materials' or 'modules'
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    fileType: ''
  });

  useEffect(() => {
    if (viewMode === 'materials') {
      fetchMaterials();
      fetchFolders();
    } else {
      fetchModules();
    }
  }, [courseId, currentFolder, currentModule, viewMode, filters]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      if (currentFolder) {
        queryParams.append('folderId', currentFolder.id);
      } else {
        queryParams.append('folderId', 'root');
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/content/courses/${courseId}/materials?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/content/courses/${courseId}/folders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  };

  const fetchModules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/content/courses/${courseId}/modules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setModules(data.modules);
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModuleDetails = async (moduleId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/content/courses/${courseId}/modules/${moduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentModule(data.module);
      }
    } catch (error) {
      console.error('Failed to fetch module details:', error);
    }
  };

  const handleDownload = async (materialId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/content/courses/${courseId}/materials/${materialId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await response.json();
        alert(error.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    }
  };

  const handlePreview = async (material) => {
    try {
      // Log the view
      const token = localStorage.getItem('token');
      await fetch(`/api/content/courses/${courseId}/materials/${material.id}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: Date.now().toString()
        })
      });

      setPreviewMaterial(material);
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  const handleMarkComplete = async (materialId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/content/courses/${courseId}/materials/${materialId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeSpentSeconds: 60 // Placeholder
        })
      });

      if (response.ok) {
        // Refresh data to show completion status
        if (viewMode === 'materials') {
          fetchMaterials();
        } else {
          fetchModules();
          if (currentModule) {
            fetchModuleDetails(currentModule.id);
          }
        }
      }
    } catch (error) {
      console.error('Mark complete error:', error);
    }
  };

  const getFileIcon = (fileType) => {
    const iconMap = {
      pdf: '📄',
      document: '📝',
      presentation: '📊',
      spreadsheet: '📈',
      image: '🖼️',
      video: '🎥',
      audio: '🎵',
      archive: '📦',
      other: '📎'
    };
    return iconMap[fileType] || iconMap.other;
  };

  const renderBreadcrumb = () => {
    if (viewMode === 'modules') {
      return (
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <button
            onClick={() => setCurrentModule(null)}
            className="hover:text-gray-900"
          >
            Learning Modules
          </button>
          {currentModule && (
            <>
              <span>/</span>
              <span className="text-gray-900">{currentModule.title}</span>
            </>
          )}
        </nav>
      );
    }

    const breadcrumbs = [];
    let current = currentFolder;
    
    while (current) {
      breadcrumbs.unshift(current);
      current = folders.find(f => f.id === current.parent_folder_id);
    }

    return (
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
        <button
          onClick={() => setCurrentFolder(null)}
          className="hover:text-gray-900"
        >
          Course Materials
        </button>
        {breadcrumbs.map((folder, index) => (
          <span key={folder.id} className="flex items-center space-x-2">
            <span>/</span>
            <button
              onClick={() => setCurrentFolder(folder)}
              className="hover:text-gray-900"
            >
              {folder.name}
            </button>
          </span>
        ))}
      </nav>
    );
  };

  const renderFolders = () => {
    if (viewMode !== 'materials') return null;

    const currentFolders = folders.filter(f => 
      f.parent_folder_id === (currentFolder?.id || null)
    );

    if (currentFolders.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Folders</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {currentFolders.map(folder => (
            <div
              key={folder.id}
              className="p-4 bg-white border rounded-lg hover:shadow-md cursor-pointer transition-shadow text-center"
              onClick={() => setCurrentFolder(folder)}
            >
              <Folder className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="font-medium text-gray-900 truncate">{folder.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {folder.material_count} items
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMaterials = () => {
    if (viewMode !== 'materials') return null;

    if (materials.length === 0) {
      return (
        <div className="text-center py-12">
          <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No materials available</p>
          <p className="text-sm text-gray-500">Check back later for new content</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map(material => (
          <MaterialCard
            key={material.id}
            material={material}
            onDownload={handleDownload}
            onPreview={handlePreview}
            onMarkComplete={handleMarkComplete}
            getFileIcon={getFileIcon}
          />
        ))}
      </div>
    );
  };

  const renderModules = () => {
    if (viewMode !== 'modules') return null;

    if (currentModule) {
      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentModule(null)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Modules</span>
              </button>
              {currentModule.progress && (
                <div className="text-sm text-gray-600">
                  Progress: {currentModule.progress.progress_percentage}%
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentModule.title}</h2>
            {currentModule.description && (
              <p className="text-gray-600 mb-4">{currentModule.description}</p>
            )}

            {currentModule.progress && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{currentModule.progress.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${currentModule.progress.progress_percentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {!currentModule.can_access && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <p className="text-yellow-800">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Complete the prerequisite module to access this content.
                </p>
              </div>
            )}
          </div>

          {currentModule.can_access && currentModule.materials && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Module Materials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentModule.materials.map(material => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    completion={material.completion}
                    onDownload={handleDownload}
                    onPreview={handlePreview}
                    onMarkComplete={handleMarkComplete}
                    getFileIcon={getFileIcon}
                    showCompletion={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (modules.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No learning modules available</p>
          <p className="text-sm text-gray-500">Modules will appear here when created by your instructor</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {modules.map(module => (
          <ModuleCard
            key={module.id}
            module={module}
            onClick={() => fetchModuleDetails(module.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Materials</h2>
          <p className="text-gray-600">Access your learning resources and track progress</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('materials')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'materials' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Browse Materials
          </button>
          <button
            onClick={() => setViewMode('modules')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'modules' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Learning Modules
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {renderBreadcrumb()}

      {/* Filters */}
      {viewMode === 'materials' && (
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.fileType}
            onChange={(e) => setFilters({ ...filters, fileType: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="pdf">PDF</option>
            <option value="document">Documents</option>
            <option value="presentation">Presentations</option>
            <option value="video">Videos</option>
            <option value="image">Images</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div>
          {renderFolders()}
          {renderMaterials()}
          {renderModules()}
        </div>
      )}

      {/* Preview Modal */}
      {previewMaterial && (
        <PreviewModal
          material={previewMaterial}
          courseId={courseId}
          onClose={() => setPreviewMaterial(null)}
        />
      )}
    </div>
  );
};

// Material Card Component
const MaterialCard = ({ 
  material, 
  completion, 
  onDownload, 
  onPreview, 
  onMarkComplete, 
  getFileIcon, 
  showCompletion = false 
}) => {
  const isCompleted = completion?.completed_date;

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="text-2xl">{getFileIcon(material.file_type)}</div>
        {showCompletion && (
          <div className="flex items-center">
            {isCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <button
                onClick={() => onMarkComplete(material.id)}
                className="text-gray-400 hover:text-green-600"
                title="Mark as completed"
              >
                <CheckCircle className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>

      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{material.title}</h3>
      
      {material.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Size:</span>
          <span className="text-gray-900">{material.formatted_size}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Type:</span>
          <span className="text-gray-900 capitalize">{material.file_type}</span>
        </div>

        {showCompletion && completion && (
          <div className="text-xs text-green-600">
            Completed {format(new Date(completion.completed_date), 'MMM dd, yyyy')}
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onPreview(material)}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          <Eye className="h-4 w-4" />
          <span>Preview</span>
        </button>
        <button
          onClick={() => onDownload(material.id, material.file_name)}
          className="flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {material.tags && material.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {material.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              {tag}
            </span>
          ))}
          {material.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              +{material.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Module Card Component
const ModuleCard = ({ module, onClick }) => {
  const progress = module.progress?.progress_percentage || 0;
  const isCompleted = progress === 100;

  return (
    <div 
      className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
          {module.description && (
            <p className="text-gray-600 mb-3">{module.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
          <span className="text-sm text-gray-500">{module.material_count} materials</span>
        </div>
      </div>

      {module.progress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${isCompleted ? 'bg-green-600' : 'bg-blue-600'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {module.prerequisite_title && (
        <div className="text-sm text-gray-500">
          <Clock className="h-4 w-4 inline mr-1" />
          Prerequisite: {module.prerequisite_title}
        </div>
      )}
    </div>
  );
};

// Preview Modal Component
const PreviewModal = ({ material, courseId, onClose }) => {
  const previewUrl = `/api/content/courses/${courseId}/materials/${material.id}/preview`;
  const token = localStorage.getItem('token');

  const renderPreview = () => {
    if (material.file_type === 'pdf') {
      return (
        <iframe
          src={`${previewUrl}?token=${token}`}
          className="w-full h-full"
          title={material.title}
        />
      );
    } else if (material.file_type === 'video') {
      return (
        <video
          controls
          className="w-full h-full"
          src={`${previewUrl}?token=${token}`}
        >
          Your browser does not support the video tag.
        </video>
      );
    } else if (material.file_type === 'audio') {
      return (
        <div className="flex items-center justify-center h-full">
          <audio
            controls
            className="w-full max-w-md"
            src={`${previewUrl}?token=${token}`}
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    } else if (material.file_type === 'image') {
      return (
        <img
          src={`${previewUrl}?token=${token}`}
          alt={material.title}
          className="max-w-full max-h-full object-contain mx-auto"
        />
      );
    } else {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Preview not available for this file type</p>
            <a
              href={`/api/content/courses/${courseId}/materials/${material.id}/download`}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>Download to view</span>
            </a>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-full max-w-6xl h-5/6 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{material.title}</h3>
            <p className="text-sm text-gray-600">{material.file_type.toUpperCase()} • {material.formatted_size}</p>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={`/api/content/courses/${courseId}/materials/${material.id}/download`}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="h-full bg-gray-100 rounded-lg overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default StudentContentViewer;