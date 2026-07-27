/**
 * Live Webcam Stream Manager & Frame Capture for Aegis-Eye
 * Adheres strictly to edit3.md Phase 1 specifications.
 */

let activeStream = null;

export const Webcam = {
  /**
   * Starts webcam video stream
   */
  async startStream(videoElement) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Webcam mediaDevices API is not supported on this browser or origin context.');
    }

    // Stop existing stream if running
    this.stopStream();

    try {
      activeStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: false
      });

      if (videoElement) {
        videoElement.srcObject = activeStream;
        await videoElement.play();
      }

      return activeStream;
    } catch (error) {
      console.error('[Aegis Webcam] Failed to access camera:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Camera access permission was denied by operator.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No compatible webcam video hardware device was detected.');
      } else {
        throw new Error(`Webcam initialization failure: ${error.message}`);
      }
    }
  },

  /**
   * Stops active camera stream and releases tracks
   */
  stopStream() {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      activeStream = null;
      console.log('[Aegis Webcam] Stopped all active camera tracks.');
    }
  },

  /**
   * Captures high-res JPEG Blob from active video element
   */
  captureFrame(videoElement) {
    return new Promise((resolve, reject) => {
      if (!videoElement || videoElement.readyState < 2) {
        return reject(new Error('Webcam stream is not ready for frame capture.'));
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode video frame to JPEG blob.'));
        }
      }, 'image/jpeg', 0.95);
    });
  }
};
