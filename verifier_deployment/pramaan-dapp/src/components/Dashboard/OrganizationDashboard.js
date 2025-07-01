// src/components/Dashboard/OrganizationDashboard.js
import React, { useState, useEffect } from 'react';
import UpgradePlan from './UpgradePlan';
import '../../styles/Dashboard.css';

const OrganizationDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [organization, setOrganization] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('saasToken');
      const response = await fetch('http://localhost:5000/dashboard/organization', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data);
        setApiKeys(data.apiKeys || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      const token = localStorage.getItem('saasToken');
      const response = await fetch('http://localhost:5000/dashboard/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `API Key ${new Date().toLocaleDateString()}`,
          testMode: false
        })
      });

      const data = await response.json();
      if (data.success) {
        setShowApiKey(data.apiKey);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    }
  };

  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const revokeApiKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this API key?')) return;

    try {
      const token = localStorage.getItem('saasToken');
      await fetch(`http://localhost:5000/dashboard/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const token = localStorage.getItem('saasToken');
      const webhookUrl = document.getElementById('webhook-url').value;
      const allowedOrigins = document.getElementById('allowed-origins').value.split('\n').filter(o => o.trim());
      const ipWhitelist = document.getElementById('ip-whitelist').value.split('\n').filter(ip => ip.trim());

      const response = await fetch('http://localhost:5000/dashboard/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl,
          allowedOrigins,
          ipWhitelist
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="modal-overlay" onClick={() => setShowUpgrade(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowUpgrade(false)}>×</button>
            <UpgradePlan currentPlan={organization?.plan || 'trial'} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🚀 Pramaan SAAS Dashboard</h1>
          <p className="org-name">{organization?.name}</p>
        </div>
        <div className="header-actions">
          <div className="plan-info">
            <span className="plan-label">Current Plan</span>
            <span className="plan-name">{organization?.plan}</span>
          </div>
          <button 
            className="upgrade-btn" 
            onClick={() => setShowUpgrade(true)}
          >
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        {['overview', 'api-keys', 'usage', 'billing', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.replace('-', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="stat-card">
              <h3>Total API Calls</h3>
              <p className="stat-value">{organization?.usage?.currentMonthProofs || 0}</p>
              <span className="stat-icon">📊</span>
            </div>
            
            <div className="stat-card">
              <h3>Active Users</h3>
              <p className="stat-value">{organization?.usage?.currentMonthUsers || 0}</p>
              <span className="stat-icon">👥</span>
            </div>
            
            <div className="stat-card">
              <h3>Success Rate</h3>
              <p className="stat-value">99.9%</p>
              <span className="stat-icon">✅</span>
            </div>
            
            <div className="stat-card">
              <h3>API Keys</h3>
              <p className="stat-value">{apiKeys.filter(k => k.isActive).length}</p>
              <span className="stat-icon">🔑</span>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <div className="api-keys-section">
            <div className="section-header">
              <h2>API Keys</h2>
              <button onClick={createApiKey} className="create-key-btn">
                🔑 Generate New Key
              </button>
            </div>

            {showApiKey && (
              <div className="new-key-alert">
                <div className="alert-content">
                  <h4>✅ New API Key Created!</h4>
                  <p>Save this key securely. It won't be shown again.</p>
                  <div className="key-display">
                    <code>{showApiKey}</code>
                    <button
                      onClick={() => {
                        copyToClipboard(showApiKey, 'new');
                        setShowApiKey(null);
                      }}
                      className="copy-btn"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="api-keys-list">
              {apiKeys.map((key) => (
                <div key={key.id} className="api-key-card">
                  <div className="key-info">
                    <h3>{key.name}</h3>
                    <p>Created: {new Date(key.createdAt).toLocaleDateString()}</p>
                    <p>Last used: {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</p>
                    <div className="key-tags">
                      <span className={`status-tag ${key.isActive ? 'active' : 'revoked'}`}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </span>
                      <span className="limit-tag">
                        {key.permissions.maxProofsPerMonth} proofs/month
                      </span>
                    </div>
                  </div>
                  <div className="key-actions">
                    {copiedKey === key.id && (
                      <span className="copied-msg">✅ Copied!</span>
                    )}
                    <button
                      onClick={() => revokeApiKey(key.id)}
                      className="revoke-btn"
                      disabled={!key.isActive}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="usage-section">
            <h2>Usage Analytics</h2>
            
            <div className="usage-grid">
              <div className="usage-card">
                <h3>Monthly Usage</h3>
                <div className="usage-stats">
                  <div className="usage-item">
                    <span>Proofs Generated</span>
                    <span>{organization?.usage?.currentMonthProofs || 0} / {apiKeys[0]?.permissions?.maxProofsPerMonth || 1000}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${((organization?.usage?.currentMonthProofs || 0) / (apiKeys[0]?.permissions?.maxProofsPerMonth || 1000)) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="usage-stats">
                  <div className="usage-item">
                    <span>Active Users</span>
                    <span>{organization?.usage?.currentMonthUsers || 0} / {apiKeys[0]?.permissions?.maxUsers || 100}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill blue"
                      style={{ width: `${((organization?.usage?.currentMonthUsers || 0) / (apiKeys[0]?.permissions?.maxUsers || 100)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="usage-card">
                <h3>Quick Integration</h3>
                <div className="code-snippets">
                  <div className="code-block">
                    <span className="code-label">JavaScript</span>
                    <code>npm install @pramaan/sdk</code>
                  </div>
                  <div className="code-block">
                    <span className="code-label">Python</span>
                    <code>pip install pramaan-sdk</code>
                  </div>
                  <a href="/docs" className="docs-link">
                    📚 View API Documentation
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <UpgradePlan currentPlan={organization?.plan || 'trial'} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <h2>Organization Settings</h2>
            
            <div className="settings-form">
              <div className="form-group">
                <label>Webhook URL</label>
                <input
                  id="webhook-url"
                  type="url"
                  placeholder="https://your-app.com/webhook"
                  defaultValue={organization?.settings?.webhookUrl}
                />
              </div>

              <div className="form-group">
                <label>Allowed Origins (CORS)</label>
                <textarea
                  id="allowed-origins"
                  rows="3"
                  placeholder="https://app.example.com"
                  defaultValue={organization?.settings?.allowedOrigins?.join('\n')}
                />
                <small>One origin per line</small>
              </div>

              <div className="form-group">
                <label>IP Whitelist</label>
                <textarea
                  id="ip-whitelist"
                  rows="3"
                  placeholder="192.168.1.1"
                  defaultValue={organization?.settings?.ipWhitelist?.join('\n')}
                />
                <small>One IP address per line (leave empty to allow all)</small>
              </div>

              <button className="save-btn" onClick={saveSettings}>Save Settings</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationDashboard;