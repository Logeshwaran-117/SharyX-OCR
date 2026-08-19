'use strict';
/**
 * Presentation.js — Mongoose model for saved presentations
 */

const mongoose = require('mongoose');

const presentationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  filename: { type: String, required: true },
  title: { type: String },
  documentType: { type: String },
  slideCount: { type: Number },
  options: {
    purpose: String,
    audience: String,
    language: String,
    theme: String,
  },
  intelligence: {
    title: String,
    documentType: String,
    industry: String,
    executiveSummary: String,
    kpiCount: Number,
    sectionCount: Number,
  },
  blueprint: [{
    slideIndex: Number,
    slideType: String,
    title: String,
  }],
  // Store PPTX binary — for large files consider GridFS or S3
  fileBuffer: {
    type: Buffer,
    select: false, // never returned in queries unless explicitly selected
  },
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
    index: { expireAfterSeconds: 0 },
  },
}, {
  timestamps: true,
});

presentationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Presentation', presentationSchema);
