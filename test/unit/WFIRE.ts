import { ethers, upgrades } from 'hardhat'
import { Contract, Signer, BigNumber, BigNumberish } from 'ethers'
import { expect } from 'chai'

const FIRE_DECIMALS = 9
const DECIMALS = 18
const NAME = 'Wrapped Fire'
const SYMBOL = 'WFIRE'

const toWFIREFixedPt = (a: string): BigNumber =>
  ethers.utils.parseUnits(a, DECIMALS)

const toFIREFixedPt = (a: string): BigNumber =>
  ethers.utils.parseUnits(a, FIRE_DECIMALS)

let accounts: Signer[],
  deployer: Signer,
  deployerAddress: string,
  userA: Signer,
  userAAddress: string,
  userB: Signer,
  userBAddress: string,
  userC: Signer,
  userCAddress: string,
  fire: Contract,
  wFIRE: Contract,
  balanceBefore: BigNumber,
  balanceAfter: BigNumber

async function setupContracts() {
  accounts = await ethers.getSigners()
  deployer = accounts[0]
  userA = accounts[1]
  userB = accounts[2]
  userC = accounts[3]

  deployerAddress = await deployer.getAddress()
  userAAddress = await userA.getAddress()
  userBAddress = await userB.getAddress()
  userCAddress = await userC.getAddress()

  const fireFactory = await ethers.getContractFactory('UFragments')
  fire = await upgrades.deployProxy(fireFactory, [deployerAddress], {
    initializer: 'initialize(address)',
  })
  await fire.setMonetaryPolicy(deployerAddress)

  const wFIREFactory = await ethers.getContractFactory('WFIRE')
  wFIRE = await wFIREFactory.connect(deployer).deploy(fire.address)
  await wFIRE.init(NAME, SYMBOL)
}

describe('WFIRE', () => {
  before('setup WFIRE contract', setupContracts)

  it('should reject any ether sent to it', async function () {
    const user = accounts[1]
    await expect(user.sendTransaction({ to: wFIRE.address, value: 1 })).to.be
      .reverted
  })
})

describe('WFIRE:Initialization', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  it('should set the underlying reference', async function () {
    expect(await wFIRE.underlying()).to.eq(fire.address)
  })

  it('should set detailed erc20 info parameters', async function () {
    expect(await wFIRE.name()).to.eq(NAME)
    expect(await wFIRE.symbol()).to.eq(SYMBOL)
    expect(await wFIRE.decimals()).to.eq(18)
  })

  it('should set the erc20 balance and supply', async function () {
    expect(await wFIRE.totalSupply()).to.eq('0')
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq('0')
  })

  it('should set the underlying balance and supply', async function () {
    expect(await wFIRE.totalUnderlying()).to.eq('0')
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq('0')
    expect(await wFIRE.underlyingToWrapper(toFIREFixedPt('500000'))).to.eq(
      toWFIREFixedPt('100000'),
    )
    expect(await wFIRE.wrapperToUnderlying(toWFIREFixedPt('100000'))).to.eq(
      toFIREFixedPt('500000'),
    )
  })
})

describe('WFIRE:deposit', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any, firesDeposited: BigNumber, wfiresMinted: BigNumber
  beforeEach(async function () {
    // 1% of FIRE total supply
    firesDeposited = toFIREFixedPt('500000')

    // 1% of MAX_WFIRE_SUPPLY
    wfiresMinted = toWFIREFixedPt('100000')
    expect(await wFIRE.underlyingToWrapper(firesDeposited)).to.eq(wfiresMinted)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    expect(
      await wFIRE.connect(deployer).callStatic.deposit(firesDeposited),
    ).to.eq(wfiresMinted)

    balanceBefore = await fire.balanceOf(deployerAddress)
    r = wFIRE.connect(deployer).deposit(firesDeposited)
    await r
    balanceAfter = await fire.balanceOf(deployerAddress)
  })

  it('should mint wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq(firesDeposited)
    expect(await wFIRE.totalUnderlying()).to.eq(firesDeposited)
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq(
      firesDeposited,
    )

    expect(await wFIRE.totalSupply()).to.eq(wfiresMinted)
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq(wfiresMinted)
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(deployerAddress, wFIRE.address, firesDeposited)
    expect(balanceBefore.sub(balanceAfter)).to.eq(firesDeposited)
  })

  it('should log mint', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(ethers.constants.AddressZero, deployerAddress, wfiresMinted)
  })
})

