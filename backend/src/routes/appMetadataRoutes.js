const express = require('express');
const router = express.Router();
const AppMetadata = require('../models/AppMetadata');
const auth = require('../middleware/auth');

// Get all app metadata
router.get('/', auth, async (req, res) => {
  try {
    const metadata = await AppMetadata.find();
    res.json(metadata);
  } catch (error) {
    console.error('Metadata fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get app metadata by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const metadata = await AppMetadata.findById(req.params.id);
    if (!metadata) {
      return res.status(404).json({ message: 'Metadata not found' });
    }
    res.json(metadata);
  } catch (error) {
    console.error('Metadata fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create app metadata (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const metadata = new AppMetadata(req.body);
    await metadata.save();
    res.status(201).json(metadata);
  } catch (error) {
    console.error('Metadata creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update app metadata (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const metadata = await AppMetadata.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!metadata) {
      return res.status(404).json({ message: 'Metadata not found' });
    }

    res.json(metadata);
  } catch (error) {
    console.error('Metadata update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete app metadata (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const metadata = await AppMetadata.findByIdAndDelete(req.params.id);
    if (!metadata) {
      return res.status(404).json({ message: 'Metadata not found' });
    }

    res.json({ message: 'Metadata deleted successfully' });
  } catch (error) {
    console.error('Metadata deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get metadata by package name
router.get('/package/:name', auth, async (req, res) => {
  try {
    const metadata = await AppMetadata.findOne({ packageName: req.params.name });
    if (!metadata) {
      return res.status(404).json({ message: 'Metadata not found' });
    }
    res.json(metadata);
  } catch (error) {
    console.error('Metadata fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update metadata by package name (admin only)
router.put('/package/:name', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const metadata = await AppMetadata.findOneAndUpdate(
      { packageName: req.params.name },
      req.body,
      { new: true, upsert: true }
    );

    res.json(metadata);
  } catch (error) {
    console.error('Metadata update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
