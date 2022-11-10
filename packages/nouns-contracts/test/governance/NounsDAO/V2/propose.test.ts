import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import {
  NounsBRDAOLogicV2,
  NounsBRToken,
  NounsBRDescriptorV2__factory as NounsBRDescriptorV2Factory,
} from '../../../../typechain';
import {
  address,
  blockNumber,
  deployGovernorV2WithV2Proxy,
  deployNounsBRToken,
  encodeParameters,
  getSigners,
  populateDescriptorV2,
  setTotalSupply,
  TestSigners,
} from '../../../utils';

chai.use(solidity);
const { expect } = chai;

let token: NounsBRToken;
let deployer: SignerWithAddress;
let gov: NounsBRDAOLogicV2;
let signers: TestSigners;

const votingDelay = 5;
const votingPeriod = 5760;
const proposalThresholdBPs = 1000; // 10%
const MIN_QUORUM_VOTES_BPS = 2000; // 20%
const MAX_QUORUM_VOTES_BPS = 4000; // 40%

describe('NounsBRDAOV2#propose', async () => {
  before(async () => {
    signers = await getSigners();
    deployer = signers.deployer;
    token = await deployNounsBRToken(signers.deployer);

    await populateDescriptorV2(
      NounsBRDescriptorV2Factory.connect(await token.descriptor(), signers.deployer),
    );

    await setTotalSupply(token, 10);
    gov = await deployGovernorV2WithV2Proxy(
      deployer,
      token.address,
      deployer.address,
      deployer.address,
      votingPeriod,
      votingDelay,
      proposalThresholdBPs,
      {
        minQuorumVotesBPS: MIN_QUORUM_VOTES_BPS,
        maxQuorumVotesBPS: MAX_QUORUM_VOTES_BPS,
        quorumCoefficient: 0,
      },
    );
  });

  it('emits ProposalCreatedWithRequirements', async () => {
    const targets = [address(0)];
    const values = ['0'];
    const signatures = ['getBalanceOf(address)'];
    const callDatas = [encodeParameters(['address'], [address(0)])];

    const blockNum = await blockNumber();

    await expect(
      gov.connect(deployer).propose(targets, values, signatures, callDatas, 'do nothing'),
    )
      .to.emit(gov, 'ProposalCreatedWithRequirements')
      .withArgs(
        1,
        deployer.address,
        targets,
        values,
        signatures,
        callDatas,
        votingDelay + blockNum + 1,
        votingPeriod + votingDelay + blockNum + 1,
        1,
        2,
        'do nothing',
      );
  });
});