describe('WFIRE:depositFor', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any, firesDeposited: BigNumber, wfiresMinted: BigNumber
  beforeEach(async function () {
    // 1% of FIRE total supply
    firesDeposited = toFIREFixedPt('500000')

    // 1% of MAX_WFIRE_SUPPLY
    wfiresMinted = toWFIREFixedPt('100000')
    expect(await wFIRE.underlyingToWrapper(firesDeposited)).to.eq(wfiresMinted)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    expect(
      await wFIRE
        .connect(deployer)
        .callStatic.depositFor(userBAddress, firesDeposited),
    ).to.eq(wfiresMinted)

    balanceBefore = await fire.balanceOf(deployerAddress)
    r = wFIRE.connect(deployer).depositFor(userBAddress, firesDeposited)
    await r
    balanceAfter = await fire.balanceOf(deployerAddress)
  })

  it('should mint wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq(firesDeposited)
    expect(await wFIRE.totalUnderlying()).to.eq(firesDeposited)
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq(firesDeposited)
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq('0')

    expect(await wFIRE.totalSupply()).to.eq(wfiresMinted)
    expect(await wFIRE.balanceOf(userBAddress)).to.eq(wfiresMinted)
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq('0')
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(deployerAddress, wFIRE.address, firesDeposited)
    expect(balanceBefore.sub(balanceAfter)).to.eq(firesDeposited)
  })

  it('should log mint', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(ethers.constants.AddressZero, userBAddress, wfiresMinted)
  })
})

describe('WFIRE:withdraw', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any,
    firesWithdrawn: BigNumber,
    firesRemaining: BigNumber,
    wfiresBurnt: BigNumber,
    wfiresRemaining: BigNumber
  beforeEach(async function () {
    // 2% of FIRE total supply
    const firesDeposited = toFIREFixedPt('1000000')

    // 2 % of MAX_WFIRE_SUPPLY
    const wfiresMinted = await wFIRE.underlyingToWrapper(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    await wFIRE.connect(deployer).deposit(firesDeposited)

    // 0.5% of FIRE total supply
    firesWithdrawn = toFIREFixedPt('250000')

    // 1.5% of FIRE total supply
    firesRemaining = firesDeposited.sub(firesWithdrawn)

    // 0.5% of MAX_WFIRE_SUPPLY
    wfiresBurnt = toWFIREFixedPt('50000')

    // 1.5% of MAX_WFIRE_SUPPLY
    wfiresRemaining = wfiresMinted.sub(wfiresBurnt)

    expect(await wFIRE.underlyingToWrapper(firesWithdrawn)).to.eq(wfiresBurnt)
    expect(
      await wFIRE.connect(deployer).callStatic.withdraw(firesWithdrawn),
    ).to.eq(wfiresBurnt)

    balanceBefore = await fire.balanceOf(deployerAddress)
    r = wFIRE.connect(deployer).withdraw(firesWithdrawn)
    await r
    balanceAfter = await fire.balanceOf(deployerAddress)
  })

  it('should burn wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq(firesRemaining)
    expect(await wFIRE.totalUnderlying()).to.eq(firesRemaining)
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq(
      firesRemaining,
    )

    expect(await wFIRE.totalSupply()).to.eq(wfiresRemaining)
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq(wfiresRemaining)
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(wFIRE.address, deployerAddress, firesWithdrawn)
    expect(balanceAfter.sub(balanceBefore)).to.eq(firesWithdrawn)
  })

  it('should log burn', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(deployerAddress, ethers.constants.AddressZero, wfiresBurnt)
  })
})

