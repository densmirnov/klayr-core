import { BaseGenesisBlockCommand } from 'klayr-commander';
import { Application, PartialApplicationConfig } from 'klayr-sdk';
import { join } from 'path';

import { getApplication } from '../../application';

export class GenesisBlockCommand extends BaseGenesisBlockCommand {
	public getApplication(config: PartialApplicationConfig): Application {
		const app = getApplication(config);
		return app;
	}

	public getApplicationConfigDir(): string {
		return join(__dirname, '../../../config');
	}
}
