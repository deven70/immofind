import { PrismaClient } from '@prisma/client';
import response from "../components/utils/response.js";
import { validate as isUuid } from 'uuid';
import jwt from 'jsonwebtoken';
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

    // Get user ID from the token
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return await response.error(res, res.__('messages.authTokenRequired')); // Error if token is missing
    }

    const token = authHeader.split(' ')[1];
    let userId;

    // Verify the token to get the user ID
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your JWT secret
      userId = decoded.id; // Adjust based on your token structure
    } catch (error) {
      return await response.error(res, res.__('messages.invalidToken')); // Error if token is invalid
    }

    // Create the city with the langTranslation reference and created_by field
    const city = await prisma.cities.create({
      data: {
        state_id, // Link to the state
        lang_id: langTranslation.id, // Link to LangTranslations ID
        latitude: latitude, // Optional latitude
        longitude: longitude, // Optional longitude
        created_by: userId, // Set created_by to the ID of the user who created it
      },
    });

    // Fetch the state name from langTranslations
    const stateTranslation = await prisma.langTranslations.findUnique({
      where: { id: stateExists.lang_id },
    });

    // Merge the additional fields with state and city names
    const lang = res.getLocale();
    const responseData = {
      id: city.id,
      is_deleted: city.is_deleted,
      created_at: city.created_at,
      updated_at: city.updated_at,
      created_by: city.created_by,
      updated_by: city.updated_by,
      latitude: city.latitude,
      longitude: city.longitude,
      state: lang === 'fr' ? stateTranslation.fr_string : stateTranslation.en_string,
      city: lang === 'fr' ? langTranslation.fr_string : langTranslation.en_string,
    };

    return await response.success(
      res,
      res.__('messages.cityCreatedSuccessfully'),
      responseData
    ); // Success message with updated response
  } catch (error) {
    console.error(error);
    return await response.error(
      res,
      res.__('messages.internalServerError'),
      { message: error.message }
    ); // Server error
  }
};



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
          latitude: true,
          longitude: true,
        },
      });

      console.log(state);
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
          latitude: true,
          longitude: true,
        },
      });

      if (!cities.length) {
        return response.error(res, res.__('messages.noCitiesFoundForState')); // Error if no cities are found
      }

      // Transform the results to include only the necessary language strings
      const transformedCities = cities.map((city) => ({
        id: city.id,
        name: isFrench ? city.lang.fr_string : city.lang.en_string, // City name in the requested language
        latitude: city.latitude, // Include latitude
        longitude: city.longitude, // Include longitude
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
          latitude: state.latitude, // Include latitude
          longitude: state.longitude, // Include longitude
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
// export const getCitiesByState = async (req, res) => {
//   try {
//     const { stateName, lang } = req.body; // Extract stateName and lang from the request body

//     if (!stateName) {
//       return response.error(res, res.__('messages.stateNameRequired')); // Error if stateName is missing
//     }

//     const isFrench = lang === 'fr'; // Determine the requested language

//     // Fetch state by name (match on lang table)
//     const state = await prisma.states.findFirst({
//       where: {
//         is_deleted: false, // Ensure the state is not soft-deleted
//         lang: {
//           OR: [
//             { fr_string: isFrench ? stateName : null }, // Match French name if lang is 'fr'
//             { en_string: !isFrench ? stateName : null }, // Match English name otherwise
//           ],
//         },
//       },
//     });

//     if (!state) {
//       return response.error(res, res.__('messages.stateNotFound')); // Error if no state matches the name
//     }

//     // Check if the state has a valid language translation
//     if (!state.lang_id) {
//       return response.error(res, res.__('messages.stateLanguageNotFound')); // Error if state doesn't have language translations
//     }

//     // Fetch cities for the state
//    const cities = await prisma.cities.findMany({
//     where: { state_id },
//     select: {
//         id: true,
//         latitude: true, // Include latitude
//         longitude: true, // Include longitude
//         lang: {
//         select: {
//             fr_string: isFrench,
//             en_string: !isFrench,
//         },
//         },
//         districts: {
//         select: {
//             id: true,
//             latitude: true, // Include district latitude
//             longitude: true, // Include district longitude
//             langTranslation: {
//             select: {
//                 fr_string: isFrench,
//                 en_string: !isFrench,
//             },
//             },
//         },
//         },
//     },
//     });

//     if (!cities.length) {
//       return response.error(res, res.__('messages.noCitiesFoundForState')); // Error if no cities are found
//     }

//     // Transform the results to include only the necessary language strings
//     const transformedCities = cities.map((city) => ({
//       id: city.id,
//       name: isFrench ? city.lang.fr_string : city.lang.en_string, // City name in the requested language
//       districts: city.districts.map((district) => ({
//         id: district.id,
//         // Safely check if langTranslation exists before accessing strings
//         name: district.langTranslation
//           ? (isFrench
//               ? district.langTranslation.fr_string // District name in the requested language
//               : district.langTranslation.en_string)
//           : null, // Return null if langTranslation is missing
//       })),
//     }));

//     // Include state details in the response
//     const result = {
//         state: {
//             id: state.id,
//             name: isFrench && state.lang ? state.lang.fr_string : state.lang?.en_string, // State name in requested language
//             latitude: state.latitude, // Include latitude
//             longitude: state.longitude, // Include longitude
//         },
//         cities: transformedCities, // Include transformed cities
//     };

//     return response.success(res, res.__('messages.citiesFetchedSuccessfully'), result); // Success response
//   } catch (error) {
//     console.error(error);
//     return response.error(res, res.__('messages.internalServerError'), { message: error.message }); // Server error
//   }
// };

// export const getCities = async (req, res) => {
//   try {
//     const { lang } = req.body; // Extract state_id and lang from the request body
//     const isFrench = lang === 'fr'; // Determine if the language is French

//     // Fetch cities related to the provided state_id
//     const cities = await prisma.cities.findMany({
//     where: { is_deleted: false },
//     select: {
//         id: true,
//         latitude: true,
//         longitude: true,
//         lang: {
//         select: {
//             fr_string: isFrench,
//             en_string: !isFrench,
//         },
//         },
//     },
//     });

//     if (!cities.length) {
//     return response.error(res, res.__('messages.noCitiesFoundForState'), null);
//     }

//     const transformedCities = cities.map((city) => ({
//     id: city.id,
//     name: city.lang?.fr_string || city.lang?.en_string,
//     latitude: city.latitude,
//     longitude: city.longitude,
//     }));

//     return response.success(
//       res,
//       res.__('messages.citiesFetchedSuccessfully'),
//       transformedCities
//     );
//   } catch (error) {
//     console.error('Error fetching cities:', error);
//     return response.error(res, res.__('messages.internalServerError'), {
//       message: error.message,
//       stack: error.stack,
//     }); // Server error
//   }
// };


export const getCities = async (req, res) => {
  try {
    const { lang } = req.body; // Extract lang from the request body

    // Check if lang is provided
    if (!lang) {
      return response.error(res, res.__('messages.languageRequired')); // Error if lang is missing
    }

    // Determine if the language is French
    const isFrench = lang === 'fr'; 

    // Fetch all cities with their corresponding states and districts
    const cities = await prisma.cities.findMany({
      where: {
        is_deleted: false, // Only fetch non-deleted cities
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        lang: {
          select: {
            fr_string: isFrench,
            en_string: !isFrench,
          },
        },
        states: {
          select: {
            id: true,
            lang: {
              select: {
                fr_string: isFrench,
                en_string: !isFrench,
              },
            },
            latitude: true,
            longitude: true,
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
      return response.error(res, res.__('messages.noCitiesFound')); // Error if no cities are found
    }

    // Transform the results to include only the necessary language strings
    const transformedCities = cities.map((city) => ({
      id: city.id,
      city_name: isFrench ? city.lang.fr_string : city.lang.en_string, // City name in the requested language
      latitude: city.latitude, // Include latitude
      longitude: city.longitude, // Include longitude
      state: {
        id: city.states.id,
        state_name: isFrench && city.states.lang ? city.states.lang.fr_string : city.states.lang?.en_string, // State name in the requested language
        latitude: city.states.latitude, // Include state latitude
        longitude: city.states.longitude, // Include state longitude
      },
      districts: city.districts.map((district) => ({
        id: district.id,
        district_name: isFrench && district.langTranslation ? district.langTranslation.fr_string : district.langTranslation
          ? (isFrench
              ? district.langTranslation.fr_string
              : district.langTranslation.en_string)
          : null, // Handle missing translations
      })),
    }));

    return response.success(
      res,
      res.__('messages.citiesFetchedSuccessfully'),
      { cities: transformedCities } // Include transformed cities in the response
    ); // Success response
  } catch (error) {
    console.error('Error fetching cities:', error);
    return response.error(res, res.__('messages.internalServerError'), {
      message: error.message,
      stack: error.stack,
    }); // Server error
  }
};


export const getCityById = async (req, res) => {
  try {
    const { city_id, lang } = req.body;

    if (!city_id) {
      return response.error(res, res.__('messages.cityIdRequired'));
    }

    if (!isUuid(city_id)) {
      return response.error(res, res.__('messages.invalidCityIdFormat'));
    }

    const isFrench = lang === 'fr';

    const city = await prisma.cities.findUnique({
      where: { id: city_id },
      select: {
        id: true,
        lang: {
          select: {
            fr_string: true,
            en_string: true,
          },
        },
        latitude: true,
        longitude: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!city) {
      return response.error(res, res.__('messages.cityNotFound'));
    }

    const transformedCity = {
      id: city.id,
      name: isFrench
        ? city.lang?.fr_string || city.lang?.en_string || 'Unknown'
        : city.lang?.en_string || city.lang?.fr_string || 'Unknown',
      latitude: city.latitude,
      longitude: city.longitude,
      created_at: city.created_at,
      updated_at: city.updated_at,
    };

    return response.success(res, res.__('messages.cityFetchedSuccessfully'), transformedCity);
  } catch (error) {
    console.error('Error fetching city:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message });
  }
};

export const updateCity = async (req, res) => {
  try {
    const { city_id, state_id, en_name, fr_name, latitude, longitude } = req.body;

    // Check if city_id is provided
    if (!city_id) {
      return response.error(res, res.__('messages.cityIdRequired'));
    }

    // Validate the Authorization token
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, res.__('messages.authTokenRequired'));
    }

    const token = authHeader.split(' ')[1];
    let userId;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id; // Extract user ID from the token
    } catch (error) {
      return response.error(res, res.__('messages.invalidToken'));
    }

    // Find the existing city
    const city = await prisma.cities.findUnique({
      where: { id: city_id, is_deleted: false },
    });

    if (!city) {
      return response.error(res, res.__('messages.cityNotFound'));
    }

    // Check if state_id is provided and exists in the states table
    if (state_id) {
      const stateExists = await prisma.states.findUnique({
        where: { id: state_id },
      });

      if (!stateExists) {
        return response.error(res, res.__('messages.stateNotFound'));
      }
    }

    // Handle language translation
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

    // Update the city with new data
    const updatedCity = await prisma.cities.update({
      where: { id: city.id },
      data: {
        state_id: state_id || city.state_id, // Only update if state_id is provided
        lang_id: langTranslation ? langTranslation.id : city.lang_id,
        latitude: latitude !== undefined ? latitude : city.latitude,
        longitude: longitude !== undefined ? longitude : city.longitude,
        updated_by: userId,
        updated_at: new Date(),
      },
    });

    // Prepare response data
    const responseData = {
      id: updatedCity.id,
      state: langTranslation ? (res.getLocale() === 'fr' ? langTranslation.fr_string : langTranslation.en_string) : city.lang_id,
      is_deleted: updatedCity.is_deleted,
      created_at: updatedCity.created_at,
      updated_at: updatedCity.updated_at,
      created_by: updatedCity.created_by,
      updated_by: updatedCity.updated_by,
      latitude: updatedCity.latitude,
      longitude: updatedCity.longitude,
    };

    // Return success response
    return response.success(
      res,
      res.__('messages.cityUpdatedSuccessfully'),
      responseData
    );
  } catch (error) {
    console.error('Error in updateCity:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message });
  }
};


export const deleteCity = async (req, res) => {
  try {
    const { city_id } = req.body;

    if (!city_id) {
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

    const city = await prisma.cities.findUnique({
      where: { id: city_id, is_deleted: false },
    });

    if (!city) {
      return response.error(res, res.__('messages.cityNotFound'));
    }

    const associatedDistricts = await prisma.districts.count({
      where: { city_id: city_id, is_deleted: false },
    });

    if (associatedDistricts > 0) {
      return response.error(res, res.__('messages.cityNotDeleteDueToDistricts'));
    }

    await prisma.cities.delete({
      where: { id: city_id },
    });

    return response.success(res, res.__('messages.cityDeletedSuccessfully'), { city_id });
  } catch (error) {
    console.error('Error in deleteCity:', error);
    return response.error(res, res.__('messages.internalServerError'), { message: error.message });
  }
};