describe('WFIRE:withdrawTo', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any,
    firesWithdrawn: BigNumber,
    firesRemaining: BigNumber,
    wfiresBurnt: BigNumber,
    wfiresRemaining: BigNumber
  beforeEach(async function () {
    // 2% of FIRE total supply
    const firesDeposited = toFIREFixedPt('1000000')

    // 2 % of MAX_WFIRE_SUPPLY
    const wfiresMinted = await wFIRE.underlyingToWrapper(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    await wFIRE.connect(deployer).deposit(firesDeposited)

    // 0.5% of FIRE total supply
    firesWithdrawn = toFIREFixedPt('250000')

    // 1.5% of FIRE total supply
    firesRemaining = firesDeposited.sub(firesWithdrawn)

    // 0.5% of MAX_WFIRE_SUPPLY
    wfiresBurnt = toWFIREFixedPt('50000')

    // 1.5% of MAX_WFIRE_SUPPLY
    wfiresRemaining = wfiresMinted.sub(wfiresBurnt)

    expect(await wFIRE.underlyingToWrapper(firesWithdrawn)).to.eq(wfiresBurnt)
    expect(
      await wFIRE
        .connect(deployer)
        .callStatic.withdrawTo(userBAddress, firesWithdrawn),
    ).to.eq(wfiresBurnt)

    balanceBefore = await fire.balanceOf(userBAddress)
    r = wFIRE.connect(deployer).withdrawTo(userBAddress, firesWithdrawn)
    await r
    balanceAfter = await fire.balanceOf(userBAddress)
  })

  it('should burn wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq(firesRemaining)
    expect(await wFIRE.totalUnderlying()).to.eq(firesRemaining)
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq('0')
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq(
      firesRemaining,
    )

    expect(await wFIRE.totalSupply()).to.eq(wfiresRemaining)
    expect(await wFIRE.balanceOf(userBAddress)).to.eq('0')
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq(wfiresRemaining)
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(wFIRE.address, userBAddress, firesWithdrawn)
    expect(balanceAfter.sub(balanceBefore)).to.eq(firesWithdrawn)
  })

  it('should log burn', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(deployerAddress, ethers.constants.AddressZero, wfiresBurnt)
  })
})

describe('WFIRE:withdrawAll', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any, firesDeposited: BigNumber, wfiresMinted: BigNumber
  beforeEach(async function () {
    // 2% of FIRE total supply
    firesDeposited = toFIREFixedPt('1000000')

    // 2 % of MAX_WFIRE_SUPPLY
    wfiresMinted = await wFIRE.underlyingToWrapper(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    await wFIRE.connect(deployer).deposit(firesDeposited)

    expect(await wFIRE.wrapperToUnderlying(wfiresMinted)).to.eq(firesDeposited)
    expect(await wFIRE.connect(deployer).callStatic.withdrawAll()).to.eq(
      wfiresMinted,
    )

    balanceBefore = await fire.balanceOf(deployerAddress)
    r = wFIRE.connect(deployer).withdrawAll()
    await r
    balanceAfter = await fire.balanceOf(deployerAddress)
  })

  it('should burn wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq('0')
    expect(await wFIRE.totalUnderlying()).to.eq('0')
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq('0')

    expect(await wFIRE.totalSupply()).to.eq('0')
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq('0')
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(wFIRE.address, deployerAddress, firesDeposited)
    expect(balanceAfter.sub(balanceBefore)).to.eq(firesDeposited)
  })

  it('should log burn', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(deployerAddress, ethers.constants.AddressZero, wfiresMinted)
  })
})

