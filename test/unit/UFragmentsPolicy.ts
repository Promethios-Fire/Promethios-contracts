import { ethers, upgrades, waffle } from 'hardhat'
import { Contract, Signer, BigNumber, BigNumberish, Event } from 'ethers'
import { TransactionResponse } from '@ethersproject/providers'
import { expect } from 'chai'
import { Result, formatEther, parseEther } from 'ethers/lib/utils'
import { imul, increaseTime } from '../utils/utils'

let uFragmentsPolicy: Contract,
  mockUFragments: Contract,
  mockMarketOracle: Contract,
  mockOperatorManager: Contract
let prevEpoch: BigNumber, prevTime: BigNumber
let deployer: Signer, user: Signer, operator: Signer

const MAX_RATE = ethers.utils.parseUnits('1', 24)
const MAX_SUPPLY = ethers.BigNumber.from(2).pow(255).sub(1).div(MAX_RATE)
const TARGET_RATE = parseEther('0.01')
const INITIAL_RATE = parseEther('0.01')
const INITIAL_RATE_30P_MORE = imul(INITIAL_RATE, '1.3', 1)
const INITIAL_RATE_30P_LESS = imul(INITIAL_RATE, '0.7', 1)
const INITIAL_RATE_5P_MORE = imul(INITIAL_RATE, '1.05', 1)
const INITIAL_RATE_5P_LESS = imul(INITIAL_RATE, '0.95', 1)
const INITIAL_RATE_60P_MORE = imul(INITIAL_RATE, '1.6', 1)
const INITIAL_RATE_50P_LESS = imul(INITIAL_RATE, '0.5', 1)
const INITIAL_RATE_2X = INITIAL_RATE.mul(2)

async function mockedUpgradablePolicy() {
  // get signers
  const [deployer, user, operator] = await ethers.getSigners()
  // deploy mocks
  const mockUFragments = await (
    await ethers.getContractFactory('MockUFragments')
  )
    .connect(deployer)
    .deploy()
  const mockMarketOracle = await (await ethers.getContractFactory('MockOracle'))
    .connect(deployer)
    .deploy('MarketOracle')

  mockOperatorManager = await (
    await ethers.getContractFactory('OperatorManager')
  )
    .connect(deployer)
    .deploy()

  // deploy upgradable contract
  const uFragmentsPolicy = await upgrades.deployProxy(
    (await ethers.getContractFactory('UFragmentsPolicy')).connect(deployer),
    [
      await deployer.getAddress(),
      mockUFragments.address,
      TARGET_RATE.toString(),
      mockOperatorManager.address,
    ],
    {
      initializer: 'initialize(address,address,uint256,address)',
    },
  )
  // setup oracles
  await uFragmentsPolicy
    .connect(deployer)
    .setMarketOracle(mockMarketOracle.address)
  await mockOperatorManager.connect(deployer).addOperator(deployer.address)

  await mockOperatorManager.connect(deployer).addOperator(operator.address)
  // return entities
  return {
    deployer,
    user,
    operator,
    mockUFragments,
    mockMarketOracle,
    uFragmentsPolicy,
    mockOperatorManager,
  }
}

async function mockedUpgradablePolicyWithOpenRebaseWindow() {
  const {
    deployer,
    user,
    operator,
    mockUFragments,
    mockMarketOracle,
    uFragmentsPolicy,
    mockOperatorManager,
  } = await mockedUpgradablePolicy()
  await uFragmentsPolicy.connect(deployer).setRebaseTimingParameters(60, 0, 60)
  await mockOperatorManager.connect(deployer).addOperator(deployer.address)
  await mockOperatorManager.connect(deployer).addOperator(operator.address)
  return {
    deployer,
    user,
    operator,
    mockUFragments,
    mockMarketOracle,
    uFragmentsPolicy,
    mockOperatorManager,
  }
}

async function mockExternalData(
  rate: BigNumberish,
  uFragSupply: BigNumberish,
  rateValidity = true,
) {
  await mockMarketOracle.connect(deployer).storeData(rate)
  await mockMarketOracle.connect(deployer).storeValidity(rateValidity)
  await mockUFragments.connect(deployer).storeSupply(uFragSupply)
}

