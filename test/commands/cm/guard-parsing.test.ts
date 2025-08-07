import { expect } from 'chai'
import jsonGuardParser from '../../../src/lib/cm/jsonGuardParser.js'
import { CandyMachineConfig } from '../../../src/lib/cm/types.js'

describe('Comprehensive guard parsing test', () => {
    it('should parse all guard types without errors', () => {
        // Create a comprehensive candy machine config with all possible guards
        const comprehensiveConfig: CandyMachineConfig = {
            name: 'test-candy-machine',
            config: {
                collection: '11111111111111111111111111111111',
                itemsAvailable: 100,
                isMutable: true,
                isSequential: false,
                guardConfig: {
                    // Address-based guards
                    addressGate: {
                        address: '11111111111111111111111111111111'
                    },
                    allocation: {
                        id: 1,
                        limit: 5
                    },
                    allowList: {
                        merkleRoot: '11111111111111111111111111111111'
                    },
                    
                    // Asset-based guards
                    assetBurn: {
                        requiredCollection: '11111111111111111111111111111111'
                    },
                    assetBurnMulti: {
                        requiredCollection: '11111111111111111111111111111111',
                        num: 2
                    },
                    assetGate: {
                        requiredCollection: '11111111111111111111111111111111'
                    },
                    assetMintLimit: {
                        id: 1,
                        limit: 3,
                        requiredCollection: '11111111111111111111111111111111'
                    },
                    assetPayment: {
                        requiredCollection: '11111111111111111111111111111111',
                        destination: '11111111111111111111111111111111'
                    },
                    assetPaymentMulti: {
                        requiredCollection: '11111111111111111111111111111111',
                        destination: '11111111111111111111111111111111',
                        num: 2
                    },
                    
                    // Payment guards
                    botTax: {
                        lamports: 1000000,
                        lastInstruction: true
                    },
                    freezeSolPayment: {
                        lamports: 1000000,
                        destination: '11111111111111111111111111111111',
                        period: 86400 // 24 hours
                    },
                    freezeTokenPayment: {
                        amount: '1000000',
                        mint: '11111111111111111111111111111111',
                        destinationAta: '11111111111111111111111111111111',
                        period: 86400
                    },
                    solFixedFee: {
                        lamports: 1000000,
                        destination: '11111111111111111111111111111111'
                    },
                    solPayment: {
                        lamports: 1000000,
                        destination: '11111111111111111111111111111111'
                    },
                    
                    // Token-based guards
                    token2022Payment: {
                        amount: '1000000',
                        mint: '11111111111111111111111111111111',
                        destinationAta: '11111111111111111111111111111111'
                    },
                    tokenBurn: {
                        mint: '11111111111111111111111111111111',
                        amount: '1000000'
                    },
                    tokenGate: {
                        mint: '11111111111111111111111111111111',
                        amount: '1000000'
                    },
                    tokenPayment: {
                        amount: '1000000',
                        mint: '11111111111111111111111111111111',
                        destinationAta: '11111111111111111111111111111111'
                    },
                    
                    // NFT-based guards
                    nftBurn: {
                        requiredCollection: '11111111111111111111111111111111'
                    },
                    nftGate: {
                        requiredCollection: '11111111111111111111111111111111'
                    },
                    nftMintLimit: {
                        id: 1,
                        limit: 3,
                        requiredCollection: '11111111111111111111111111111111'
                    },
                    nftPayment: {
                        requiredCollection: '11111111111111111111111111111111',
                        destination: '11111111111111111111111111111111'
                    },
                    
                    // Other guards
                    edition: {
                        editionStartOffset: 1
                    },
                    endDate: {
                        date: Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
                    },
                    gatekeeper: {
                        gatekeeperNetwork: '11111111111111111111111111111111',
                        expireOnUse: true
                    },
                    mintLimit: {
                        id: 1,
                        limit: 5
                    },
                    programGate: {
                        additional: ['11111111111111111111111111111111', '11111111111111111111111111111111']
                    },
                    redeemedAmount: {
                        maximum: 100
                    },
                    startDate: {
                        date: Math.floor(Date.now() / 1000) // Now
                    },
                    thirdPartySigner: {
                        signerKey: '11111111111111111111111111111111'
                    },
                    vanityMint: {
                        regex: '^[A-Z]{3}[0-9]{3}$'
                    }
                },
                groups: [
                    {
                        label: 'group1',
                        guards: {
                            solPayment: {
                                lamports: 2000000,
                                destination: '11111111111111111111111111111111'
                            },
                            startDate: {
                                date: Math.floor(Date.now() / 1000)
                            },
                            endDate: {
                                date: Math.floor(Date.now() / 1000) + 86400
                            }
                        }
                    },
                    {
                        label: 'group2',
                        guards: {
                            tokenPayment: {
                                amount: '2000000',
                                mint: '11111111111111111111111111111111',
                                destinationAta: '11111111111111111111111111111111'
                            },
                            mintLimit: {
                                id: 2,
                                limit: 10
                            }
                        }
                    }
                ]
            }
        }

        // Test that parsing doesn't throw any errors
        expect(() => {
            const result = jsonGuardParser(comprehensiveConfig)
            
            // Verify the result has the expected structure
            expect(result).to.be.an('object')
            expect(result.guards).to.be.an('object')
            expect(result.groups).to.be.an('array')
            expect(result.groups).to.have.length(2)
            
            // Verify groups have the expected structure
            result.groups.forEach((group, index) => {
                expect(group).to.have.property('label')
                expect(group).to.have.property('guards')
                expect(group.label).to.equal(`group${index + 1}`)
                expect(group.guards).to.be.an('object')
            })
            
        }).to.not.throw()
    })

    it('should handle empty guard configurations', () => {
        const emptyConfig: CandyMachineConfig = {
            name: 'test-candy-machine',
            config: {
                collection: '11111111111111111111111111111111',
                itemsAvailable: 100,
                isMutable: true,
                isSequential: false,
                guardConfig: {},
                groups: []
            }
        }

        expect(() => {
            const result = jsonGuardParser(emptyConfig)
            expect(result).to.be.an('object')
            expect(result.guards).to.be.an('object')
            expect(result.groups).to.be.an('array')
            expect(result.groups).to.have.length(0)
        }).to.not.throw()
    })

    it('should handle partial guard configurations', () => {
        const partialConfig: CandyMachineConfig = {
            name: 'test-candy-machine',
            config: {
                collection: '11111111111111111111111111111111',
                itemsAvailable: 100,
                isMutable: true,
                isSequential: false,
                guardConfig: {
                    solPayment: {
                        lamports: 1000000,
                        destination: '11111111111111111111111111111111'
                    },
                    startDate: {
                        date: Math.floor(Date.now() / 1000)
                    }
                },
                groups: [
                    {
                        label: 'test-group',
                        guards: {
                            endDate: {
                                date: Math.floor(Date.now() / 1000) + 86400
                            }
                        }
                    }
                ]
            }
        }

        expect(() => {
            const result = jsonGuardParser(partialConfig)
            expect(result).to.be.an('object')
            expect(result.guards).to.be.an('object')
            expect(result.groups).to.be.an('array')
            expect(result.groups).to.have.length(1)
            expect(result.groups[0].label).to.equal('test-group')
        }).to.not.throw()
    })

    it('should handle numeric lamports values', () => {
        const numericConfig: CandyMachineConfig = {
            name: 'test-candy-machine',
            config: {
                collection: '11111111111111111111111111111111',
                itemsAvailable: 100,
                isMutable: true,
                isSequential: false,
                guardConfig: {
                    solPayment: {
                        lamports: 1000000, // Number instead of string
                        destination: '11111111111111111111111111111111'
                    },
                    botTax: {
                        lamports: 500000, // Number instead of string
                        lastInstruction: false
                    }
                },
                groups: []
            }
        }

        expect(() => {
            const result = jsonGuardParser(numericConfig)
            expect(result).to.be.an('object')
            expect(result.guards).to.be.an('object')
        }).to.not.throw()
    })

    it('should handle string lamports values', () => {
        const stringConfig: CandyMachineConfig = {
            name: 'test-candy-machine',
            config: {
                collection: '11111111111111111111111111111111',
                itemsAvailable: 100,
                isMutable: true,
                isSequential: false,
                guardConfig: {
                    solPayment: {
                        lamports: '1000000', // String instead of number
                        destination: '11111111111111111111111111111111'
                    },
                    botTax: {
                        lamports: '500000', // String instead of number
                        lastInstruction: false
                    }
                },
                groups: []
            }
        }

        expect(() => {
            const result = jsonGuardParser(stringConfig)
            expect(result).to.be.an('object')
            expect(result.guards).to.be.an('object')
        }).to.not.throw()
    })
}) 