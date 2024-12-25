import { PrismaClient } from '@prisma/client';
import response from '../components/utils/response.js';

const prisma = new PrismaClient();

// Create State with LangTranslations
export const createState = async (req, res) => {
  try {
    const { en_name, fr_name, latitude, longitude} = req.body;

    if (!en_name || !fr_name) {
      return await response.error(res, res.__('messages.fieldError')); // Error when required fields are missing
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

    // Create the state with the langTranslation reference
    const state = await prisma.states.create({
      data: {
        lang_id: newLangTranslation.id, // Link to LangTranslations ID
        latitude: latitude,
        longitude: longitude,
      },
    });

    return await response.success(
      res,
      res.__('messages.stateCreatedSuccessfully'),
      state
    ); // Success message
  } catch (error) {
    console.error(error);
    return await response.error(res, res.__('messages.internalServerError'), { message: error.message }); // Server error
  }
};


// Get All States with Cities and LangTranslations
export const getStates = async (req, res) => {
  try {
    const { lang } = req.query; // Language parameter (e.g., `?lang=fr` or `?lang=en`)
    const isFrench = lang === 'fr'; // Determine if the language is French

    const states = await prisma.states.findMany({
      select: {
        id: true, // Include the state ID
        lang: {
          select: {
            fr_string: isFrench,
            en_string: !isFrench,
          },
        },
        cities: {
          select: {
            id: true, // Include city ID
            lang: {
              select: {
                // Select either `fr_string` or `en_string` for the city based on the language
                fr_string: isFrench,
                en_string: !isFrench,
              },
            },
          },
        },
      },
    });

    // Transform results to include the selected language string for states and cities
    const transformedStates = states.map((state) => ({
      ...state,
      name: isFrench ? state.lang.fr_string : state.lang.en_string,
      latitude: state.latitude,
      longitude: state.longitude,
      cities: state.cities.map((city) => ({
        ...city,
        name: isFrench ? city.lang.fr_string : city.lang.en_string,
        latitude: city.latitude,
        longitude: city.longitude,
      })),
      lang: undefined,
    }));

    return await response.success(
      res,
      res.__('messages.statesFetchedSuccessfully'),
      transformedStates
    );
  } catch (error) {
    console.error(error);
    return await response.error(
      res,
      res.__('messages.internalServerError'),
      { message: error.message }
    );
  }
};