describe('WFIRE:withdrawAllTo', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any, firesDeposited: BigNumber, wfiresMinted: BigNumber
  beforeEach(async function () {
    // 2% of FIRE total supply
    firesDeposited = toFIREFixedPt('1000000')

    // 2 % of MAX_WFIRE_SUPPLY
    wfiresMinted = await wFIRE.underlyingToWrapper(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    await wFIRE.connect(deployer).deposit(firesDeposited)

    expect(await wFIRE.wrapperToUnderlying(wfiresMinted)).to.eq(firesDeposited)
    expect(
      await wFIRE.connect(deployer).callStatic.withdrawAllTo(userBAddress),
    ).to.eq(wfiresMinted)

    balanceBefore = await fire.balanceOf(userBAddress)
    r = wFIRE.connect(deployer).withdrawAllTo(userBAddress)
    await r
    balanceAfter = await fire.balanceOf(userBAddress)
  })

  it('should burn wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq('0')
    expect(await wFIRE.totalUnderlying()).to.eq('0')
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq('0')
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq('0')

    expect(await wFIRE.totalSupply()).to.eq('0')
    expect(await wFIRE.balanceOf(userBAddress)).to.eq('0')
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq('0')
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(wFIRE.address, userBAddress, firesDeposited)
    expect(balanceAfter.sub(balanceBefore)).to.eq(firesDeposited)
  })

  it('should log burn', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(deployerAddress, ethers.constants.AddressZero, wfiresMinted)
  })
})

describe('WFIRE:mint', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any, firesDeposited: BigNumber, wfiresMinted: BigNumber
  beforeEach(async function () {
    // 1% of FIRE total supply
    firesDeposited = toFIREFixedPt('500000')

    // 1% of MAX_WFIRE_SUPPLY
    wfiresMinted = toWFIREFixedPt('100000')
    expect(await wFIRE.wrapperToUnderlying(wfiresMinted)).to.eq(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    expect(await wFIRE.connect(deployer).callStatic.mint(wfiresMinted)).to.eq(
      firesDeposited,
    )

    balanceBefore = await fire.balanceOf(deployerAddress)
    r = wFIRE.connect(deployer).mint(wfiresMinted)
    await r
    balanceAfter = await fire.balanceOf(deployerAddress)
  })

  it('should mint wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq(firesDeposited)
    expect(await wFIRE.totalUnderlying()).to.eq(firesDeposited)
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq(
      firesDeposited,
    )

    expect(await wFIRE.totalSupply()).to.eq(wfiresMinted)
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq(wfiresMinted)
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(deployerAddress, wFIRE.address, firesDeposited)
    expect(balanceBefore.sub(balanceAfter)).to.eq(firesDeposited)
  })

  it('should log mint', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(ethers.constants.AddressZero, deployerAddress, wfiresMinted)
  })
})

describe('WFIRE:mintFor', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any, firesDeposited: BigNumber, wfiresMinted: BigNumber
  beforeEach(async function () {
    // 1% of FIRE total supply
    firesDeposited = toFIREFixedPt('500000')

    // 1% of MAX_WFIRE_SUPPLY
    wfiresMinted = toWFIREFixedPt('100000')
    expect(await wFIRE.wrapperToUnderlying(wfiresMinted)).to.eq(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    expect(
      await wFIRE
        .connect(deployer)
        .callStatic.mintFor(userBAddress, wfiresMinted),
    ).to.eq(firesDeposited)

    balanceBefore = await fire.balanceOf(deployerAddress)
    r = wFIRE.connect(deployer).mintFor(userBAddress, wfiresMinted)
    await r
    balanceAfter = await fire.balanceOf(deployerAddress)
  })

  it('should mint wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq(firesDeposited)
    expect(await wFIRE.totalUnderlying()).to.eq(firesDeposited)
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq(firesDeposited)
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq('0')

    expect(await wFIRE.totalSupply()).to.eq(wfiresMinted)
    expect(await wFIRE.balanceOf(userBAddress)).to.eq(wfiresMinted)
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq('0')
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(deployerAddress, wFIRE.address, firesDeposited)
    expect(balanceBefore.sub(balanceAfter)).to.eq(firesDeposited)
  })

  it('should log mint', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(ethers.constants.AddressZero, userBAddress, wfiresMinted)
  })
})

