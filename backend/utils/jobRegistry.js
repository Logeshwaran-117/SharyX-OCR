'use strict';

class JobRegistry {
  constructor() {
    this.cancelledJobs = new Set();
    this.activeJobs = new Map();
  }

  registerJob(jobId, meta = {}) {
    if (!jobId) return;
    this.activeJobs.set(jobId, { startTime: Date.now(), ...meta });
  }

  requestCancellation(jobId) {
    if (!jobId) return;
    this.cancelledJobs.add(jobId);
  }

  isCancelled(jobId) {
    if (!jobId) return false;
    return this.cancelledJobs.has(jobId);
  }

  clearJob(jobId) {
    if (!jobId) return;
    this.cancelledJobs.delete(jobId);
    this.activeJobs.delete(jobId);
  }
}

module.exports = new JobRegistry();
