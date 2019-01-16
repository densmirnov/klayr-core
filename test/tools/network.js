const output = require('codeceptjs').output;
const fs = require('fs');
const path = require('path');
const { from, chunkArray, config } = require('../../utils');

const I = actor();
const configPath = () => path.resolve(__dirname, '../../fixtures/config.json');

const splitDelegatesByPeers = (delegates, peers) => {
	if (peers.length) {
		output.print(
			'\n',
			'***********Please run npm run tools:peers:config to generate peer list*************',
			'\n'
		);
		process.exit(1);
	}

	if (peers.length > 101) {
		peers.splice(101);
	}

	const chunkSize = Math.ceil(delegates.length / peers.length);
	const delegateList = chunkArray(delegates, chunkSize);
	return delegateList;
};

const updateForgingStatus = async ({ ipAddress, delegateList, isEnable, defaultPassword }) => {
	const api = await I.call();
	return delegateList.map(async delegate => {
		const params = {
			forging: isEnable,
			password: defaultPassword,
			publicKey: delegate.publicKey,
		};

		const { result, error } = await from(
			api.updateForgingStatus(params, ipAddress)
		);
		expect(error).to.be.null;
		expect(result.data[0].forging).to.deep.equal(isEnable);
	});
};

const enableDisableDelegates = (api, isEnable) => {
	const enableOrDisable = isEnable ? 'enable' : 'disable';

	try {
		const {
			peers,
			forging: { defaultPassword, delegates },
		} = config;

		const peerDelegateList = splitDelegatesByPeers(delegates, peers);

		peerDelegateList.forEach((ipAddress, i) => {
			const delegateList = peerDelegateList[i];

			output.print(
				`${
				delegateList[i].length
				} delegates ${enableOrDisable}d to on node ===> ${ipAddress}`,
				'\n'
			);

			return updateForgingStatus({
				api,
				ipAddress,
				delegateList,
				isEnable,
				defaultPassword,
			});
		});
	} catch (error) {
		output.error(`Failed to ${enableOrDisable} forging due to error: `, error);
		process.exit(1);
	}
};

const checkIfAllPeersConnected = async () => {
	const allPeers = await I.getAllPeers(100, 0);
	const expectPeerCount = process.env.NODES_PER_REGION * 10 - 1;

	output.print(
		`Number of peers connected in network: ${
		allPeers.length
		}, Expected peers: ${expectPeerCount}`
	);

	while (allPeers.length >= expectPeerCount) {
		return true;
	}
	return checkIfAllPeersConnected();
};

Feature('Network tools');

Scenario('Peer list @peers_list', async () => {
	try {
		const allPeers = await I.getAllPeers(100, 0);
		output.print('Peers config list: ', JSON.stringify(allPeers, null, '\t'));
	} catch (error) {
		output.print('Failed to get peers list: ');
		output.error(error);
		process.exit(1);
	}
});

Scenario('Add peers to config @peers_config', async () => {
	try {
		const configBuffer = fs.readFileSync(configPath());
		const configContent = JSON.parse(configBuffer);
		const allPeers = await I.getAllPeers(100, 0);
		const requiredPeers = allPeers.slice(0, 101).map(p => p.ip);
		const unionNodes = new Set([
			...configContent.peers,
			...requiredPeers,
		]);

		configContent.peers.push(...unionNodes);
		fs.writeFileSync(configPath, JSON.stringify(configContent));

		output.print(
			`Updated ${requiredPeers.length} peers to config file: ${configPath}`,
			JSON.stringify(requiredPeers, null, '\t')
		);
	} catch (error) {
		output.error('Failed to add peers to config: ', error);
		process.exit(1);
	}
});

Scenario('Add peers to config @peers_connected', async () => {
	await checkIfAllPeersConnected();
});

Scenario('Enable delegates @delegates_enable', async () => {
	enableDisableDelegates(true);
});

Scenario('Disable delegates @delegates_disable', async () => {
	enableDisableDelegates(false);
});
