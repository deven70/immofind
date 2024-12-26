import { PrismaClient } from '@prisma/client';
import response from '../components/utils/response.js';

const prisma = new PrismaClient();

// Create State with LangTranslations
import jwt from 'jsonwebtoken'; // Import jwt if not already done

export const createState = async (req, res) => {
  try {
    const { en_name, fr_name, latitude, longitude } = req.body;

    if (!en_name || !fr_name) {
      return await response.error(res, res.__('messages.fieldError')); // Error when required fields are missing
    }

    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return await response.error(res, res.__('messages.authTokenRequired')); // Error if token is missing
    }
    
    const token = authHeader.split(' ')[1];
    let userId;

    // Verify and decode the token to get user ID
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your JWT secret
      userId = decoded.id; // Adjust based on your token structure
    } catch (error) {
      return await response.error(res, res.__('messages.invalidToken')); // Error if token is invalid
    }

    // Find if a LangTranslation exists with the given names
    const langTranslation = await prisma.langTranslations.findFirst({
      where: {
        OR: [
          { en_string: en_name },
          { fr_string: fr_name },
        ],
      },
    });

    if (langTranslation) {
      // Check if the LangTranslation ID is already used in the states table
      const existingState = await prisma.states.findFirst({
        where: {
          lang_id: langTranslation.id, // Check for an existing state with the same lang_id
          is_deleted: false,
        },
      });

      if (existingState) {
        return await response.error(
          res,
          res.__('messages.stateAlreadyExists'),
          { existingState }
        );
      }
    }

    // Create a new LangTranslation entry if no matching translation exists
    const newLangTranslation = langTranslation
      ? langTranslation
      : await prisma.langTranslations.create({
          data: {
            en_string: en_name,
            fr_string: fr_name,
          },
        });

    // Create the state with the langTranslation reference and created_by user_id
    const state = await prisma.states.create({
      data: {
        lang_id: newLangTranslation.id, // Link to LangTranslations ID
        latitude: latitude,
        longitude: longitude,
        created_by: userId, // Store user ID who created the state
      },
    });

    const lang = res.getLocale();
    const responseData = {
      id: state.id,
      state: lang === 'fr' ? newLangTranslation.fr_string : newLangTranslation.en_string, // Use the appropriate language
      is_deleted: state.is_deleted,
      created_at: state.created_at,
      updated_at: state.updated_at,
      created_by: state.created_by,
      updated_by: state.updated_by,
      latitude: state.latitude,
      longitude: state.longitude,
    };

    return await response.success(
      res,
      res.__('messages.stateCreatedSuccessfully'),
      responseData
    ); // Success message
  } catch (error) {
    console.error(error);
    return await response.error(res, res.__('messages.internalServerError'), { message: error.message }); // Server error
  }
};



export const updateState = async (req, res) => {
  try {
    const { state_id, en_name, fr_name, latitude, longitude } = req.body;

    if (!state_id || (!en_name && !fr_name && latitude === undefined && longitude === undefined)) {
      return response.error(res, res.__('messages.fieldError'));
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, res.__('messages.authTokenRequired'));
    }

    const token = authHeader.split(' ')[1];
    let userId;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (error) {
      return response.error(res, res.__('messages.invalidToken'));
    }

    const state = await prisma.states.findUnique({
      where: { id: state_id, is_deleted: false },
    });

    if (!state) {
      return response.error(res, res.__('messages.stateNotFound'));
    }

    let langTranslation;
    if (en_name || fr_name) {
      langTranslation = await prisma.langTranslations.findFirst({
        where: {
          OR: [
            { en_string: en_name },
            { fr_string: fr_name },
          ],
        },
      });

      if (!langTranslation) {
        langTranslation = await prisma.langTranslations.create({
          data: {
            en_string: en_name,
            fr_string: fr_name,
          },
        });
      }
    }

    const updatedState = await prisma.states.update({
      where: { id: state.id },
      data: {
        lang_id: langTranslation ? langTranslation.id : state.lang_id, 
        latitude: latitude !== undefined ? latitude : state.latitude,
        longitude: longitude !== undefined ? longitude : state.longitude,
        updated_by: userId,
        updated_at: new Date(),
      },
    });

    const responseData = {
      id: updatedState.id,
      state: langTranslation ? (res.getLocale() === 'fr' ? langTranslation.fr_string : langTranslation.en_string) : state.lang_id,
      is_deleted: updatedState.is_deleted,
      created_at: updatedState.created_at,
      updated_at: updatedState.updated_at,
      created_by: updatedState.created_by,
      updated_by: updatedState.updated_by,
      latitude: updatedState.latitude,
      longitude: updatedState.longitude,
    };

    return response.success(
      res,
      res.__('messages.stateUpdatedSuccessfully'),
      responseData
    );
  } catch (error) {
    console.error('Error in updateState:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message });
  }
};




