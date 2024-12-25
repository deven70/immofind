import { PrismaClient } from '@prisma/client';
import response from "../components/utils/response.js";
import { validate as isUuid } from 'uuid';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Create City with LangTranslations
export const createCity = async (req, res) => {
  try {
    const { en_name, fr_name, state_id, latitude, longitude } = req.body;

    // Validate required fields
    if (!en_name || !fr_name || !state_id) {
      return await response.error(res, res.__('messages.fieldError')); // Error when required fields are missing
    }

    // Validate state_id format
    if (!isUuid(state_id)) {
      return await response.error(
        res,
        res.__('messages.invalidStateIdFormat') // Custom error message for invalid UUID format
      );
    }

    // Check if state_id exists in the states table
    const stateExists = await prisma.states.findUnique({
      where: { id: state_id },
    });

    if (!stateExists) {
      return await response.error(
        res,
        res.__('messages.invalidStateId') // Use a custom error message for invalid state_id
      );
    }

    // Check if a city with the same name already exists in the same state
    const existingLangTranslation = await prisma.langTranslations.findFirst({
      where: {
        OR: [
          { en_string: en_name },
          { fr_string: fr_name },
        ],
      },
    });

    if (existingLangTranslation) {
      const existingCity = await prisma.cities.findFirst({
        where: {
          state_id, // Ensure it's within the same state
          lang_id: existingLangTranslation.id, // Match the LangTranslation ID
          is_deleted: false, // Exclude soft-deleted entries
        },
      });

      if (existingCity) {
        return await response.error(
          res,
          res.__('messages.cityAlreadyExists'), // Use a custom error message
          { existingCity }
        );
      }
    }

    // Create a new LangTranslation entry if no matching translation exists
    const langTranslation = existingLangTranslation
      ? existingLangTranslation
      : await prisma.langTranslations.create({
          data: {
            en_string: en_name,
            fr_string: fr_name,
          },
        });

    // Create the city with the langTranslation reference
    const city = await prisma.cities.create({
      data: {
        state_id, // Link to the state
        lang_id: langTranslation.id, // Link to LangTranslations ID
        latitude: latitude, // Exclude soft-deleted entries
        longitude: longitude, // Exclude soft-deleted entries
      },
    });

    return await response.success(
      res,
      res.__('messages.cityCreatedSuccessfully'),
      city
    ); // Success message
  } catch (error) {
    console.error(error);
    return await response.error(
      res,
      res.__('messages.internalServerError'),
      { message: error.message }
    ); // Server error
  }
};

// Get All Cities with States and LangTranslations
export const getCitiesByStateId = async (req, res) => {
  try {
    const { state_id, lang } = req.body; // Extract state_id and lang from the request body

    // Check if state_id is provided
    if (!state_id) {
      return response.error(res, res.__('messages.stateIdRequired')); // Error if state_id is missing
    }

    // Validate state_id format
    if (!isUuid(state_id)) {
      return response.error(
        res,
        res.__('messages.invalidStateIdFormat') // Custom error message for invalid UUID format
      );
    }

    const isFrench = lang === 'fr'; // Determine if the language is French

    // Fetch state by state_id
    const state = await prisma.states.findUnique({
      where: {
        id: state_id, // Use state_id to directly fetch state
      },
      select: {
        id: true,
        lang: {
          select: {
            fr_string: isFrench,
            en_string: !isFrench,
          },
        },
      },
    });

    if (!state) {
      return response.error(res, res.__('messages.stateNotFound')); // Error if state is not found
    }

    // Fetch cities for the state
    const cities = await prisma.cities.findMany({
      where: {
        state_id: state.id, // Match cities by state_id
        is_deleted: false,
      },
      select: {
        id: true,
        lang: {
          select: {
            fr_string: isFrench,
            en_string: !isFrench,
          },
        },
        districts: {
          select: {
            id: true,
            langTranslation: {
              select: {
                fr_string: isFrench,
                en_string: !isFrench,
              },
            },
          },
        },
      },
    });

    if (!cities.length) {
      return response.error(res, res.__('messages.noCitiesFoundForState')); // Error if no cities are found
    }

    // Transform the results to include only the necessary language strings
    const transformedCities = cities.map((city) => ({
      id: city.id,
      name: isFrench ? city.lang.fr_string : city.lang.en_string, // City name in the requested language
      districts: city.districts.map((district) => ({
        id: district.id,
        name: district.langTranslation
          ? (isFrench
              ? district.langTranslation.fr_string
              : district.langTranslation.en_string)
          : null, // Handle missing translations
      })),
    }));

    // Include state details in the response
    const result = {
      state: {
        id: state.id,
        name: isFrench && state.lang ? state.lang.fr_string : state.lang?.en_string, // State name in the requested language
      },
      cities: transformedCities,
    };

    return response.success(res, res.__('messages.citiesFetchedSuccessfully'), result); // Success response
  } catch (error) {
    console.error('Error fetching cities:', error);
    return response.error(res, res.__('messages.internalServerError'), {
      message: error.message,
      stack: error.stack,
    }); // Server error
  }
};

