/**
 * Provenance Privacy Controls Component
 * 
 * Provides user interface for managing provenance tracking preferences,
 * privacy settings, and compliance controls.
 */

import React, { useState, useEffect } from 'react';
import { useDAIDStore } from '../../stores/daidStore';
import {
  ProvenancePrivacySettings,
  ProvenancePrivacyControlsProps
} from '../../types/daid';

export const ProvenancePrivacyControls: React.FC<ProvenancePrivacyControlsProps> = ({
  settings,
  editable = true,
  show_compliance_info = true,
  onSettingsChange
}) => {
  const {
    privacy_settings,
    updatePrivacySettings,
    config,
    updateConfig
  } = useDAIDStore();

  const [localSettings, setLocalSettings] = useState<ProvenancePrivacySettings>(
    settings || privacy_settings
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: () => void;
  } | null>(null);

  // Update local settings when props change
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [settings]);

  const handleSettingChange = (key: keyof ProvenancePrivacySettings, value: any) => {
    if (!editable) return;

    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(true);
    
    // Immediate callback for external handling
    onSettingsChange?.(newSettings);
  };

  const handleSave = () => {
    updatePrivacySettings(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings || privacy_settings);
    setHasChanges(false);
  };

  const handleDeleteAllData = () => {
    setConfirmDialog({
      show: true,
      title: 'Delete All Provenance Data',
      message: 'This will permanently delete all your provenance records. This action cannot be undone. Are you sure?',
      action: () => {
        // In a real implementation, this would call the deletion API
        console.log('Deleting all provenance data...');
        setConfirmDialog(null);
      }
    });
  };

  const handleExportData = async () => {
    try {
      // Export all user's provenance data
      const blob = await fetch('/api/v1/daid/export/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'json',
          include_metadata: true,
          anonymize: false
        })
      }).then(res => res.blob());

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `provenance-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  return (
    <div className="provenance-privacy-controls space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Provenance Privacy Settings</h3>
          <p className="text-sm text-gray-600">
            Control how your creative process is tracked and shared
          </p>
        </div>
        
        {editable && hasChanges && (
          <div className="flex space-x-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Basic Privacy Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Basic Settings</h4>
        
        <div className="space-y-4">
          {/* Default Privacy Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Privacy Level
            </label>
            <select
              value={localSettings.default_privacy_level}
              onChange={(e) => handleSettingChange('default_privacy_level', e.target.value)}
              disabled={!editable}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="private">Private - Only visible to you</option>
              <option value="shared">Shared - Visible to collaborators</option>
              <option value="public">Public - Visible to everyone</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This sets the default privacy level for new provenance records
            </p>
          </div>

          {/* Data Retention */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Retention Period
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="3650"
                value={localSettings.retention_days}
                onChange={(e) => handleSettingChange('retention_days', parseInt(e.target.value))}
                disabled={!editable}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <span className="text-sm text-gray-600">days</span>
              <label className="flex items-center ml-4">
                <input
                  type="checkbox"
                  checked={localSettings.auto_delete_enabled}
                  onChange={(e) => handleSettingChange('auto_delete_enabled', e.target.checked)}
                  disabled={!editable}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Auto-delete old records</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Records older than this will be automatically deleted if auto-delete is enabled
            </p>
          </div>

          {/* Anonymization */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localSettings.allow_anonymization}
                onChange={(e) => handleSettingChange('allow_anonymization', e.target.checked)}
                disabled={!editable}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Allow data anonymization</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              When enabled, personal identifiers can be removed from shared data
            </p>
          </div>
        </div>
      </div>

      {/* Tracking Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">What to Track</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.track_user_actions}
              onChange={(e) => handleSettingChange('track_user_actions', e.target.checked)}
              disabled={!editable}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">User Actions</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.track_ai_decisions}
              onChange={(e) => handleSettingChange('track_ai_decisions', e.target.checked)}
              disabled={!editable}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">AI Decisions</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.track_parameter_changes}
              onChange={(e) => handleSettingChange('track_parameter_changes', e.target.checked)}
              disabled={!editable}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Parameter Changes</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.track_project_operations}
              onChange={(e) => handleSettingChange('track_project_operations', e.target.checked)}
              disabled={!editable}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Project Operations</span>
          </label>
        </div>
      </div>

      {/* Sharing Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Sharing & Collaboration</h4>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.allow_provenance_sharing}
              onChange={(e) => handleSettingChange('allow_provenance_sharing', e.target.checked)}
              disabled={!editable}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Allow provenance sharing</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.require_explicit_consent}
              onChange={(e) => handleSettingChange('require_explicit_consent', e.target.checked)}
              disabled={!editable}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Require explicit consent for sharing</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.anonymize_shared_data}
              onChange={(e) => handleSettingChange('anonymize_shared_data', e.target.checked)}
              disabled={!editable}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Anonymize shared data by default</span>
          </label>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-left"
        >
          <h4 className="text-md font-medium text-gray-900">Advanced Settings</h4>
          <svg
            className={`w-5 h-5 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* DAID Integration Toggle */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => updateConfig({ enabled: e.target.checked })}
                  disabled={!editable}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Enable DAID tracking</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Completely disable all provenance tracking
              </p>
            </div>

            {/* Batch Settings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={config.batch_size}
                onChange={(e) => updateConfig({ batch_size: parseInt(e.target.value) })}
                disabled={!editable}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of records to batch before sending to server
              </p>
            </div>

            {/* Validation Settings */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.validation_enabled}
                  onChange={(e) => updateConfig({ validation_enabled: e.target.checked })}
                  disabled={!editable}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Enable integrity validation</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Verify cryptographic integrity of provenance records
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Data Management</h4>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Export My Data
          </button>
          
          <button
            onClick={handleDeleteAllData}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            Delete All Data
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Export includes all your provenance records in JSON format. 
          Deletion is permanent and cannot be undone.
        </p>
      </div>

      {/* Compliance Information */}
      {show_compliance_info && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-blue-900 mb-2">Privacy & Compliance</h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>GDPR Compliance:</strong> You have the right to access, rectify, and delete your personal data.
              Use the export and delete functions above to exercise these rights.
            </p>
            <p>
              <strong>Data Processing:</strong> Provenance data is processed to improve your creative workflow
              and provide AI-powered suggestions. You can opt out of specific tracking categories above.
            </p>
            <p>
              <strong>Data Retention:</strong> Data is retained according to your settings above.
              We may retain some data longer for legal compliance purposes.
            </p>
            <p>
              <strong>Third Parties:</strong> Provenance data is not shared with third parties without your
              explicit consent, except as required by law.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {confirmDialog.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.action}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};