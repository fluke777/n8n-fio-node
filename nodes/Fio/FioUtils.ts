import {
    type IDataObject,
    type IExecuteFunctions
} from 'n8n-workflow';


interface FioColumnData {
    value: number | string;  // Could be number or string depending on the field
    name: string;           // Description in Czech
    id: number;             // Column ID
}

const COLUMN_MAPPING: { [key: string]: string } = {
    column22: "transactionId",
    column0: "transactionDate",
    column1: "amount",
    column14: "currency",
    column2: "counterAccountNumber",
    column10: "counterAccountName",
    column3: "counterBankCode",
    column12: "counterBankName",
    column4: "constantSymbol",
    column5: "variableSymbol",
    column6: "specificSymbol",
    column7: "userIdentification",
    column16: "messageForRecipient",
    column8: "transactionType",
    column9: "executedBy",
    column18: "specification",
    column25: "comment",
    column26: "counterAccountBic",
    column17: "instructionId",
    column27: "payerReference"
};

interface TransactionResponseData {
    accountStatement: {
        transactionList: {
            transaction: IDataObject[];
        };
    };
}

export function processPaymentData(requestData: TransactionResponseData): IDataObject[] {
    // Todo better define type
    const transactionsData = requestData.accountStatement.transactionList.transaction;

    const mappedTransactions = transactionsData.map((tx: IDataObject) => {
        const mappedTx: IDataObject = {};
        for (const key in tx) {

            if (COLUMN_MAPPING[key]) {
                const data = tx[key] as FioColumnData;
                mappedTx[COLUMN_MAPPING[key]] = data?.value;
            }
        }
        return mappedTx;
    });
    return mappedTransactions;
}

interface BalanceResponsetData {
    accountStatement: {
        info: {
            closingBalance: number;
            currency: string;
            accountId: string;
            bankId: string;
            iban: string;
            bic: string;
            dateFrom: string;
            dateTo: string;
        };
    };
}

export function processBalanceData(requestData: BalanceResponsetData): IDataObject {
    // Todo better define type
    const info = requestData.accountStatement.info;
    const balanceData = {
        balance: info.closingBalance,
        currency: info.currency,
        accountId: info.accountId,
        bankId: info.bankId,
        iban: info.iban,
        bic: info.bic,
        dateFrom: info.dateFrom,
        date: info.dateTo,
    };
    return balanceData;
}

export interface PaymentInterface {
    accountFrom: string;
    accountTo: string;
    bankCode: string;
    amount: number;
    date: string;
    messageForRecipient?: string;
    currency: string;
}

export async function parsePaymentInputData(obj: IExecuteFunctions, index: number, inputData: IDataObject)  {
    const paymentSource = obj.getNodeParameter('paymentSource', index) as string;
    let paymentData: IDataObject;
    
    if (paymentSource === 'manual') {
        const paymentDate = obj.getNodeParameter('date', index) as string;
        paymentData = {
            accountFrom: obj.getNodeParameter('accountFrom', index),
            accountTo: obj.getNodeParameter('accountTo', index),
            bankCode: obj.getNodeParameter('bankCode', index),
            amount: obj.getNodeParameter('amount', index),
            date: paymentDate.split('T')[0],
            messageForRecipient: obj.getNodeParameter('messageForRecipient', index),
            currency: obj.getNodeParameter('currency', index),
        }
    } else {
        paymentData = {
            accountFrom: inputData.accountFrom,
            accountTo: inputData.accountTo,
            bankCode: inputData.bankCode,
            amount: inputData.amount,
            date: inputData.date,
            messageForRecipient: inputData.messageForRecipient,
            currency: inputData.currency,
        };
    }
    return paymentData;
}

export function validatePayementData(paymentData: IDataObject): PaymentInterface {
    const requiredFields = [
        'accountFrom',
        'accountTo',
        'bankCode',
        'amount',
        'date',
        'currency',
    ];

    for (const field of requiredFields) {
        if (!paymentData[field]) {
            throw new Error(`Payment data is missing required field: ${field}`);
        }
    }

    // Convert amount to number and validate
    const amount = Number(paymentData.amount);
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Payment amount must be a positive number');
    }

    // Return properly typed PaymentInterface object
    return {
        accountFrom: String(paymentData.accountFrom),
        accountTo: String(paymentData.accountTo),
        bankCode: String(paymentData.bankCode),
        amount: amount,
        date: String(paymentData.date),
        currency: String(paymentData.currency),
        messageForRecipient: paymentData.messageForRecipient ? String(paymentData.messageForRecipient) : undefined,
    };
}


export function preparePaymentXMLPayload(validatedPaymentData: PaymentInterface, apiToken: string): { formDataBody: string; boundary: string } {
    const boundary = '----formdata-n8n-' + Math.random().toString(36);

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Import xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.fio.cz/schema/importIB.xsd">
    <Orders>
        <DomesticTransaction>
            <accountFrom>${validatedPaymentData.accountFrom}</accountFrom>
            <currency>${validatedPaymentData.currency}</currency>
            <amount>${validatedPaymentData.amount}</amount>
            <accountTo>${validatedPaymentData.accountTo}</accountTo>
            <bankCode>${validatedPaymentData.bankCode}</bankCode>
            <ks></ks>
            <vs></vs>
            <ss></ss>
            <date>${validatedPaymentData.date}</date>
            <messageForRecipient>${validatedPaymentData.messageForRecipient}</messageForRecipient>
            <comment></comment>
            <paymentType>431001</paymentType>
        </DomesticTransaction>
    </Orders>
</Import>`.trim();

    // Create boundary for multipart data
    // const boundary = '----formdata-n8n-' + Math.random().toString(36);
    const formDataBody = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="type"',
        '',
        'xml',
        `--${boundary}`,
        `Content-Disposition: form-data; name="token"`,
        '',
        apiToken,
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="payment.xml"',
        'Content-Type: text/xml',
        '',
        xmlContent,
        `--${boundary}--`,
    ].join('\r\n');

    return { formDataBody, boundary };
}

export function parsePaymentResponse(xmlResponse: string): IDataObject {
    // Helper function to extract text content between XML tags
    const extractValue = (xmlString: string, tagName: string): string => {
        const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
        const match = xmlString.match(regex);
        return match ? match[1].trim() : '';
    };
    
    // Helper function to extract numeric value
    const extractNumber = (xmlString: string, tagName: string): number => {
        const text = extractValue(xmlString, tagName);
        return text ? parseFloat(text) : 0;
    };
    
    const basicInfo = {
        errorCode: extractValue(xmlResponse, 'errorCode'),
        idInstruction: extractValue(xmlResponse, 'idInstruction'),
        status: extractValue(xmlResponse, 'status'),
        sumCredit: extractNumber(xmlResponse, 'sumCredit'),
        sumDebet: extractNumber(xmlResponse, 'sumDebet'),
        messages: extractValue(xmlResponse, 'message')
    };
    
    return basicInfo;
}