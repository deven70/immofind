import express from 'express';
import { createDistrict, getDistrictsByCity, getDistrictById, updateDistrict, deleteDistrict, getDistricts} from '../controllers/districtController.js';
import { authorize } from '../middleware/authorization.js'; // Import the authorization middleware
const router = express.Router();

// Create a new district
router.post("/create", authorize, createDistrict);

// Get districts by city
router.post("/getbycity", authorize, getDistrictsByCity);

// Get district by ID
router.post("/getbydistrict", authorize, getDistrictById);

// Update a district
router.put("/update", authorize, updateDistrict);

// Delete a district
router.delete("/delete", authorize, deleteDistrict);

router.post('/', authorize, getDistricts);

export default router;