describe('WFIRE:burn', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any,
    firesWithdrawn: BigNumber,
    firesRemaining: BigNumber,
    wfiresBurnt: BigNumber,
    wfiresRemaining: BigNumber
  beforeEach(async function () {
    // 2% of FIRE total supply
    const firesDeposited = toFIREFixedPt('1000000')

    // 2 % of MAX_WFIRE_SUPPLY
    const wfiresMinted = await wFIRE.underlyingToWrapper(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    await wFIRE.connect(deployer).deposit(firesDeposited)

    // 0.5% of FIRE total supply
    firesWithdrawn = toFIREFixedPt('250000')

    // 1.5% of FIRE total supply
    firesRemaining = firesDeposited.sub(firesWithdrawn)

    // 0.5% of MAX_WFIRE_SUPPLY
    wfiresBurnt = toWFIREFixedPt('50000')

    // 1.5% of MAX_WFIRE_SUPPLY
    wfiresRemaining = wfiresMinted.sub(wfiresBurnt)

    expect(await wFIRE.wrapperToUnderlying(wfiresBurnt)).to.eq(firesWithdrawn)
    expect(await wFIRE.connect(deployer).callStatic.burn(wfiresBurnt)).to.eq(
      firesWithdrawn,
    )

    balanceBefore = await fire.balanceOf(deployerAddress)
    r = wFIRE.connect(deployer).burn(wfiresBurnt)
    await r
    balanceAfter = await fire.balanceOf(deployerAddress)
  })

  it('should burn wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq(firesRemaining)
    expect(await wFIRE.totalUnderlying()).to.eq(firesRemaining)
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq(
      firesRemaining,
    )

    expect(await wFIRE.totalSupply()).to.eq(wfiresRemaining)
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq(wfiresRemaining)
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(wFIRE.address, deployerAddress, firesWithdrawn)
    expect(balanceAfter.sub(balanceBefore)).to.eq(firesWithdrawn)
  })

  it('should log burn', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(deployerAddress, ethers.constants.AddressZero, wfiresBurnt)
  })
})

describe('WFIRE:burnTo', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any,
    firesWithdrawn: BigNumber,
    firesRemaining: BigNumber,
    wfiresBurnt: BigNumber,
    wfiresRemaining: BigNumber
  beforeEach(async function () {
    // 2% of FIRE total supply
    const firesDeposited = toFIREFixedPt('1000000')

    // 2 % of MAX_WFIRE_SUPPLY
    const wfiresMinted = await wFIRE.underlyingToWrapper(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    await wFIRE.connect(deployer).deposit(firesDeposited)

    // 0.5% of FIRE total supply
    firesWithdrawn = toFIREFixedPt('250000')

    // 1.5% of FIRE total supply
    firesRemaining = firesDeposited.sub(firesWithdrawn)

    // 0.5% of MAX_WFIRE_SUPPLY
    wfiresBurnt = toWFIREFixedPt('50000')

    // 1.5% of MAX_WFIRE_SUPPLY
    wfiresRemaining = wfiresMinted.sub(wfiresBurnt)

    expect(await wFIRE.wrapperToUnderlying(wfiresBurnt)).to.eq(firesWithdrawn)
    expect(
      await wFIRE
        .connect(deployer)
        .callStatic.burnTo(userBAddress, wfiresBurnt),
    ).to.eq(firesWithdrawn)

    balanceBefore = await fire.balanceOf(userBAddress)
    r = wFIRE.connect(deployer).burnTo(userBAddress, wfiresBurnt)
    await r
    balanceAfter = await fire.balanceOf(userBAddress)
  })

  it('should burn wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq(firesRemaining)
    expect(await wFIRE.totalUnderlying()).to.eq(firesRemaining)
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq('0')
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq(
      firesRemaining,
    )

    expect(await wFIRE.totalSupply()).to.eq(wfiresRemaining)
    expect(await wFIRE.balanceOf(userBAddress)).to.eq('0')
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq(wfiresRemaining)
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(wFIRE.address, userBAddress, firesWithdrawn)
    expect(balanceAfter.sub(balanceBefore)).to.eq(firesWithdrawn)
  })

  it('should log burn', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(deployerAddress, ethers.constants.AddressZero, wfiresBurnt)
  })
})

