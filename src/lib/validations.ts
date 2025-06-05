export function validateTokenName(name: string): string {
    if (name.length < 1) {
        throw new Error('Token name cannot be empty');
    }
    if (name.length > 32) {
        throw new Error('Token name cannot exceed 32 characters');
    }
    return name;
}

export function validateTokenSymbol(symbol: string): string {
    if (symbol.length < 2) {
        throw new Error('Token symbol must be at least 2 characters');
    }
    if (symbol.length > 6) {
        throw new Error('Token symbol cannot exceed 6 characters');
    }
    return symbol;
}

export function validateMintAmount(amount: number): number {
    if (amount <= 0) {
        throw new Error('Mint amount must be greater than 0');
    }
    if (amount > 1_000_000_000_000) {
        throw new Error('Mint amount cannot exceed 1 trillion tokens');
    }
    return amount;
}