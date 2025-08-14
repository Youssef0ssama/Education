import { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FolderPlus, 
  File, 
  Folder, 
  MoreVertical, 
  Eye, 
  Download, 
  Edit, 
  Trash2, 
  Move, 
  Calendar,
  Tag,
  BarChart3,
  Search,
  Filter,
  Grid,
  List,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

const CourseContentManager = ({ courseId, user }) => {
  const [materials, setMaterials] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    fileType: '',
    visibility: ''
  });

  useEffect(() => {
    fetchMaterials();
    fetchFolders();
  }, [courseId, currentFolder, filters]);

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

  const handleUpload = async (files, metadata) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      files.forEach(file => {
        formData.append('files', file);
      });

      // Add metadata
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      });

      if (currentFolder) {
        formData.append('folderId', currentFolder.id);
      }

      const response = await fetch(`/api/content/courses/${courseId}/materials/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setShowUploadModal(false);
        fetchMaterials();
        return result;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleCreateFolder = async (folderData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/content/courses/${courseId}/folders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...folderData,
          parentFolderId: currentFolder?.id || null
        })
      });

      if (response.ok) {
        setShowFolderModal(false);
        fetchFolders();
        fetchMaterials();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Create folder error:', error);
      throw error;
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/content/courses/${courseId}/materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchMaterials();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete material');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete material');
    }
  };

  const handleMoveMaterial = async (materialId, targetFolderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/content/courses/${courseId}/materials/${materialId}/move`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folderId: targetFolderId })
      });

      if (response.ok) {
        fetchMaterials();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to move material');
      }
    } catch (error) {
      console.error('Move error:', error);
      alert('Failed to move material');
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

  const getVisibilityBadge = (visibility, scheduledDate) => {
    if (visibility === 'private') {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Private</span>;
    } else if (visibility === 'scheduled') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
        Scheduled {scheduledDate && format(new Date(scheduledDate), 'MMM dd')}
      </span>;
    } else {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Public</span>;
    }
  };

  const renderBreadcrumb = () => {
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
    const currentFolders = folders.filter(f => 
      f.parent_folder_id === (currentFolder?.id || null)
    );

    if (currentFolders.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Folders</h3>
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4' : 'space-y-2'}>
          {currentFolders.map(folder => (
            <div
              key={folder.id}
              className={`${viewMode === 'grid' ? 'p-4 text-center' : 'flex items-center p-3'} bg-white border rounded-lg hover:shadow-md cursor-pointer transition-shadow`}
              onClick={() => setCurrentFolder(folder)}
            >
              <Folder className={`${viewMode === 'grid' ? 'h-8 w-8 mx-auto mb-2' : 'h-5 w-5 mr-3'} text-blue-600`} />
              <div className={viewMode === 'grid' ? '' : 'flex-1'}>
                <p className="font-medium text-gray-900 truncate">{folder.name}</p>
                {viewMode === 'list' && folder.description && (
                  <p className="text-sm text-gray-500 truncate">{folder.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {folder.material_count} items
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMaterials = () => {
    if (materials.length === 0) {
      return (
        <div className="text-center py-12">
          <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No materials in this folder</p>
          <p className="text-sm text-gray-500">Upload files to get started</p>
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {materials.map(material => (
            <MaterialCard
              key={material.id}
              material={material}
              onDelete={handleDeleteMaterial}
              onMove={handleMoveMaterial}
              folders={folders}
              getFileIcon={getFileIcon}
              getVisibilityBadge={getVisibilityBadge}
            />
          ))}
        </div>
      );
    } else {
      return (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMaterials(materials.map(m => m.id));
                      } else {
                        setSelectedMaterials([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materials.map(material => (
                <MaterialRow
                  key={material.id}
                  material={material}
                  selected={selectedMaterials.includes(material.id)}
                  onSelect={(selected) => {
                    if (selected) {
                      setSelectedMaterials([...selectedMaterials, material.id]);
                    } else {
                      setSelectedMaterials(selectedMaterials.filter(id => id !== material.id));
                    }
                  }}
                  onDelete={handleDeleteMaterial}
                  onMove={handleMoveMaterial}
                  folders={folders}
                  getFileIcon={getFileIcon}
                  getVisibilityBadge={getVisibilityBadge}
                />
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Materials</h2>
          <p className="text-gray-600">Manage and organize your course content</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAnalytics(true)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <FolderPlus className="h-4 w-4" />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Files</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {renderBreadcrumb()}

      {/* Filters and View Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={filters.visibility}
            onChange={(e) => setFilters({ ...filters, visibility: e.target.value })}
          >
            <option value="">All Visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div>
          {renderFolders()}
          {renderMaterials()}
        </div>
      )}

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}

      {showFolderModal && (
        <FolderModal
          onClose={() => setShowFolderModal(false)}
          onCreate={handleCreateFolder}
        />
      )}

      {showAnalytics && (
        <AnalyticsModal
          courseId={courseId}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
};

// Material Card Component (Grid View)
const MaterialCard = ({ material, onDelete, onMove, folders, getFileIcon, getVisibilityBadge }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow relative">
      <div className="flex justify-between items-start mb-3">
        <div className="text-2xl">{getFileIcon(material.file_type)}</div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-10">
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2">
                <Move className="h-4 w-4" />
                <span>Move</span>
              </button>
              <button
                onClick={() => onDelete(material.id)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{material.title}</h3>
      
      {material.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Size:</span>
          <span className="text-gray-900">{material.formatted_size}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Visibility:</span>
          {getVisibilityBadge(material.visibility, material.scheduled_date)}
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Views:</span>
          <span className="text-gray-900">{material.view_count}</span>
        </div>

        <div className="text-xs text-gray-500">
          Uploaded {format(new Date(material.upload_date), 'MMM dd, yyyy')}
        </div>
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

// Material Row Component (List View)
const MaterialRow = ({ material, selected, onSelect, onDelete, onMove, folders, getFileIcon, getVisibilityBadge }) => {
  return (
    <tr className={selected ? 'bg-purple-50' : 'hover:bg-gray-50'}>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="text-lg mr-3">{getFileIcon(material.file_type)}</span>
          <div>
            <div className="text-sm font-medium text-gray-900">{material.title}</div>
            {material.description && (
              <div className="text-sm text-gray-500 truncate max-w-xs">{material.description}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
        {material.file_type}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {material.formatted_size}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getVisibilityBadge(material.visibility, material.scheduled_date)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {format(new Date(material.upload_date), 'MMM dd, yyyy')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button className="text-purple-600 hover:text-purple-900">
            <Eye className="h-4 w-4" />
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            <Download className="h-4 w-4" />
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(material.id)}
            className="text-red-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Upload Modal Component
const UploadModal = ({ onClose, onUpload }) => {
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    visibility: 'public',
    scheduledDate: '',
    tags: []
  });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles([...files, ...droppedFiles]);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles([...files, ...selectedFiles]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      setUploading(true);
      await onUpload(files, metadata);
      onClose();
    } catch (error) {
      alert(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Upload Materials</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Drag and drop files here, or</p>
          <label className="cursor-pointer">
            <span className="text-purple-600 hover:text-purple-700 font-medium">browse files</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: PDF, DOC, PPT, MP4, MP3, Images, Archives (Max 100MB each)
          </p>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Selected Files ({files.length})</h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  <button
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Form */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              placeholder="Leave empty to use filename"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              placeholder="Optional description for the materials"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibility
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={metadata.visibility}
                onChange={(e) => setMetadata({ ...metadata, visibility: e.target.value })}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {metadata.visibility === 'scheduled' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Release Date
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={metadata.scheduledDate}
                  onChange={(e) => setMetadata({ ...metadata, scheduledDate: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., lecture, homework, reference"
              onChange={(e) => {
                const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                setMetadata({ ...metadata, tags });
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {uploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Folder Modal Component
const FolderModal = ({ onClose, onCreate }) => {
  const [folderData, setFolderData] = useState({
    name: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!folderData.name.trim()) return;

    try {
      setCreating(true);
      await onCreate(folderData);
      onClose();
    } catch (error) {
      alert(error.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Folder</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Folder Name *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={folderData.name}
              onChange={(e) => setFolderData({ ...folderData, name: e.target.value })}
              placeholder="Enter folder name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={folderData.description}
              onChange={(e) => setFolderData({ ...folderData, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!folderData.name.trim() || creating}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {creating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{creating ? 'Creating...' : 'Create Folder'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Analytics Modal Component (placeholder)
const AnalyticsModal = ({ courseId, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Material Analytics</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Analytics dashboard coming soon!</p>
          <p className="text-sm text-gray-500">Track material usage, student engagement, and more.</p>
        </div>
      </div>
    </div>
  );
};

export default CourseContentManager;