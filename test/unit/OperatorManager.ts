import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Contract, Signer } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('OperatorManager', function () {
  let OperatorManager: Contract
  let owner: SignerWithAddress
  let operator1: SignerWithAddress
  let operator2: SignerWithAddress
  let nonOperator: SignerWithAddress
  let accounts: SignerWithAddress[]

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    ;[owner, operator1, operator2, nonOperator] = accounts

    const OperatorManagerFactory = await ethers.getContractFactory(
      'OperatorManager',
      owner,
    )
    OperatorManager = await OperatorManagerFactory.deploy()
    await OperatorManager.deployed()
  })

  describe('isOperator', () => {
    it('should return true if address is an operator', async () => {
      await OperatorManager.connect(owner).addOperator(
        await operator1.getAddress(),
      )
      expect(
        await OperatorManager.isOperator(await operator1.getAddress()),
      ).to.equal(true)
    })

    it('should return false if address is not an operator', async () => {
      expect(
        await OperatorManager.isOperator(await nonOperator.getAddress()),
      ).to.equal(false)
    })
  })

  describe('addOperator', () => {
    it('should add operator successfully', async () => {
      await OperatorManager.connect(owner).addOperator(
        await operator1.getAddress(),
      )
      expect(
        await OperatorManager.isOperator(await operator1.getAddress()),
      ).to.equal(true)
    })

    it('should fail if not called by owner', async () => {
      await expect(
        OperatorManager.connect(nonOperator).addOperator(
          await operator1.getAddress(),
        ),
      ).to.be.revertedWith('')
    })
  })

  describe('setOperators', () => {
    it('should set operators successfully', async () => {
      await OperatorManager.connect(owner).setOperators(
        [operator1.address, operator2.address],
        true,
      )

      expect(await OperatorManager.isOperator(operator1.address)).to.equal(true)
      expect(await OperatorManager.isOperator(operator2.address)).to.equal(true)
    })

    it('should remove operators successfully', async () => {
      await OperatorManager.connect(owner).setOperators(
        [operator1.address, operator2.address],
        false,
      )

      expect(await OperatorManager.isOperator(operator1.address)).to.equal(
        false,
      )
      expect(await OperatorManager.isOperator(operator2.address)).to.equal(
        false,
      )
    })

    it('should fail if not called by owner', async () => {
      await expect(
        OperatorManager.connect(nonOperator).setOperators(
          [operator1.address],
          true,
        ),
      ).to.be.revertedWith('')
    })
  })
})