export const getStateByStateId = async (req, res) => {
  try {
    const { state_id, lang } = req.body;
    if (!state_id) {
      return response.error(res, res.__('messages.stateIdRequired'));
    }

    const state = await prisma.states.findUnique({
      where: {
        id: state_id,
      },
    });

    if (!state) {
      return response.error(res, res.__('messages.stateNotFound'));
    }

    const langTranslation = await prisma.langTranslations.findUnique({
      where: {
        id: state.lang_id,
      },
    });

    if (!langTranslation) {
      return response.error(res, res.__('messages.translationNotFound'));
    }

    const name = lang === 'fr' ? langTranslation.fr_string : langTranslation.en_string;

    const result = {
      state: {
        id: state.id,
        name,
        is_deleted: state.is_deleted,
        created_at: state.created_at,
        updated_at: state.updated_at,
        created_by: state.created_by,
        updated_by: state.updated_by,
        latitude: state.latitude,
        longitude: state.longitude,
      },
    };

    return response.success(res, res.__('messages.statesFetchedSuccessfully'), result);
  } catch (error) {
    console.error('Error fetching state:', error);
    return response.error(res, res.__('messages.internalServerError'), {
      message: error.message,
      stack: error.stack,
    });
  }
};



export const deleteState = async (req, res) => {
  try {
    const { state_id } = req.body;

    // Validate that state_id is provided
    if (!state_id) {
      return response.error(res, res.__('messages.fieldError')); // Error when state_id is missing
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, res.__('messages.authTokenRequired')); // Error if token is missing
    }

    const token = authHeader.split(' ')[1];
    let userId;

    // Verify the token to get the user ID
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your JWT secret
      userId = decoded.id; // Adjust based on your token structure
    } catch (error) {
      return response.error(res, res.__('messages.invalidToken')); // Error if token is invalid
    }

    // Find the state to delete
    const state = await prisma.states.findUnique({
      where: { id: state_id, is_deleted: false },
    });

    if (!state) {
      return response.error(res, res.__('messages.stateNotFound')); // Error if state not found
    }

    // Check if there are any cities associated with this state
    const associatedCities = await prisma.cities.count({
      where: { state_id: state_id, is_deleted: false },
    });

    if (associatedCities > 0) {
      return response.error(res, res.__('messages.stateNotDeleteDueToCities')); // Error if state has associated cities
    }

    // Delete the state from the database
    await prisma.states.delete({
      where: { id: state_id },
    });

    return response.success(
      res,
      res.__('messages.stateDeletedSuccessfully'), // Success message
      { state_id } // Return the deleted state's ID
    );
  } catch (error) {
    console.error('Error in deleteState:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message }); // Server error
  }
};








// Get All States with Cities and LangTranslations
export const getAllStates = async (req, res) => {
  try {
    const { lang } = req.body;

    // Fetch all states from the database
    const states = await prisma.states.findMany({
      where: {
        is_deleted: false, // Assuming you want only non-deleted states
      },
      include: {
        lang: true, // Include the related LangTranslations
      },
    });

    // Check if there are any states
    if (states.length === 0) {
      return response.error(res, res.__('messages.noStatesFound')); // Handle no states found
    }

    // Map through states to format the response
    const result = states.map((state) => {
      const name = lang === 'fr' && state.lang 
        ? state.lang.fr_string 
        : state.lang?.en_string || 'Unknown';

      return {
        id: state.id,
        name,
        is_deleted: state.is_deleted,
        created_at: state.created_at,
        updated_at: state.updated_at,
        created_by: state.created_by,
        updated_by: state.updated_by,
        latitude: state.latitude,
        longitude: state.longitude,
      };
    });

    return response.success(res, res.__('messages.statesFetchedSuccessfully'), { states: result }); // Wrap states in an object
  } catch (error) {
    console.error('Error fetching states:', error);
    return response.error(res, res.__('messages.internalServerError'), {
      message: error.message,
      stack: error.stack,
    });
  }
};
