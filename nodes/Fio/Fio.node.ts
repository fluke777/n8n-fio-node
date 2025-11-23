import {
    type IExecuteFunctions,
    type INodeExecutionData,
    type INodeType,
    type INodeTypeDescription,
    type IDataObject,
} from 'n8n-workflow';
import { validatePayementData, parsePaymentInputData } from './FioUtils';
import { getBalance, getTransactions, makePayment } from './Fio.actions';
import { FioTransactionsFields, FioPaymentFields, FioOperationsFields } from './FioFields';
import { FIO_CREDENTIALS_NAME } from '../../credentials/FioApi.credentials';

export class Fio implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Fio',
        name: 'fio',
        icon: 'file:../../icons/fioLight.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Fio API',
        usableAsTool: true,
        defaults: {
            name: 'Fio',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: FIO_CREDENTIALS_NAME,
                required: true,
            },
        ],
        properties: [
            ...FioOperationsFields,

            // Transaction fields
            ...FioTransactionsFields,


            // Payment fields
            ...FioPaymentFields
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials(FIO_CREDENTIALS_NAME);
        const apiToken = credentials.apiToken as string;

        for (let i = 0; i < items.length; i++) {
            const inputData = items[i].json;
            const operation = this.getNodeParameter('operation', i) as string;

            let responseData;

            try {

                if (operation === 'getBalance') {
                    responseData = await getBalance(apiToken, this.helpers);
                }

                if (operation === 'getTransactions') {
                    const dateFrom = this.getNodeParameter('transactionsDateFrom', i) as string;
                    const dateTo = this.getNodeParameter('transactionsDateTo', i) as string;
                    responseData = await getTransactions(apiToken, dateFrom, dateTo, this.helpers);
                }

                if (operation === 'payment') {
                    const paymentData = await parsePaymentInputData(this, i, inputData);
                    const validatedPaymentData = validatePayementData(paymentData);
                    responseData = await makePayment(apiToken, validatedPaymentData, this.helpers);
                }

                const executionData = this.helpers.constructExecutionMetaData(
                    this.helpers.returnJsonArray(responseData as IDataObject),
                    { itemData: { item: i } },
                );

                returnData.push(...executionData);
            } catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(
                        this.helpers.returnJsonArray({ error: error.message }),
                        { itemData: { item: i } },
                    );
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}