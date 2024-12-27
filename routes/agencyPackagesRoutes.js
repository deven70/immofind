import express from 'express';
import {
  getAgencyPackage,
  createAgencyPackage,
  updateAgencyPackage,
  deleteAgencyPackage,
  getAgencyPackageById
} from '../controllers/agencyPackagesController.js';
import { authorize } from '../middleware/authorization.js'; // Adjust the path as needed


const router = express.Router();

// Fetch all agency packages
router.post('/', authorize, getAgencyPackage);

// Create a new agency package
router.post('/create', authorize, createAgencyPackage);

router.post('/getbyid', authorize, getAgencyPackageById);

// Update an agency package
router.put('/:id', authorize, updateAgencyPackage);

// Soft delete an agency package
router.delete('/:id', authorize, deleteAgencyPackage);

export default router;
