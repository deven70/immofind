import { PrismaClient } from '@prisma/client';
import response from "../components/utils/response.js";
import { validate as isUuid } from 'uuid';
const prisma = new PrismaClient();



export const createCurrency = async (req, res) => {
    try {
      const { symbol, name, status } = req.body;

      if (!symbol || !name) {
        return await response.error(res, res.__('messages.fieldError'));
      }
  
      const existingCurrency = await prisma.currency.findUnique({
        where: { symbol },
      });
  
      if (existingCurrency) {
        return await response.error(
          res,
          res.__('messages.currencyAlreadyExists'),
          { existingCurrency }
        );
      }

      const currency = await prisma.currency.create({
        data: {
          symbol,
          name,
          status: status !== undefined ? status : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
  
      return await response.success(
        res,
        res.__('messages.currencyCreatedSuccessfully'),
        currency
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



  export const getCurrency = async (req, res) => {
    try {
      const currencies = await prisma.currency.findMany({
        select: {
          id: true,
          symbol: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
  
      if (!currencies.length) {
        return res.status(404).json({
          success: false,
          message: res.__('messages.currencyNotFound'),
        });
      }
  
      const formattedCurrencies = currencies.map((currency) => ({
        id: currency.id,
        symbol: currency.symbol,
        name: currency.name,
        status: currency.status,
        createdAt: currency.createdAt,
        updatedAt: currency.updatedAt,
      }));
  
      return res.status(200).json({
        success: true,
        message: res.__('messages.currencyListedSuccessfully'),
        data: formattedCurrencies,
      });
    } catch (error) {
      console.error('Error fetching currencies:', error);
      return res.status(500).json({
        success: false,
        message: res.__('messages.internalServerError'),
        error: error.message,
      });
    }
  };
  





  export const updateCurrency = async (req, res) => {
    try {
      const { id } = req.params;
      const { symbol, name, status, type } = req.body;

      if (!id) {
        return await response.error(res, res.__('messages.missingCurrencyId'));
      }
  
      const existingCurrency = await prisma.currency.findUnique({
        where: { id },
      });
  
      if (!existingCurrency) {
        return await response.error(
          res,
          res.__('messages.currencyNotFound')
        );
      }

      const updateData = {};
      if (symbol !== undefined) updateData.symbol = symbol;
      if (name !== undefined) updateData.name = name;
      if (status !== undefined) updateData.status = status;
      if (type !== undefined) updateData.type = type;
  
      const updatedCurrency = await prisma.currency.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });
  
      return await response.success(
        res,
        res.__('messages.currencyUpdatedSuccessfully'),
        updatedCurrency
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
  

  export const deleteCurrency = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id) {
        return res.status(400).json({
          success: false,
          message: res.__('messages.missingCurrencyId'),
        });
      }
  
      const existingCurrency = await prisma.currency.findUnique({
        where: { id },
      });
  
      if (!existingCurrency) {
        return res.status(404).json({
          success: false,
          message: res.__('messages.currencyNotFound'),
        });
      }
  
      await prisma.currency.delete({
        where: { id },
      });
  
      return res.status(200).json({
        success: true,
        message: res.__('messages.currencyDeletedSuccessfully'),
      });
    } catch (error) {
      console.error('Error deleting currency:', error);
      return res.status(500).json({
        success: false,
        message: res.__('messages.internalServerError'),
        error: error.message,
      });
    }
  };