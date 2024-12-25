import express from 'express';
import { createDistrict, getDistrictsByCity, getDistrictById, updateDistrict, deleteDistrict} from '../controllers/districtController.js';
import { authorize } from '../middleware/authorization.js'; // Import the authorization middleware
const router = express.Router();

// Create a new district
router.post("/create", authorize, createDistrict);

// Get districts by city
router.post("/", authorize, getDistrictsByCity);

// Get district by ID
router.post("/getId", authorize, getDistrictById);

// Update a district
router.put("/:id", authorize, updateDistrict);

// Delete a district
router.delete("/:id", authorize, deleteDistrict);

export default router;