async function parseRebaseLog(response: Promise<TransactionResponse>) {
  const receipt = (await (await response).wait()) as any
  const logs = receipt.events.filter(
    (event: Event) => event.event === 'LogRebase',
  )
  return logs[0].args
}

describe('UFragmentsPolicy', function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
      mockOperatorManager,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should reject any ether sent to it', async function () {
    await expect(
      user.sendTransaction({ to: uFragmentsPolicy.address, value: 1 }),
    ).to.be.reverted
  })
})

describe('UFragmentsPolicy:initialize', async function () {
  describe('initial values set correctly', function () {
    before('setup UFragmentsPolicy contract', async () => {
      ;({
        deployer,
        user,
        operator,
        mockUFragments,
        mockMarketOracle,
        uFragmentsPolicy,
        mockOperatorManager,
      } = await waffle.loadFixture(mockedUpgradablePolicy))
    })

    it('deviationThreshold', async function () {
      expect(await uFragmentsPolicy.deviationThreshold()).to.eq(
        ethers.utils.parseUnits('5', 16),
      )
    })
    it('rebaseLag', async function () {
      expect(await uFragmentsPolicy.rebaseLag()).to.eq(1)
    })
    it('minRebaseTimeIntervalSec', async function () {
      expect(await uFragmentsPolicy.minRebaseTimeIntervalSec()).to.eq(
        24 * 60 * 60,
      )
    })
    it('epoch', async function () {
      expect(await uFragmentsPolicy.epoch()).to.eq(0)
    })
    it('globalPromethiosEpochAndFIRESupply', async function () {
      const r = await uFragmentsPolicy.globalPromethiosEpochAndFIRESupply()
      expect(r[0]).to.eq(0)
      expect(r[1]).to.eq(0)
    })
    it('rebaseWindowOffsetSec', async function () {
      expect(await uFragmentsPolicy.rebaseWindowOffsetSec()).to.eq(7200)
    })
    it('rebaseWindowLengthSec', async function () {
      expect(await uFragmentsPolicy.rebaseWindowLengthSec()).to.eq(1200)
    })
    it('should set owner', async function () {
      expect(await uFragmentsPolicy.owner()).to.eq(await deployer.getAddress())
    })
    it('should set reference to uFragments', async function () {
      expect(await uFragmentsPolicy.uFrags()).to.eq(mockUFragments.address)
    })
  })
})

describe('UFragmentsPolicy:setMarketOracle', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set marketOracle', async function () {
    await uFragmentsPolicy
      .connect(deployer)
      .setMarketOracle(await deployer.getAddress())
    expect(await uFragmentsPolicy.marketOracle()).to.eq(
      await deployer.getAddress(),
    )
  })
})

describe('UFragments:setMarketOracle:accessControl', function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      uFragmentsPolicy
        .connect(deployer)
        .setMarketOracle(await deployer.getAddress()),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      uFragmentsPolicy
        .connect(user)
        .setMarketOracle(await deployer.getAddress()),
    ).to.be.reverted
  })
})

describe('UFragmentsPolicy:setTargetRate', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set setTargetRate', async function () {
    await uFragmentsPolicy.connect(deployer).setTargetRate(parseEther('1'))
    expect(await uFragmentsPolicy.targetRate()).to.eq(parseEther('1'))
  })
})

describe('UFragments:setTargetRate:accessControl', function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      uFragmentsPolicy.connect(deployer).setTargetRate(parseEther('1')),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(uFragmentsPolicy.connect(user).setTargetRate(parseEther('1')))
      .to.be.reverted
  })
})

