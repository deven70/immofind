// routes/imageRoutes.js
import express from 'express';
import { uploadSingleImage, uploadMultipleImages, uploadMultipleImagesFromJson} from '../controllers/imageController.js';
import { authorize } from '../middleware/authorization.js'; // Import the authorization middleware
const router = express.Router();

// Route for single image upload
router.post('/upload/single', uploadSingleImage);

// Route for multiple images upload
router.post('/upload/multiple', uploadMultipleImages);

// POST route to handle multiple image uploads from JSON data
router.post('/upload/multiple-json', uploadMultipleImagesFromJson);


export default router;
