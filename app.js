import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import authRoutes from './routes/authRoutes.js';
import agencyRoutes from './routes/agencyRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import stateRoutes from './routes/stateRoutes.js';
import cityRoutes from './routes/cityRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import propertyTypeRoutes from './routes/propertyTypeRoutes.js';
import districtRoutes from './routes/districtRoutes.js';
import neighborhoodsRoutes from './routes/neighborhoodsRoutes.js';
import propertyTypeListingsRoutes from './routes/propertyTypeListingsRoutes.js';
import agencyPackagesRoutes from './routes/agencyPackagesRoutes.js';
import developersRoutes from './routes/developersRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import projectTypeListingsRoutes from './routes/projectTypeListingsRoutes.js';
import dashboardListingsRoutes from './routes/dashboardListingsRoutes.js';
import currencyRoutes from './routes/currencyRoutes.js';
import cors from 'cors';
import i18n from 'i18n';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;


// Session setup
app.use(session({ secret: 'we-api', resave: false, saveUninitialized: true }));

// app.use(passport.initialize());
// app.use(passport.session());
app.use(express.json());

const getLangFileName = fileURLToPath(import.meta.url);
const getLangDirName = path.dirname(getLangFileName);
// Language
i18n.configure({
    locales: ['en', 'fr'],  // Add other languages as needed
    directory: path.join(getLangDirName,  'components','translations'),
    defaultLocale: 'en',
    objectNotation: true,
});
app.use(i18n.init);

// Serve the 'uploads' folder as static files
app.use('/uploads', express.static(path.join(getLangDirName, 'uploads')));


// Use auth routes

app.use(cors({
    origin: [ process.env.FRONT_END_URL,process.env.BACKEND_END_URL], // Adjust this to match your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Methods'], // Add necessary headers
}));


// app.use((req, res, next) => {
//     res.header("Access-Control-Allow-Origin", "*"); // Replace with your frontend URL
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//     res.header("Accept", "*/*");
//     res.header("Content-Type", "application/json");
//     next();
// });
app.use((req, res, next) => {
    const lang = req.body.lang || 'en';
    res.setLocale(lang);
    next();
});
app.use('/auth', authRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/images', imageRoutes); // Add image routes
app.use('/api/state', stateRoutes);
app.use('/api/city', cityRoutes);
app.use('/api/district', districtRoutes);
app.use('/api/neighborhood', neighborhoodsRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/property-type', propertyTypeRoutes);
app.use('/api/property-type-listings', propertyTypeListingsRoutes);
app.use('/api/agency-packages', agencyPackagesRoutes);
app.use('/api/developer', developersRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/project-type-listings', projectTypeListingsRoutes);
app.use('/api/dashboard', dashboardListingsRoutes);
app.use('/api/currency', currencyRoutes);
// Home route
app.get('/', (req, res) => {
    res.send('Welcome to the Immofind API!');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on ${process.env.BASE_URL}`);
});
