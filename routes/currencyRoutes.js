import express from 'express';
import {createCurrency, updateCurrency, deleteCurrency, getCurrency} from '../controllers/currencyController.js';
const router = express.Router();
import { authorize } from '../middleware/authorization.js';

// Google auth routes
router.post('/create', authorize, createCurrency);

router.post('/get', authorize, getCurrency);

router.put('/update/:id', authorize, updateCurrency);

router.put('/update', authorize, updateCurrency);

router.delete('/delete/:id', authorize, deleteCurrency);

router.delete('/delete', authorize, deleteCurrency);


// router.post('/get', getCurrency);

export default router;
