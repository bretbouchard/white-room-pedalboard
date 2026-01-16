/**
 * Rational Number Type
 * Represents exact rational numbers for precise rhythmic calculations
 */

export class Rational {
  constructor(
    public numerator: number,
    public denominator: number,
  ) {
    if (denominator === 0) {
      throw new Error("Denominator cannot be zero");
    }
    this.normalize();
  }

  private normalize(): void {
    if (this.denominator < 0) {
      this.numerator = -this.numerator;
      this.denominator = -this.denominator;
    }
    const gcd = this.gcd(Math.abs(this.numerator), Math.abs(this.denominator));
    this.numerator /= gcd;
    this.denominator /= gcd;
  }

  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  toNumber(): number {
    return this.numerator / this.denominator;
  }

  add(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  subtract(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  multiply(other: Rational): Rational {
    return new Rational(
      this.numerator * other.numerator,
      this.denominator * other.denominator,
    );
  }

  divide(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator,
      this.denominator * other.numerator,
    );
  }

  equals(other: Rational): boolean {
    return (
      this.numerator === other.numerator &&
      this.denominator === other.denominator
    );
  }

  toString(): string {
    return `${this.numerator}/${this.denominator}`;
  }

  // Convenience aliases for common operations
  mul(other: Rational): Rational {
    return this.multiply(other);
  }

  div(other: Rational): Rational {
    return this.divide(other);
  }

  lt(other: Rational): boolean {
    return this.toNumber() < other.toNumber();
  }

  gt(other: Rational): boolean {
    return this.toNumber() > other.toNumber();
  }

  lte(other: Rational): boolean {
    return this.toNumber() <= other.toNumber();
  }

  gte(other: Rational): boolean {
    return this.toNumber() >= other.toNumber();
  }

  static fromNumber(n: number): Rational {
    const tolerance = 1e-10;
    let numerator = 1;
    let denominator = 1;

    while (Math.abs(n - numerator / denominator) > tolerance) {
      if (numerator / denominator < n) {
        numerator++;
      } else {
        denominator++;
      }
    }

    return new Rational(numerator, denominator);
  }
}
