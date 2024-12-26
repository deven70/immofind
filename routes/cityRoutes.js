import express from 'express';
import { createCity, getCities, getCitiesByStateId, deleteCity, updateCity, getCityById } from '../controllers/cityController.js';
import { authorize } from '../middleware/authorization.js'; // Import the authorization middleware

const router = express.Router();

// Define your routes here
router.post('/create', authorize, createCity); // Protected route
router.post('/', authorize,getCities); // Public route (no authorization needed)
router.post('/getbystate', authorize, getCitiesByStateId); // Protected route
// router.post('/search',authorize, getCitiesByState); // Public route (no authorization needed)
router.delete('/delete', authorize, deleteCity);
router.put('/update', authorize, updateCity);
router.post("/getbycity", authorize, getCityById);

export default router;
