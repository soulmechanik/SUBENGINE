const axios = require('axios');
require('dotenv').config();

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function getBankList() {
  try {
    const response = await axios.get(`${PAYSTACK_BASE_URL}/bank?country=nigeria&type=nuban`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    return response.data.data; // array of banks
  } catch (error) {
    console.error('Error fetching Paystack bank list:', error.message);
    throw error;
  }
}

async function resolveAccount({ account_number, bank_code }) {
  console.log('Resolving account with:', account_number, bank_code); // Add this

  if (!account_number || !bank_code) {
    throw new Error('Account number and bank code are required');
  }

  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank/resolve`,
      {
        params: { account_number, bank_code },
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    console.error('Error resolving Paystack account:', error.response?.data || error.message);
    throw error;
  }
}


module.exports = {
  getBankList,
  resolveAccount,
};