describe('UFragmentsPolicy:setDeviationThreshold', async function () {
  let prevThreshold: BigNumber, threshold: BigNumber
  before('setup UFragmentsPolicy contract', async function () {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
    prevThreshold = await uFragmentsPolicy.deviationThreshold()
    threshold = prevThreshold.add(ethers.utils.parseUnits('1', 16))
    await uFragmentsPolicy.connect(deployer).setDeviationThreshold(threshold)
  })

  it('should set deviationThreshold', async function () {
    expect(await uFragmentsPolicy.deviationThreshold()).to.eq(threshold)
  })
})

describe('UFragments:setDeviationThreshold:accessControl', function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(uFragmentsPolicy.connect(deployer).setDeviationThreshold(0)).to
      .not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(uFragmentsPolicy.connect(user).setDeviationThreshold(0)).to.be
      .reverted
  })
})

describe('UFragmentsPolicy:CurveParameters', async function () {
  before('setup UFragmentsPolicy contract', async function () {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  describe('when rebaseFunctionGrowth is more than 0', async function () {
    it('should setRebaseFunctionGrowth', async function () {
      await uFragmentsPolicy.connect(deployer).setRebaseFunctionGrowth(1000)
      expect(await uFragmentsPolicy.rebaseFunctionGrowth()).to.eq(1000)
    })
  })

  describe('when rebaseFunctionGrowth is less than 0', async function () {
    it('should fail', async function () {
      await expect(
        uFragmentsPolicy.connect(deployer).setRebaseFunctionGrowth(-1),
      ).to.be.reverted
    })
  })

  describe('when rebaseFunctionLowerPercentage is more than 0', async function () {
    it('should fail', async function () {
      await expect(
        uFragmentsPolicy
          .connect(deployer)
          .setRebaseFunctionLowerPercentage(1000),
      ).to.be.reverted
    })
  })

  describe('when rebaseFunctionLowerPercentage is less than 0', async function () {
    it('should setRebaseFunctionLowerPercentage', async function () {
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseFunctionLowerPercentage(-1)
      expect(await uFragmentsPolicy.rebaseFunctionLowerPercentage()).to.eq(-1)
    })
  })

  describe('when rebaseFunctionUpperPercentage is less than 0', async function () {
    it('should fail', async function () {
      await expect(
        uFragmentsPolicy.connect(deployer).setRebaseFunctionUpperPercentage(-1),
      ).to.be.reverted
    })
  })

  describe('when rebaseFunctionUpperPercentage is more than 0', async function () {
    it('should setRebaseFunctionUpperPercentage', async function () {
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseFunctionUpperPercentage(1000)
      expect(await uFragmentsPolicy.rebaseFunctionUpperPercentage()).to.eq(1000)
    })
  })
})

describe('UFragments:setRebaseFunctionGrowth:accessControl', function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(uFragmentsPolicy.connect(deployer).setRebaseFunctionGrowth(1))
      .to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(uFragmentsPolicy.connect(user).setRebaseFunctionGrowth(1)).to
      .be.reverted
  })
})

describe('UFragments:setRebaseFunctionLowerPercentage:accessControl', function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      uFragmentsPolicy.connect(deployer).setRebaseFunctionLowerPercentage(-1),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      uFragmentsPolicy.connect(user).setRebaseFunctionLowerPercentage(-1),
    ).to.be.reverted
  })
})

describe('UFragments:setRebaseFunctionUpperPercentage:accessControl', function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      uFragmentsPolicy.connect(deployer).setRebaseFunctionUpperPercentage(1),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      uFragmentsPolicy.connect(user).setRebaseFunctionUpperPercentage(1),
    ).to.be.reverted
  })
})

