import { PrismaClient } from '@prisma/client';
import User from '../models/userModel.js';
import response from "../components/utils/response.js";
import passwordGenerator from "../components/utils/passwordGenerator.js";
import crypto from 'crypto';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Create a developer
export const createDeveloper = async (req, res) => {
//   const user_id = req.user.id;

  // Destructure request body
  const {
    user_id,
    credit,
    description,
    facebook_link,
    twitter_link,
    youtube_link,
    pinterest_link,
    linkedin_link,
    instagram_link,
    whatsappPhone,
    service_area,
    tax_number,
    country_code,
    license_number,
  } = req.body;

  try {
    // Check if the user exists
    const existingUser = await prisma.users.findUnique({
      where: {
        id: user_id,
      },
      include: {
        roles: true, // Include role information
      },
    });

    if (!existingUser) {
      return response.error(res, res.__('messages.userNotFound'), null);
    }

    // Check if the user's role is "developer"
    if (existingUser.roles.name !== "developer") {
      return response.error(
        res,
        res.__('messages.userNotAuthorizedToCreateDeveloper'),
        null
      );
    }

    // Check if a developer profile already exists for this user
    const existingDeveloper = await prisma.developers.findUnique({
      where: { user_id },
    });

    if (existingDeveloper) {
      return response.error(
        res,
        res.__('messages.developerAlreadyExists'),
        null
      );
    }

    // Prepare developer data for creation
    const developerData = {
      user_id: existingUser.id, // Use the ID from the authenticated user
      credit,
      description,
      facebookLink: facebook_link,
      twitterLink: twitter_link,
      youtubeLink: youtube_link,
      pinterestLink: pinterest_link,
      linkedinLink: linkedin_link,
      instagramLink: instagram_link,
      whatsappPhone,
      serviceArea: service_area,
      taxNumber: tax_number,
      country_code:country_code,
      licenseNumber: license_number,
      created_by: existingUser.id,
    };

    // Create the developer profile
    const developer = await prisma.developers.create({
      data: developerData,
    });

    // Convert BigInt fields to string for response (if applicable)
    const safeDeveloper = JSON.parse(
      JSON.stringify(developer, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    // Success response
    return response.success(
      res,
      res.__('messages.developerCreatedSuccessfully'),
      { developer: safeDeveloper }
    );
  } catch (err) {
    console.error('Error creating developer:', err);
    return response.serverError(
      res,
      res.__('messages.internalServerError'),
      err.message
    );
  }
};


// Get all developers

export const getAllDevelopers = async (req, res) => {
  const user_id = req.user.id; // Get the logged-in user's ID from the auth token

  try {
    // Fetch the developer details for the logged-in user
    const developer = await prisma.developers.findUnique({
      where: {
        user_id: user_id, // Filter by the authenticated user's ID
      },
    });

    if (!developer) {
      return response.error(
        res,
        res.__('messages.developerNotFound'), // Message if the developer doesn't exist
        null
      );
    }

    // Convert BigInt fields to string for response (if applicable)
    const safeDeveloper = JSON.parse(
      JSON.stringify(developer, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return response.success(
      res,
      res.__('messages.developersRetrievedSuccessfully'),
      { developer: safeDeveloper }
    );
  } catch (err) {
    console.error('Error retrieving developer:', err);
    return response.serverError(
      res,
      res.__('messages.internalServerError'),
      err.message
    );
  }
};


// Update a developer
export const updateDeveloper = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the UUID format
    const isValidUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

    if (!isValidUUID) {
      return response.error(res, res.__('messages.invalidUUIDFormat'), null);
    }

    // Check if the developer exists
    const existingDeveloper = await prisma.developers.findUnique({
      where: { id },
    });

    if (!existingDeveloper) {
      return response.error(res, res.__('messages.developerNotFound'), null);
    }

    // Update developer details
    const updatedDeveloper = await prisma.developers.update({
      where: { id },
      data: req.body,
    });

    return response.success(res, res.__('messages.developerUpdatedSuccessfully'), updatedDeveloper);
  } catch (err) {
    console.error('Error updating developer:', err);
    return response.serverError(res, res.__('messages.internalServerError'), err.message);
  }
};



// Delete a developer
export const deleteDeveloper = async (req, res) => {
    const { id } = req.params; // Assuming the developer ID is passed in the request params

    try {
        // Step 1: Fetch the developer by ID
        const developer = await prisma.developers.findUnique({
            where: { id: id },  // Look up the developer by the ID
        });

        if (!developer) {
            // Developer not found
            return response.error(res, res.__('messages.developerNotFound'), null);
        }

        // Step 2: Delete the developer using the `user_id`
        const deletedDeveloper = await prisma.developers.delete({
            where: { user_id: developer.user_id },  // Delete using the developer's `user_id`
        });

        // Step 3: Delete the associated user from the `users` table
        const deletedUser = await prisma.users.delete({
            where: { id: developer.user_id },  // Assuming `user_id` maps to the `users` table
        });

        // Send a success response with the details of deleted developer and user
        return response.success(
            res,
            res.__('messages.developerAndUserDeletedSuccessfully')
        );
    } catch (err) {
        // Log the error for debugging
        console.error('Error deleting developer and user:', err);

        // Return a server error response
        return response.serverError(res, res.__('messages.internalServerError'), err.message);
    }
};
