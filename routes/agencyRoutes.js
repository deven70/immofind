import express from 'express';
import { createAgency, sendMail, getAllAgencies, getAgencyById, updateAgency, deleteAgency }
 from '../controllers/agencyController.js';
import { authorize } from '../middleware/authorization.js'; // Adjust the path as needed

const router = express.Router();

// --- Start adding agency routes ---
// Create an agency (protected)
router.post('/create', authorize, createAgency);

// Send mail (protected)
router.post('/sendmail', authorize, sendMail);

// Get all agencies (protected)
router.post('/', authorize, getAllAgencies);

// Get an agency by ID (protected)
router.post('/:id', authorize, getAgencyById);

// Update an agency (protected)
router.put('/:id', authorize, updateAgency);

// Delete an agency (protected)
router.delete('/:id', authorize, deleteAgency);

export default router;