describe('UFragmentsPolicy:setRebaseTimingParameters', async function () {
  before('setup UFragmentsPolicy contract', async function () {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  describe('when interval=0', function () {
    it('should fail', async function () {
      await expect(
        uFragmentsPolicy.connect(deployer).setRebaseTimingParameters(0, 0, 0),
      ).to.be.reverted
    })
  })

  describe('when offset > interval', function () {
    it('should fail', async function () {
      await expect(
        uFragmentsPolicy
          .connect(deployer)
          .setRebaseTimingParameters(300, 3600, 300),
      ).to.be.reverted
    })
  })

  describe('when params are valid', function () {
    it('should setRebaseTimingParameters', async function () {
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseTimingParameters(600, 60, 300)
      expect(await uFragmentsPolicy.minRebaseTimeIntervalSec()).to.eq(600)
      expect(await uFragmentsPolicy.rebaseWindowOffsetSec()).to.eq(60)
      expect(await uFragmentsPolicy.rebaseWindowLengthSec()).to.eq(300)
    })
  })
})

describe('UFragments:setRebaseTimingParameters:accessControl', function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      uFragmentsPolicy
        .connect(deployer)
        .setRebaseTimingParameters(600, 60, 300),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      uFragmentsPolicy.connect(user).setRebaseTimingParameters(600, 60, 300),
    ).to.be.reverted
  })
})