describe('WFIRE:burnAll', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any, firesDeposited: BigNumber, wfiresMinted: BigNumber
  beforeEach(async function () {
    // 2% of FIRE total supply
    firesDeposited = toFIREFixedPt('1000000')

    // 2 % of MAX_WFIRE_SUPPLY
    wfiresMinted = await wFIRE.underlyingToWrapper(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    await wFIRE.connect(deployer).deposit(firesDeposited)

    expect(await wFIRE.wrapperToUnderlying(wfiresMinted)).to.eq(firesDeposited)
    expect(await wFIRE.connect(deployer).callStatic.burnAll()).to.eq(
      firesDeposited,
    )

    balanceBefore = await fire.balanceOf(deployerAddress)
    r = wFIRE.connect(deployer).burnAll()
    await r
    balanceAfter = await fire.balanceOf(deployerAddress)
  })

  it('should burn wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq('0')
    expect(await wFIRE.totalUnderlying()).to.eq('0')
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq('0')

    expect(await wFIRE.totalSupply()).to.eq('0')
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq('0')
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(wFIRE.address, deployerAddress, firesDeposited)
  })

  it('should log burn', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(deployerAddress, ethers.constants.AddressZero, wfiresMinted)
    expect(balanceAfter.sub(balanceBefore)).to.eq(firesDeposited)
  })
})

describe('WFIRE:burnAllTo', () => {
  beforeEach('setup WFIRE contract', setupContracts)

  let r: any, firesDeposited: BigNumber, wfiresMinted: BigNumber
  beforeEach(async function () {
    // 2% of FIRE total supply
    firesDeposited = toFIREFixedPt('1000000')

    // 2 % of MAX_WFIRE_SUPPLY
    wfiresMinted = await wFIRE.underlyingToWrapper(firesDeposited)

    await fire.connect(deployer).approve(wFIRE.address, firesDeposited)
    await wFIRE.connect(deployer).deposit(firesDeposited)

    expect(await wFIRE.wrapperToUnderlying(wfiresMinted)).to.eq(firesDeposited)
    expect(
      await wFIRE.connect(deployer).callStatic.burnAllTo(userBAddress),
    ).to.eq(firesDeposited)

    balanceBefore = await fire.balanceOf(userBAddress)
    r = wFIRE.connect(deployer).withdrawAllTo(userBAddress)
    await r
    balanceAfter = await fire.balanceOf(userBAddress)
  })

  it('should burn wfires', async function () {
    expect(await fire.balanceOf(wFIRE.address)).to.eq('0')
    expect(await wFIRE.totalUnderlying()).to.eq('0')
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq('0')
    expect(await wFIRE.balanceOfUnderlying(deployerAddress)).to.eq('0')

    expect(await wFIRE.totalSupply()).to.eq('0')
    expect(await wFIRE.balanceOf(userBAddress)).to.eq('0')
    expect(await wFIRE.balanceOf(deployerAddress)).to.eq('0')
  })

  it('should log transfer', async function () {
    await expect(r)
      .to.emit(fire, 'Transfer')
      .withArgs(wFIRE.address, userBAddress, firesDeposited)
    expect(balanceAfter.sub(balanceBefore)).to.eq(firesDeposited)
  })

  it('should log burn', async function () {
    await expect(r)
      .to.emit(wFIRE, 'Transfer')
      .withArgs(deployerAddress, ethers.constants.AddressZero, wfiresMinted)
  })
})

