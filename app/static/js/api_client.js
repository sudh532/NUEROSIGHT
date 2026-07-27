/**
 * API client library for Aegis-Eye Tactical Diagnostic Ocular Core
 */

export const ApiClient = {
  async getHealth() {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error("Aegis host offline");
    return res.json();
  },

  async runOcularScreening(formData) {
    const res = await fetch('/api/detect', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      let errMsg = "Aegis pipeline screening failure.";
      try {
        const data = await res.json();
        errMsg = data.detail || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }
    return res.json();
  },

  async getForensicTrends(username, password) {
    const headers = {
      'Authorization': 'Basic ' + btoa(username + ':' + password)
    };
    
    const res = await fetch('/api/trends', { headers });
    
    if (res.status === 401) {
      throw new Error("Invalid supervisor credentials. Access Denied.");
    }
    
    if (!res.ok) {
      throw new Error("Failed to retrieve forensic trends logs.");
    }
    
    return res.json();
  }
};