describe('UFragmentsPolicy:Rebase:accessControl', async function () {
  beforeEach('setup UFragmentsPolicy contract', async function () {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
      mockOperatorManager,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
    // await setupContractsWithOpenRebaseWindow()
    await mockExternalData(INITIAL_RATE_30P_MORE, 1000, true)
    await increaseTime(60)
  })

  describe('when rebase called by operator', function () {
    it('should succeed', async function () {
      await expect(uFragmentsPolicy.connect(deployer).rebase()).to.not.be
        .reverted
    })
  })

  describe('when rebase called by non-operator', function () {
    it('should fail', async function () {
      await expect(uFragmentsPolicy.connect(user).rebase()).to.be.reverted
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
      mockOperatorManager,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when minRebaseTimeIntervalSec has NOT passed since the previous rebase', function () {
    before(async function () {
      await mockExternalData(INITIAL_RATE_30P_MORE, 1010)
      await increaseTime(60)
      await uFragmentsPolicy.connect(operator).rebase()
    })

    it('should fail', async function () {
      await expect(uFragmentsPolicy.connect(operator).rebase()).to.be.reverted
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when rate is within deviationThreshold', function () {
    before(async function () {
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseTimingParameters(60, 0, 60)
    })

    it('should return 0', async function () {
      await mockExternalData(INITIAL_RATE.sub(1), 1000)
      await increaseTime(60)
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(0)
      await increaseTime(60)

      await mockExternalData(INITIAL_RATE.add(1), 1000)
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(0)
      await increaseTime(60)

      await mockExternalData(INITIAL_RATE_5P_MORE.sub(2), 1000)
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(deployer).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(0)
      await increaseTime(60)

      await mockExternalData(INITIAL_RATE_5P_LESS.add(2), 1000)
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(deployer).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(0)
      await increaseTime(60)
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when rate is more than MAX_RATE', function () {
    it('should return same supply delta as delta for MAX_RATE', async function () {
      // Any exchangeRate >= (MAX_RATE=100x) would result in the same supply increase
      await mockExternalData(MAX_RATE, 1000)
      await increaseTime(60)

      const supplyChange = (
        await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase())
      ).requestedSupplyAdjustment

      await increaseTime(60)

      await mockExternalData(
        MAX_RATE.add(ethers.utils.parseUnits('1', 17)),

        1000,
      )
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(supplyChange)

      await increaseTime(60)

      await mockExternalData(MAX_RATE.mul(2), 1000)
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(supplyChange)
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when uFragments grows beyond MAX_SUPPLY', function () {
    before(async function () {
      await mockExternalData(INITIAL_RATE_2X, MAX_SUPPLY.sub(1))
      await increaseTime(60)
    })

    it('should apply SupplyAdjustment {MAX_SUPPLY - totalSupply}', async function () {
      // Supply is MAX_SUPPLY-1, exchangeRate is 2x; resulting in a new supply more than MAX_SUPPLY
      // However, supply is ONLY increased by 1 to MAX_SUPPLY
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(1)
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when uFragments supply equals MAX_SUPPLY and rebase attempts to grow', function () {
    before(async function () {
      await mockExternalData(INITIAL_RATE_2X, MAX_SUPPLY)
      await increaseTime(60)
    })

    it('should not grow', async function () {
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(0)
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when the market oracle returns invalid data', function () {
    it('should fail', async function () {
      await mockExternalData(INITIAL_RATE_30P_MORE, 1000, false)
      await increaseTime(60)
      await expect(uFragmentsPolicy.connect(operator).rebase()).to.be.reverted
    })
  })

  describe('when the market oracle returns valid data', function () {
    it('should NOT fail', async function () {
      await mockExternalData(INITIAL_RATE_30P_MORE, 1000, true)
      await increaseTime(60)
      await expect(uFragmentsPolicy.connect(operator).rebase()).to.not.be
        .reverted
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('positive rate', function () {
    beforeEach(async function () {
      await mockExternalData(INITIAL_RATE_30P_MORE, 1000)
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseTimingParameters(60, 0, 60)
      await increaseTime(60)
      await uFragmentsPolicy.connect(operator).rebase()
      prevEpoch = await uFragmentsPolicy.epoch()
      prevTime = await uFragmentsPolicy.lastRebaseTimestampSec()
      await mockExternalData(INITIAL_RATE_60P_MORE, 1010)
      await increaseTime(60)
    })

    it('should increment epoch', async function () {
      await uFragmentsPolicy.connect(operator).rebase()
      expect(await uFragmentsPolicy.epoch()).to.eq(prevEpoch.add(1))
    })

    it('should update globalPromethiosEpochAndFIRESupply', async function () {
      await uFragmentsPolicy.connect(operator).rebase()
      const r = await uFragmentsPolicy.globalPromethiosEpochAndFIRESupply()
      expect(r[0]).to.eq(prevEpoch.add(1))
      expect(r[1]).to.eq('1010')
    })

    it('should update lastRebaseTimestamp', async function () {
      await uFragmentsPolicy.connect(operator).rebase()
      const time = await uFragmentsPolicy.lastRebaseTimestampSec()
      expect(time.sub(prevTime)).to.gte(60)
    })

    it('should emit Rebase with positive requestedSupplyAdjustment', async function () {
      const r = uFragmentsPolicy.connect(operator).rebase()
      await expect(r)
        .to.emit(uFragmentsPolicy, 'LogRebase')
        .withArgs(
          prevEpoch.add(1),
          INITIAL_RATE_60P_MORE,
          55,
          (
            await parseRebaseLog(r)
          ).timestampSec,
        )
    })

    it('should call getData from the market oracle', async function () {
      await expect(uFragmentsPolicy.connect(operator).rebase())
        .to.emit(mockMarketOracle, 'FunctionCalled')
        .withArgs('MarketOracle', 'getData', uFragmentsPolicy.address)
    })

    it('should call uFrag Rebase', async function () {
      const r = uFragmentsPolicy.connect(operator).rebase()
      await expect(r)
        .to.emit(mockUFragments, 'FunctionCalled')
        .withArgs('UFragments', 'rebase', uFragmentsPolicy.address)
      await expect(r)
        .to.emit(mockUFragments, 'FunctionArguments')
        .withArgs([prevEpoch.add(1)], [55])
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('negative rate', function () {
    before(async function () {
      await mockExternalData(INITIAL_RATE_30P_LESS, 1000)
      await increaseTime(60)
    })

    it('should emit Rebase with negative requestedSupplyAdjustment', async function () {
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(-29)
    })
  })

  describe('max positive rebase', function () {
    before(async function () {
      await mockExternalData(INITIAL_RATE_2X, 1000)
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseFunctionGrowth('100' + '000000000000000000')
      await increaseTime(60)
    })

    it('should emit Rebase with positive requestedSupplyAdjustment', async function () {
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(100)
    })
  })

  describe('max negative rebase', function () {
    before(async function () {
      await mockExternalData(0, 1000)
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseFunctionGrowth('75' + '000000000000000000')
      await increaseTime(60)
    })

    it('should emit Rebase with negative requestedSupplyAdjustment', async function () {
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(-100)
    })
  })

  describe('exponent less than -100', function () {
    before(async function () {
      await mockExternalData(0, 1000)
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseFunctionGrowth('150' + '000000000000000000')
      await increaseTime(60)
    })

    it('should emit Rebase with negative requestedSupplyAdjustment', async function () {
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(-100)
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('rate=TARGET_RATE', function () {
    before(async function () {
      await mockExternalData(INITIAL_RATE, 1000)
      await uFragmentsPolicy.connect(deployer).setDeviationThreshold(0)
      await increaseTime(60)
    })

    it('should emit Rebase with 0 requestedSupplyAdjustment', async function () {
      expect(
        (await parseRebaseLog(uFragmentsPolicy.connect(operator).rebase()))
          .requestedSupplyAdjustment,
      ).to.eq(0)
    })
  })
})

describe('UFragmentsPolicy:Rebase', async function () {
  let rbTime: BigNumber,
    rbWindow: BigNumber,
    minRebaseTimeIntervalSec: BigNumber,
    now: BigNumber,
    nextRebaseWindowOpenTime: BigNumber,
    timeToWait: BigNumber,
    lastRebaseTimestamp: BigNumber

  beforeEach('setup UFragmentsPolicy contract', async function () {
    ;({
      deployer,
      user,
      operator,
      mockUFragments,
      mockMarketOracle,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
    await uFragmentsPolicy
      .connect(deployer)
      .setRebaseTimingParameters(86400, 72000, 900)
    await mockExternalData(INITIAL_RATE, 1000)
    rbTime = await uFragmentsPolicy.rebaseWindowOffsetSec()
    rbWindow = await uFragmentsPolicy.rebaseWindowLengthSec()
    minRebaseTimeIntervalSec = await uFragmentsPolicy.minRebaseTimeIntervalSec()
    now = ethers.BigNumber.from(
      (await ethers.provider.getBlock('latest')).timestamp,
    )
    nextRebaseWindowOpenTime = now
      .sub(now.mod(minRebaseTimeIntervalSec))
      .add(rbTime)
      .add(minRebaseTimeIntervalSec)
  })

  describe('when its 5s after the rebase window closes', function () {
    it('should fail', async function () {
      timeToWait = nextRebaseWindowOpenTime.sub(now).add(rbWindow).add(5)
      await increaseTime(timeToWait)
      expect(await uFragmentsPolicy.inRebaseWindow()).to.be.false
      await expect(uFragmentsPolicy.connect(operator).rebase()).to.be.reverted
    })
  })

  describe('when its 5s before the rebase window opens', function () {
    it('should fail', async function () {
      timeToWait = nextRebaseWindowOpenTime.sub(now).sub(5)
      await increaseTime(timeToWait)
      expect(await uFragmentsPolicy.inRebaseWindow()).to.be.false
      await expect(uFragmentsPolicy.connect(operator).rebase()).to.be.reverted
    })
  })

  describe('when its 5s after the rebase window opens', function () {
    it('should NOT fail', async function () {
      timeToWait = nextRebaseWindowOpenTime.sub(now).add(5)
      await increaseTime(timeToWait)
      expect(await uFragmentsPolicy.inRebaseWindow()).to.be.true
      await expect(uFragmentsPolicy.connect(operator).rebase()).to.not.be
        .reverted
      lastRebaseTimestamp = await uFragmentsPolicy.lastRebaseTimestampSec()
      expect(lastRebaseTimestamp).to.eq(nextRebaseWindowOpenTime)
    })
  })

  describe('when its 5s before the rebase window closes', function () {
    it('should NOT fail', async function () {
      timeToWait = nextRebaseWindowOpenTime.sub(now).add(rbWindow).sub(5)
      await increaseTime(timeToWait)
      expect(await uFragmentsPolicy.inRebaseWindow()).to.be.true
      await expect(uFragmentsPolicy.connect(operator).rebase()).to.not.be
        .reverted
      lastRebaseTimestamp = await uFragmentsPolicy.lastRebaseTimestampSec.call()
      expect(lastRebaseTimestamp).to.eq(nextRebaseWindowOpenTime)
    })
  })
})