// Get Cities by State Name
export const getCitiesByState = async (req, res) => {
  try {
    const { stateName, lang } = req.body; // Extract stateName and lang from the request body

    if (!stateName) {
      return response.error(res, res.__('messages.stateNameRequired')); // Error if stateName is missing
    }

    const isFrench = lang === 'fr'; // Determine the requested language

    // Fetch state by name (match on lang table)
    const state = await prisma.states.findFirst({
      where: {
        is_deleted: false, // Ensure the state is not soft-deleted
        lang: {
          OR: [
            { fr_string: isFrench ? stateName : null }, // Match French name if lang is 'fr'
            { en_string: !isFrench ? stateName : null }, // Match English name otherwise
          ],
        },
      },
    });

    if (!state) {
      return response.error(res, res.__('messages.stateNotFound')); // Error if no state matches the name
    }

    // Check if the state has a valid language translation
    if (!state.lang_id) {
      return response.error(res, res.__('messages.stateLanguageNotFound')); // Error if state doesn't have language translations
    }

    // Fetch cities for the state
   const cities = await prisma.cities.findMany({
    where: { state_id },
    select: {
        id: true,
        latitude: true, // Include latitude
        longitude: true, // Include longitude
        lang: {
        select: {
            fr_string: isFrench,
            en_string: !isFrench,
        },
        },
        districts: {
        select: {
            id: true,
            latitude: true, // Include district latitude
            longitude: true, // Include district longitude
            langTranslation: {
            select: {
                fr_string: isFrench,
                en_string: !isFrench,
            },
            },
        },
        },
    },
    });

    if (!cities.length) {
      return response.error(res, res.__('messages.noCitiesFoundForState')); // Error if no cities are found
    }

    // Transform the results to include only the necessary language strings
    const transformedCities = cities.map((city) => ({
      id: city.id,
      name: isFrench ? city.lang.fr_string : city.lang.en_string, // City name in the requested language
      districts: city.districts.map((district) => ({
        id: district.id,
        // Safely check if langTranslation exists before accessing strings
        name: district.langTranslation
          ? (isFrench
              ? district.langTranslation.fr_string // District name in the requested language
              : district.langTranslation.en_string)
          : null, // Return null if langTranslation is missing
      })),
    }));

    // Include state details in the response
    const result = {
        state: {
            id: state.id,
            name: isFrench && state.lang ? state.lang.fr_string : state.lang?.en_string, // State name in requested language
            latitude: state.latitude, // Include latitude
            longitude: state.longitude, // Include longitude
        },
        cities: transformedCities, // Include transformed cities
    };

    return response.success(res, res.__('messages.citiesFetchedSuccessfully'), result); // Success response
  } catch (error) {
    console.error(error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message }); // Server error
  }
};

export const getCities = async (req, res) => {
  try {
    const { state_id, lang } = req.body; // Extract state_id and lang from the request body

    // Validate state_id presence
    if (!state_id) {
      return response.error(
        res,
        res.__('messages.stateIdRequired'),
        null
      ); // Error if state_id is missing
    }

    // Validate state_id format
    if (!isUuid(state_id)) {
      return response.error(
        res,
        res.__('messages.invalidStateIdFormat'), // Custom error message for invalid UUID format
        null
      );
    }

    const isFrench = lang === 'fr'; // Determine if the language is French

    // Fetch cities related to the provided state_id
    const cities = await prisma.cities.findMany({
    where: { state_id }, // Filter by state_id
    select: {
        id: true, // City ID
        latitude: true, // Include latitude
        longitude: true, // Include longitude
        lang: {
        select: {
            fr_string: isFrench, // Include fr_string if lang is 'fr'
            en_string: !isFrench, // Include en_string otherwise
        },
        },
    },
    });

    // Handle no cities found
    if (!cities.length) {
    return response.error(res, res.__('messages.noCitiesFoundForState'), null);
    }

    // Transform data to simplify language selection
    const transformedCities = cities.map((city) => ({
    id: city.id,
    name: city.lang?.fr_string || city.lang?.en_string, // City name in the requested language
    latitude: city.latitude, // Include latitude
    longitude: city.longitude, // Include longitude
    }));

    // Return the transformed data
    return response.success(
      res,
      res.__('messages.citiesFetchedSuccessfully'),
      transformedCities
    );
  } catch (error) {
    console.error('Error fetching cities:', error);
    return response.error(res, res.__('messages.internalServerError'), {
      message: error.message,
      stack: error.stack,
    }); // Server error
  }
};
