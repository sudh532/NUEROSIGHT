/**
 * Network Controller for Aegis-Eye Telemetry Platform
 */
export const Api = {
  // Default Basic Auth Credentials for Local Node
  credentials: {
    username: 'admin',
    password: 'password123'
  },

  setCredentials(username, password) {
    this.credentials.username = username;
    this.credentials.password = password;
  },

  async getHealth() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('System diagnostic reports offline.');
      return await response.json();
    } catch (error) {
      console.error('[Aegis API] Health check error:', error);
      throw error;
    }
  },

  async runScreening(formData) {
    try {
      const response = await fetch('/api/detect', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let details = 'Ingress screening failure.';
        try {
          const errPayload = await response.json();
          details = errPayload.detail || errPayload.error || details;
        } catch (_) {}
        throw new Error(details);
      }

      return await response.json();
    } catch (error) {
      console.error('[Aegis API] Detection screening error:', error);
      throw error;
    }
  },

  async getTrends() {
    const authHeader = 'Basic ' + btoa(`${this.credentials.username}:${this.credentials.password}`);
    
    // Support fallback checking on routes
    let response;
    try {
      response = await fetch('/api/trends', {
        headers: { 'Authorization': authHeader }
      });
      if (response.status === 404) {
        // Fallback to /api/endpoints/trends if /api/trends returns 404
        response = await fetch('/api/endpoints/trends', {
          headers: { 'Authorization': authHeader }
        });
      }
    } catch (error) {
      console.error('[Aegis API] Primary trends fetch failed, trying fallback...', error);
      response = await fetch('/api/endpoints/trends', {
        headers: { 'Authorization': authHeader }
      });
    }

    if (response.status === 401) {
      throw new Error('Access Denied: Invalid operator authentication.');
    }

    if (!response.ok) {
      throw new Error('Archival database read failure.');
    }

    return await response.json();
  },

  async getTaskStatus(taskId) {
    try {
      const response = await fetch(`/api/status/${taskId}`);
      if (!response.ok) throw new Error('Failed to query background task progression.');
      return await response.json();
    } catch (error) {
      console.error('[Aegis API] Task status fetch error:', error);
      throw error;
    }
  },

  async deleteLog(logId) {
    const authHeader = 'Basic ' + btoa(`${this.credentials.username}:${this.credentials.password}`);
    let response;
    try {
      response = await fetch(`/api/admin/logs/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
      if (response.status === 404) {
        response = await fetch(`/api/endpoints/admin/logs/${logId}`, {
          method: 'DELETE',
          headers: { 'Authorization': authHeader }
        });
      }
    } catch (error) {
      console.error('[Aegis API] Primary delete route failed, trying fallback...', error);
      response = await fetch(`/api/endpoints/admin/logs/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
    }

    if (response.status === 401) {
      throw new Error('Access Denied: Invalid supervisor credentials for log purge.');
    }

    if (response.status === 404) {
      throw new Error(`Audit log entry #${logId} not found in database.`);
    }

    if (!response.ok) {
      let details = 'Database log deletion failure.';
      try {
        const errPayload = await response.json();
        details = errPayload.detail || errPayload.error || details;
      } catch (_) {}
      throw new Error(details);
    }

    return await response.json();
  },

  async purgeAllLogs() {
    const authHeader = 'Basic ' + btoa(`${this.credentials.username}:${this.credentials.password}`);
    let response;
    try {
      response = await fetch('/api/logs/purge-all', {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
      if (response.status === 404) {
        response = await fetch('/api/endpoints/logs/purge-all', {
          method: 'DELETE',
          headers: { 'Authorization': authHeader }
        });
      }
    } catch (error) {
      console.error('[Aegis API] Primary bulk purge route failed, trying fallback...', error);
      response = await fetch('/api/endpoints/logs/purge-all', {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });
    }

    if (response.status === 401) {
      throw new Error('Access Denied: Invalid supervisor credentials for bulk vault purge.');
    }

    if (!response.ok) {
      let details = 'Database bulk purge failure.';
      try {
        const errPayload = await response.json();
        details = errPayload.detail || errPayload.error || details;
      } catch (_) {}
      throw new Error(details);
    }

    return await response.json();
  }
};


