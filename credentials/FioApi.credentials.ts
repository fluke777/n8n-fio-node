import {
	type Icon,
	type ICredentialType,
	type INodeProperties,
} from 'n8n-workflow';

export const FIO_CREDENTIALS_NAME = 'fioCredentials';

export class FioApi implements ICredentialType {
	name = FIO_CREDENTIALS_NAME;

	displayName = 'Fio Credentials API';

	icon: Icon = { light: 'file:../icons/fioLight.svg', dark: 'file:../icons/fioDark.svg' };

	documentationUrl = 'https://github.com/fluke777/n8n-fio-node';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}