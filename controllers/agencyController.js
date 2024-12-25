import { PrismaClient } from '@prisma/client';
import User from '../models/userModel.js'; // Assuming you have a User model defined
import sendmail from "../components/utils/sendmail.js";
import crypto from 'crypto';
import response from "../components/utils/response.js";

// Initialize Prisma Client
const prisma = new PrismaClient(); // Assuming response utility is in place

// Create an agency
export const createAgency = async (req, res) => {
  // Extract user_id directly from the authenticated user
//   const user_id = req.user.id;

//   if (!user_id) {
//     return response.error(res, "User ID is missing", null); // Handle the case where the user_id is missing.
//   }

  // Destructure agency data from the request body
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
    whatsup_number,
    service_area,
    tax_number,
    license_number,
    picture,
    cover,
    agency_packages,
  } = req.body;

  try {
    // Fetch user details along with their role
    const existingUser = await prisma.users.findUnique({
      where: {
        id: user_id,  // Use the correct userId to fetch the user
      },
      include: {
        roles: true,  // Include the related role (note: it's 'roles', not 'role')
      },
    });

    // Ensure the user has a role and the role is 'agency'
    if (!existingUser || !existingUser.roles || existingUser.roles.name !== "agency") {
      return response.error(
        res,
        res.__('messages.userNotRightsTocreateAgency'),
        null
      );
    }

    // Check if an agency already exists for the given user_id
    const existingAgency = await prisma.agencies.findUnique({
      where: { user_id: user_id },
    });

    if (existingAgency) {
      return response.error(
        res,
        res.__('messages.agencyAlreadyExists'),
        null
      );
    }

    // Prepare agency data for the agency table
    const agencyData = {
      user_id: user_id, // Link to the newly created user
      credit,
      description,
      facebook_link,
      twitter_link,
      youtube_link,
      pinterest_link,
      linkedin_link,
      instagram_link,
      whatsup_number,
      service_area,
      tax_number,
      license_number,
      picture,
      cover,
      agency_packages,
    };
    // Save agency details to the agency table
    const newAgency = await prisma.agencies.create({
      data: agencyData,
    });

    if (newAgency) {
      return response.success(
        res,
        res.__('messages.agencyCreatedSuccessfully'),
        { agency: newAgency }
      );
    } else {
      return response.error(res, res.__('messages.agencyNotCreated'), null);
    }
  } catch (err) {
    console.error('Error creating agency:', err.message);
    return response.serverError(
      res,
      res.__('messages.internalServerError'),
      err.message
    );
  }
};





// Get all agencies
export const getAllAgencies = async (req, res) => {
  try {
    // Extract user_id from the authenticated user
    const {user_id} = req.body;
    //const user_id = req.user.id;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: res.__('messages.userIdMissing'),
      });
    }

    // Fetch agencies associated with the specific user_id
    const agencies = await prisma.agencies.findMany({
      where: { user_id: user_id },
    });

    // If no agencies found
    if (!agencies || agencies.length === 0) {
      return res.status(404).json({
        success: false,
        message: res.__('messages.noAgenciesFound'),
      });
    }

    // Return success response with the agencies data
    return res.status(200).json({
      success: true,
      message: res.__('messages.agenciesRetrievedSuccessfully'),
      data: agencies,
    });
  } catch (err) {
    // Handle any errors that occur during the query
    console.error('Error fetching agencies:', err);
    return res.status(500).json({
      success: false,
      message: res.__('messages.internalServerError'),
      error: err.message,
    });
  }
};


// Send password reset email
export const sendMail = async (req, res) => {
    const checkEmail = await User.getUser(req.body.email_address, '');

    if (checkEmail) {
        const code = crypto.randomInt(100000, 999999);
        const to = req.body.email_address;
        const subject = "Password Reset Code";
        const text = `Your password reset code is: ${code}`;

        try {
            const emailData = await sendmail.gmail(to, subject, text); // Wait for email to send

            if (emailData) {
                const data = {
                    reset_password_token: code
                };
                const where = {
                    email_address: req.body.email_address
                };
                const userUpdate = await User.updateUser(where, data);

                if (userUpdate) {
                    return response.success(res, res.__('messages.passwordResetEmailSent'), null);
                } else {
                    return response.error(res, res.__('messages.userDataNotUpdated'), null);
                }
            }
        } catch (error) {
            return response.error(res, res.__('messages.emailSendFailed'), null);
        }
    } else {
        return response.error(res, res.__('messages.userNotFound'), null);
    }
};

// Get an agency by ID
export const getAgencyById = async (req, res) => {
  try {
    // Fetch the agency by its ID using Prisma
    const agency = await prisma.agencies.findUnique({
      where: {
        id: req.params.id, // Fetch by the agency ID from the request parameters
      },
    });

    if (agency) {
      // Return success response if agency is found
      return res.status(200).json({
        success: true,
        message: res.__('messages.agencyRetrievedSuccessfully'),
        data: agency,
      });
    } else {
      // Return error if agency is not found
      return res.status(404).json({
        success: false,
        message: res.__('messages.agencyNotFound'),
        data: null,
      });
    }
  } catch (err) {
    // Handle any errors that occur during the query
    console.error('Error fetching agency:', err);
    return res.status(500).json({
      success: false,
      message: res.__('messages.internalServerError'),
      error: err.message,
    });
  }
};

// Update an agency
export const updateAgency = async (req, res) => {
  try {
    // Fetch the agency by ID
    const agency = await prisma.agencies.findUnique({
      where: {
        id: req.params.id, // Use ID from request params to find the agency
      },
    });

    if (agency) {
      // Update the agency with the data from the request body
      const updatedAgency = await prisma.agencies.update({
        where: {
          id: req.params.id,
        },
        data: req.body, // The new data for the agency
      });

      return res.status(200).json({
        success: true,
        message: res.__('messages.agencyUpdatedSuccessfully'),
        data: updatedAgency,
      });
    } else {
      // If no agency is found, return an error response
      return res.status(404).json({
        success: false,
        message: res.__('messages.agencyNotFound'),
        data: null,
      });
    }
  } catch (err) {
    // Handle any errors during the update process
    console.error('Error updating agency:', err);
    return res.status(500).json({
      success: false,
      message: res.__('messages.internalServerError'),
      error: err.message,
    });
  }
};

// Delete an agency
export const deleteAgency = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const isValidUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!isValidUUID) {
      return response.error(res, res.__('messages.invalidUUIDFormat'), null);
    }
    // Check if agency exists
    const existingAgency = await prisma.agencies.findUnique({
      where: { id },
    });

// console.log(existingAgency);

    if (!existingAgency) {
      return response.error(res, res.__('messages.agencyNotFound'), null);
    }

    // Delete agency
    const deletedAgency = await prisma.agencies.delete({
      where: { id },
    });

    if (deletedAgency) {
      return response.success(res, res.__('messages.agencyDeletedSuccessfully'), null);
    }

  } catch (err) {
    console.error('Error deleting agency:', err);
    return response.serverError(res, res.__('messages.internalServerError'), err.message);
  }
};