describe('Underlying Rebase:Expansion', async function () {
  beforeEach('setup WFIRE contract', setupContracts)

  beforeEach(async function () {
    await fire
      .connect(deployer)
      .transfer(userAAddress, toFIREFixedPt('1000000'))
    await fire
      .connect(deployer)
      .transfer(userBAddress, toFIREFixedPt('1000000'))
    await fire
      .connect(deployer)
      .transfer(userCAddress, toFIREFixedPt('1000000'))

    await fire.connect(userA).approve(wFIRE.address, toFIREFixedPt('100000'))
    await fire.connect(userB).approve(wFIRE.address, toFIREFixedPt('200000'))
    await fire.connect(userC).approve(wFIRE.address, toFIREFixedPt('300000'))

    await wFIRE.connect(userA).deposit(toFIREFixedPt('100000'))
    await wFIRE.connect(userB).deposit(toFIREFixedPt('200000'))
    await wFIRE.connect(userC).deposit(toFIREFixedPt('300000'))
  })

  it('should update accounting accurately', async function () {
    expect(await wFIRE.totalUnderlying()).to.eq(toFIREFixedPt('600000'))
    expect(await wFIRE.balanceOfUnderlying(userAAddress)).to.eq(
      toFIREFixedPt('100000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq(
      toFIREFixedPt('200000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userCAddress)).to.eq(
      toFIREFixedPt('300000'),
    )

    expect(await wFIRE.totalSupply()).to.eq(toWFIREFixedPt('120000'))
    expect(await wFIRE.balanceOf(userAAddress)).to.eq(toWFIREFixedPt('20000'))
    expect(await wFIRE.balanceOf(userBAddress)).to.eq(toWFIREFixedPt('40000'))
    expect(await wFIRE.balanceOf(userCAddress)).to.eq(toWFIREFixedPt('60000'))

    // supply increases by 100%
    await fire.rebase('1', toFIREFixedPt('50000000'))

    expect(await wFIRE.totalUnderlying()).to.eq(toFIREFixedPt('1200000'))
    expect(await wFIRE.balanceOfUnderlying(userAAddress)).to.eq(
      toFIREFixedPt('200000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq(
      toFIREFixedPt('400000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userCAddress)).to.eq(
      toFIREFixedPt('600000'),
    )

    expect(await wFIRE.totalSupply()).to.eq(toWFIREFixedPt('120000'))
    expect(await wFIRE.balanceOf(userAAddress)).to.eq(toWFIREFixedPt('20000'))
    expect(await wFIRE.balanceOf(userBAddress)).to.eq(toWFIREFixedPt('40000'))
    expect(await wFIRE.balanceOf(userCAddress)).to.eq(toWFIREFixedPt('60000'))
  })
})

describe('Underlying Rebase:Contraction', async function () {
  beforeEach('setup WFIRE contract', setupContracts)

  beforeEach(async function () {
    await fire
      .connect(deployer)
      .transfer(userAAddress, toFIREFixedPt('1000000'))
    await fire
      .connect(deployer)
      .transfer(userBAddress, toFIREFixedPt('1000000'))
    await fire
      .connect(deployer)
      .transfer(userCAddress, toFIREFixedPt('1000000'))

    await fire.connect(userA).approve(wFIRE.address, toFIREFixedPt('100000'))
    await fire.connect(userB).approve(wFIRE.address, toFIREFixedPt('200000'))
    await fire.connect(userC).approve(wFIRE.address, toFIREFixedPt('300000'))

    await wFIRE.connect(userA).deposit(toFIREFixedPt('100000'))
    await wFIRE.connect(userB).deposit(toFIREFixedPt('200000'))
    await wFIRE.connect(userC).deposit(toFIREFixedPt('300000'))
  })

  it('should update accounting accurately', async function () {
    expect(await wFIRE.totalUnderlying()).to.eq(toFIREFixedPt('600000'))
    expect(await wFIRE.balanceOfUnderlying(userAAddress)).to.eq(
      toFIREFixedPt('100000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq(
      toFIREFixedPt('200000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userCAddress)).to.eq(
      toFIREFixedPt('300000'),
    )

    expect(await wFIRE.totalSupply()).to.eq(toWFIREFixedPt('120000'))
    expect(await wFIRE.balanceOf(userAAddress)).to.eq(toWFIREFixedPt('20000'))
    expect(await wFIRE.balanceOf(userBAddress)).to.eq(toWFIREFixedPt('40000'))
    expect(await wFIRE.balanceOf(userCAddress)).to.eq(toWFIREFixedPt('60000'))

    // supply decreases by 50%
    await fire.rebase('1', toFIREFixedPt('-25000000'))

    expect(await wFIRE.totalUnderlying()).to.eq(toFIREFixedPt('300000'))
    expect(await wFIRE.balanceOfUnderlying(userAAddress)).to.eq(
      toFIREFixedPt('50000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq(
      toFIREFixedPt('100000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userCAddress)).to.eq(
      toFIREFixedPt('150000'),
    )

    expect(await wFIRE.totalSupply()).to.eq(toWFIREFixedPt('120000'))
    expect(await wFIRE.balanceOf(userAAddress)).to.eq(toWFIREFixedPt('20000'))
    expect(await wFIRE.balanceOf(userBAddress)).to.eq(toWFIREFixedPt('40000'))
    expect(await wFIRE.balanceOf(userCAddress)).to.eq(toWFIREFixedPt('60000'))
  })
})

describe('user sends funds to the contract incorrectly', async function () {
  beforeEach('setup WFIRE contract', setupContracts)

  beforeEach(async function () {
    await fire
      .connect(deployer)
      .transfer(userAAddress, toFIREFixedPt('1000000'))
    await fire
      .connect(deployer)
      .transfer(userBAddress, toFIREFixedPt('1000000'))
    await fire
      .connect(deployer)
      .transfer(userCAddress, toFIREFixedPt('1000000'))

    await fire.connect(userA).approve(wFIRE.address, toFIREFixedPt('100000'))
    await fire.connect(userB).approve(wFIRE.address, toFIREFixedPt('200000'))
    await fire.connect(userC).approve(wFIRE.address, toFIREFixedPt('300000'))

    await wFIRE.connect(userA).deposit(toFIREFixedPt('100000'))
    await wFIRE.connect(userB).deposit(toFIREFixedPt('200000'))
    await wFIRE.connect(userC).deposit(toFIREFixedPt('300000'))
  })

  it('should not affect balances', async function () {
    expect(await wFIRE.totalUnderlying()).to.eq(toFIREFixedPt('600000'))
    expect(await wFIRE.balanceOfUnderlying(userAAddress)).to.eq(
      toFIREFixedPt('100000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq(
      toFIREFixedPt('200000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userCAddress)).to.eq(
      toFIREFixedPt('300000'),
    )

    expect(await wFIRE.totalSupply()).to.eq(toWFIREFixedPt('120000'))
    expect(await wFIRE.balanceOf(userAAddress)).to.eq(toWFIREFixedPt('20000'))
    expect(await wFIRE.balanceOf(userBAddress)).to.eq(toWFIREFixedPt('40000'))
    expect(await wFIRE.balanceOf(userCAddress)).to.eq(toWFIREFixedPt('60000'))

    await fire.transfer(wFIRE.address, toFIREFixedPt('300000'))

    expect(await wFIRE.totalUnderlying()).to.eq(toFIREFixedPt('600000'))
    expect(await wFIRE.balanceOfUnderlying(userAAddress)).to.eq(
      toFIREFixedPt('100000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userBAddress)).to.eq(
      toFIREFixedPt('200000'),
    )
    expect(await wFIRE.balanceOfUnderlying(userCAddress)).to.eq(
      toFIREFixedPt('300000'),
    )

    expect(await wFIRE.totalSupply()).to.eq(toWFIREFixedPt('120000'))
    expect(await wFIRE.balanceOf(userAAddress)).to.eq(toWFIREFixedPt('20000'))
    expect(await wFIRE.balanceOf(userBAddress)).to.eq(toWFIREFixedPt('40000'))
    expect(await wFIRE.balanceOf(userCAddress)).to.eq(toWFIREFixedPt('60000'))
  })
})
