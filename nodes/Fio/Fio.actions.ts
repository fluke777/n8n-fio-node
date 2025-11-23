const BASE_URL = 'https://fioapi.fio.cz/v1/rest';

class FioAPIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FioAPIError";
    }
}



import {
    type RequestHelperFunctions,
    type IHttpRequestOptions,
    type IDataObject,
} from 'n8n-workflow';
import { parsePaymentResponse, PaymentInterface, preparePaymentXMLPayload, processBalanceData, processPaymentData } from './FioUtils';

export async function getBalance(token: string, helpers: RequestHelperFunctions): Promise<IDataObject> {
    const today = new Date();
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];
    const url = `${BASE_URL}/periods/${token}/${dateFrom}/${dateTo}/transactions.json`;
    const options: IHttpRequestOptions = {
        method: 'GET',
        url: url,
    };

    try {
        const requestData = await helpers.httpRequest(options);
        return processBalanceData(requestData);
    } catch (error) {
        throw new FioAPIError(`Failed to get balance: ${error.message}`);
    }
}

export async function getTransactions(token: string, dateFrom: string, dateTo: string, helpers: RequestHelperFunctions): Promise<IDataObject[]> {
    const url = `${BASE_URL}/periods/${token}/${dateFrom}/${dateTo}/transactions.json`;

    const options: IHttpRequestOptions = {
        method: 'GET',
        url: url,
    };

    try {
        const requestData = await helpers.httpRequest(options);
        return processPaymentData(requestData);
    } catch (error) {
        throw new FioAPIError(`Failed to get transactions: ${error.message}`);
    }


}


export async function makePayment(token: string, paymentData: PaymentInterface, helpers: RequestHelperFunctions): Promise<IDataObject> {

    const { formDataBody, boundary } = preparePaymentXMLPayload(paymentData, token);

    let response;
    try {
        response = await helpers.httpRequest({
            method: 'POST',
            url: `${BASE_URL}/import/`,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: formDataBody,
            returnFullResponse: true,
        });
        if (!response) {
            throw new Error('Empty response from Fio API');
        }

        // Parse the XML response
        return await parsePaymentResponse(response.body);
    } catch (error) {
        throw new Error(`Payment creation failed: ${error}`);
    }

}