/**
 * Audio Export Controls Component
 * Provides UI for exporting audio projects and files
 */

import React, { useState, useEffect } from 'react';
import { useAudioStore } from '@/stores/audioStore';

interface ExportControlsProps {
  projectId?: string;
  fileId?: string;
}

interface ExportFormat {
  format: string;
  name: string;
  description: string;
  extension: string;
  mime_type: string;
  supported_qualities: string[];
}

export const AudioExportControls: React.FC<ExportControlsProps> = ({ projectId, fileId }) => {
  const { exportProject, exportFile, getExportProgress, cancelExport, getSupportedFormats } = useAudioStore();

  const [formats, setFormats] = useState<ExportFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState('wav');
  const [selectedQuality, setSelectedQuality] = useState('high');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportError, setExportError] = useState('');
  const [exportResult, setExportResult] = useState<{export_path?: string} | null>(null);
  const [currentExportId, setCurrentExportId] = useState<string | null>(null);

  useEffect(() => {
    loadSupportedFormats();
  }, []);

  useEffect(() => {
    if (currentExportId && isExporting) {
      const interval = setInterval(async () => {
        const progress = await getExportProgress(currentExportId);
        setExportProgress(progress.progress * 100);
        setExportStatus(progress.current_step);

        if (progress.status === 'completed') {
          setIsExporting(false);
          setExportResult({ export_path: progress.output_path });
          clearInterval(interval);
        } else if (progress.status === 'failed') {
          setIsExporting(false);
          setExportError(progress.error_message || 'Export failed');
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentExportId, isExporting, getExportProgress]);

  const loadSupportedFormats = async () => {
    const result = await getSupportedFormats();
    // Transform the result to match ExportFormat interface
    const transformedFormats = result.formats.map((format: any) => ({
      format: format.format,
      name: format.name,
      description: format.description,
      extension: format.extension,
      mime_type: format.mime_type || 'audio/' + format.format,
      supported_qualities: format.supported_qualities || ['high', 'medium', 'low']
    }));
    setFormats(transformedFormats);
  };

  const handleExport = async () => {
    if (!projectId && !fileId) {
      setExportError('No project or file specified for export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Starting export...');
    setExportError('');
    setExportResult(null);

    try {
      let result;
      if (projectId) {
        result = await exportProject(projectId, selectedFormat, selectedQuality);
      } else if (fileId) {
        result = await exportFile(fileId, selectedFormat);
      }

      if (result.success) {
        // Generate a mock export ID for progress tracking
        const exportId = `export_${Date.now()}`;
        setCurrentExportId(exportId);
        setExportStatus('Processing export...');
      } else {
        setIsExporting(false);
        setExportError(result.error || 'Export failed');
      }
    } catch (error) {
      setIsExporting(false);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    }
  };

  const handleCancel = async () => {
    if (currentExportId) {
      await cancelExport(currentExportId);
      setIsExporting(false);
      setExportStatus('Export cancelled');
    }
  };

  const handleDownload = () => {
    if (exportResult?.export_path) {
      // In a real implementation, this would download the file
      // For now, just show the path
      alert(`File exported to: ${exportResult.export_path}`);
    }
  };

  const currentFormat = formats.find(f => f.format === selectedFormat);
  const availableQualities = currentFormat?.supported_qualities || [];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Audio Export</h3>

      {/* Format Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Export Format
        </label>
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          disabled={isExporting}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {formats.map((format) => (
            <option key={format.format} value={format.format}>
              {format.name} ({format.extension}) - {format.description}
            </option>
          ))}
        </select>
      </div>

      {/* Quality Selection */}
      {availableQualities.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Quality
          </label>
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
            disabled={isExporting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableQualities.map((quality) => (
              <option key={quality} value={quality}>
                {quality.charAt(0).toUpperCase() + quality.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Export Progress */}
      {isExporting && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">{exportStatus}</span>
            <span className="text-sm text-gray-600">{exportProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <button
            onClick={handleCancel}
            className="mt-2 px-4 py-2 text-sm text-red-600 hover:text-red-700"
          >
            Cancel Export
          </button>
        </div>
      )}

      {/* Error Display */}
      {exportError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{exportError}</p>
        </div>
      )}

      {/* Success Display */}
      {exportResult && !isExporting && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600 mb-2">Export completed successfully!</p>
          <p className="text-xs text-gray-600 mb-2">
            File: {exportResult.export_path}
          </p>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Download File
          </button>
        </div>
      )}

      {/* Export Button */}
      {!isExporting && !exportResult && (
        <button
          onClick={handleExport}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Export {projectId ? 'Project' : 'File'}
        </button>
      )}

      {/* Format Information */}
      {currentFormat && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Format Details</h4>
          <p className="text-xs text-gray-600">{currentFormat.description}</p>
          <p className="text-xs text-gray-600">
            MIME Type: {currentFormat.mime_type}
          </p>
        </div>
      )}
    </div>
  );
};

export default AudioExportControls;