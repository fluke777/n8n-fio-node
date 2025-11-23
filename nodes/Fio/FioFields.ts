import { type INodeProperties } from 'n8n-workflow';

export const FioOperationsFields: INodeProperties[] = [

    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
        },
        options: [
            {
                name: 'Get Balance',
                value: 'getBalance',
                description: 'Get account balance',
                action: 'Get account balance',
            },
            {
                name: 'Get Transactions',
                value: 'getTransactions',
                description: 'Get transactions for a period',
                action: 'Get transactions',
            },
            {
                name: 'Payment',
                value: 'payment',
                description: 'Make a payment',
                action: 'Make a payment',
            },
        ],
        default: 'getBalance',
    }
]


export const FioTransactionsFields: INodeProperties[] = [
    {
        displayName: 'Date From',
        name: 'transactionsDateFrom',
        type: 'dateTime',
        displayOptions: {
            show: {
                operation: ['getTransactions'],
            },
        },
        default: '={{$now.minus({days: 7}).toISODate()}}',
        description: 'Start date for transaction period (defaults to 7 days ago)',
    },
    {
        displayName: 'Date To',
        name: 'transactionsDateTo',
        type: 'dateTime',
        displayOptions: {
            show: {
                operation: ['getTransactions'],
            },
        },
        default: '={{$now.toISODate()}}',
        description: 'End date for transaction period (defaults to today)',
    }
]


export const FioPaymentFields: INodeProperties[] = [
    {
        displayName: 'Payment Source',
        name: 'paymentSource',
        type: 'options',
        displayOptions: {
            show: {
                operation: ['payment'],
            },
        },
        options: [
            {
                name: 'Define Below',
                value: 'manual',
                description: 'Set payment details manually',
            },
            {
                name: 'Use Input Data',
                value: 'input',
                description: 'Use data from previous node',
            },
        ],
        default: 'manual',
    },
    {
        displayName: 'Account From',
        name: 'accountFrom',
        required: true,
        type: 'string',
        displayOptions: {
            show: {
                operation: ['payment'],
                paymentSource: ['manual'],
            },
        },
        default: '',
        placeholder: '',
    },
    {
        displayName: 'Account To',
        name: 'accountTo',
        required: true,
        type: 'string',
        displayOptions: {
            show: {
                operation: ['payment'],
                paymentSource: ['manual'],
            },
        },
        default: '',
        placeholder: '',
        description: 'Recipient account number',
    },
    {
        displayName: 'Bank Code',
        name: 'bankCode',
        required: true,
        type: 'string',
        displayOptions: {
            show: {
                operation: ['payment'],
                paymentSource: ['manual'],
            },
        },
        default: '',
        placeholder: '',
    },
    {
        displayName: 'Amount',
        name: 'amount',
        required: true,
        type: 'number',
        displayOptions: {
            show: {
                operation: ['payment'],
                paymentSource: ['manual'],
            },
        },
        default: '',
        placeholder: '100.00',
        description: 'Payment amount',
    },
    {
        displayName: 'Currency',
        name: 'currency',
        required: true,
        type: 'string',
        displayOptions: {
            show: {
                operation: ['payment'],
                paymentSource: ['manual'],
            },
        },
        default: '',
        placeholder: 'CZK',
    },
    {
        displayName: 'Date',
        name: 'date',
        required: true,
        type: 'dateTime',
        displayOptions: {
            show: {
                operation: ['payment'],
                paymentSource: ['manual'],
            },
        },
        default: '={{$now.toISODate()}}',
        description: 'Payment date',
    },
    {
        displayName: 'Message for Recipient',
        name: 'messageForRecipient',
        type: 'string',
        displayOptions: {
            show: {
                operation: ['payment'],
                paymentSource: ['manual'],
            },
        },
        default: '',
        placeholder: '',
    }
];