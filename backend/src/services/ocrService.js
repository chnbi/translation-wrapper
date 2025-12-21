const vision = require('@google-cloud/vision');
const supabase = require('../config/supabaseClient');

class OCRService {
  constructor() {
    try {
      this.client = new vision.ImageAnnotatorClient({
        apiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY
      });
    } catch (error) {
      console.warn('⚠️ Google Cloud Vision not configured. OCR will use mock data.');
      this.client = null;
    }
  }

  async extractTextFromStoragePath(storagePath) {
    try {
      if (!this.client) {
        return this.getMockOCRResult();
      }

      // 1. Download image from Supabase Storage
      const { data: blob, error: downloadError } = await supabase.storage
        .from('project_images')
        .download(storagePath);

      if (downloadError) {
        throw new Error(`Supabase download error: ${downloadError.message}`);
      }

      // 2. Convert Blob to Buffer
      const buffer = Buffer.from(await blob.arrayBuffer());

      // 3. Send buffer to Google Vision API
      const [result] = await this.client.textDetection({
        image: { content: buffer }
      });

      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        return {
          text: '',
          confidence: 0,
          success: false,
          message: 'No text detected in image'
        };
      }

      const fullText = detections[0].description;
      const confidence = this.calculateConfidence(detections);

      return {
        text: fullText.trim(),
        confidence: Math.round(confidence * 100),
        success: true
      };
    } catch (error) {
      console.error('OCR Error from Storage Path:', error);
      return { text: '', confidence: 0, success: false, message: error.message };
    }
  }

  async extractTextFromBase64(base64Image) {
    try {
      if (!this.client) {
        return this.getMockOCRResult();
      }

      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

      const [result] = await this.client.textDetection({
        image: { content: base64Data }
      });

      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        return { text: '', confidence: 0, success: false, message: 'No text detected in image' };
      }

      const fullText = detections[0].description;
      const confidence = this.calculateConfidence(detections);

      return {
        text: fullText.trim(),
        confidence: Math.round(confidence * 100),
        success: true
      };
    } catch (error) {
      console.error('OCR Error from Base64:', error);
      return { text: '', confidence: 0, success: false, message: error.message };
    }
  }

  calculateConfidence(detections) {
    if (!detections || detections.length === 0) return 0;
    return 0.85; // Default high confidence
  }

  getMockOCRResult() {
    return {
      text: 'Get 5G Now\nSign Up Today',
      confidence: 92,
      success: true,
      message: 'Mock OCR result (Google Cloud Vision not configured)'
    };
  }

  validateImageQuality(imageBuffer) {
    const minSize = 100;
    const maxSize = 10 * 1024 * 1024;

    if (imageBuffer.length < minSize) {
      return { valid: false, message: 'Image file is too small or corrupted' };
    }

    if (imageBuffer.length > maxSize) {
      return { valid: false, message: 'Image file is too large (max 10MB)' };
    }

    return { valid: true };
  }
}

module.exports = new OCRService();
