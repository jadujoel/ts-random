// biome-ignore lint/suspicious/noExplicitAny: it's explicit
type ExplicitAny = any;

export interface RandomJson {
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly usfpp?: boolean;
}

/**
 * A class to generate random numbers within a range, supporting both continuous and discrete values.
 * You can also create instances from JSON, strings, or tuples.
 *
 * @example
 * ```ts
 * // Continuous random between -5 and 7
 * const rnd = Random.fromRange(-5, 7);
 * console.log(rnd.center(), rnd.delta()); // 1, 6
 * console.log(rnd.toRange());           // [-5, 7]
 * ```
 * @example
 * ```ts
 * // Discrete random simulating a dice roll
 * const dice = Random.fromRange(1, 6, 1);
 * for (const roll of dice) {
 *   console.log("Roll", roll);
 *   if (roll === 6) {
 *     console.log("You hit 6!");
 *     break;
 *   }
 * }
 * ```
 * @example
 * ```ts
 * const rnd = Random.fromJson({ min: 0, max: 2 });
 * console.log(rnd.toNumber()); // e.g. 1
 * console.log(rnd.toString()); // {"min":0,"max":2,"step":0,"usfpp":false}
 * console.log(rnd.toJson());   // { min: 0, max: 2, step: 0, usfpp: false }
 * ```
 */
export class Random {
  constructor(
    /** The lowest value that the instance may yield */
    public min: number,
    /** The highest value that the instance may yield */
    public max: number,
    /** Zero means continuous; otherwise discrete with this step */
    public step: number,
    /** Use strict floating-point precision. Perf hit, but fixes float rounding issues */
    public usfpp: boolean,
  ) {}

  /**
   * Creates a new Random instance, swapping min/max if needed.
   */
  static new(min: number, max: number, step = 0, isfpp = false): Random {
    return min < max
      ? new Random(min, max, step, isfpp)
      : new Random(max, min, step, isfpp)
  }

  /** Creates a random generator from a range */
  static fromRange(min: number, max: number, step = 0, isfpp = false): Random {
    return Random.new(min, max, step, isfpp);
  }

  /** Creates a random generator from a center and delta */
  static fromCenter(center: number, delta: number, step = 0, isfpp = false): Random {
    return Random.new(center - delta, center + delta, step, isfpp);
  }

  /** Creates a random generator from a JSON string */
  static fromString(str: string): Random | never {
    return Random.fromJson(JSON.parse(str));
  }

  /** Tries to create a random generator from a JSON string, returns undefined if invalid */
  static tryFromString(str: string): Random | undefined {
    try {
      return Random.fromJson(JSON.parse(str));
    } catch {
      return undefined;
    }
  }

  /** Creates a random generator from a tuple [min, max] */
  static fromTuple(tuple: readonly [number, number]): Random {
    return Random.fromRange(tuple[0], tuple[1]);
  }

  /** Creates a random generator from a RandomStruct object */
  static fromJson(json: RandomJson): Random {
    return Random.new(json.min, json.max, json.step ?? 0, json.usfpp ?? false);
  }

  static from(thing: string | readonly [number, number] | RandomJson): Random {
    if (typeof thing === "string") {
      return Random.fromString(thing)
    }
    if (typeof thing === "number") {
      return Random.new(0, 1)
    }
    if (Random.isRange(thing)) {
      return Random.fromTuple(thing)
    }
    if (Random.isJson(thing)) {
      return Random.fromJson(thing)
    }
    throw new Error("Random from Invalid Input")
  }

  static tryFrom(thing: string | readonly [number, number] | RandomJson): Random | undefined {
    if (typeof thing === "string") {
      return Random.tryFromString(thing)
    }
    if (typeof thing === "number") {
      return Random.new(0, 1)
    }
    if (Random.isRange(thing)) {
      return Random.fromTuple(thing)
    }
    if (Random.isJson(thing)) {
      return Random.fromJson(thing)
    }
    return undefined
  }

  /**
   * Select a random element from an array
   * @example
   * ```ts
   * const arr = [1, 2, 3, 4];
   * console.log(Random.choice(arr)); // random element from arr
   * ```
   */
  static choice<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
  }

  /**
   * Shuffle an array and return a new shuffled array
   * @example
   * ```ts
   * const arr = [1, 2, 3];
   * console.log(Random.shuffle(arr)); // [2,1,3] (random order)
   * ```
   */
  static shuffle<T>(arr: readonly T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i]!, copy[j]!] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  /** Type guard to check if an object is a Random instance */
  static [Symbol.hasInstance](obj: ExplicitAny): boolean {
    return obj && typeof obj.min === "number" && typeof obj.max === "number";
  }

  static isRange(thing: unknown): thing is [min: number, max: number] {
    return Array.isArray(thing) && thing.length === 2 && typeof thing[0] === "number" && typeof thing[1] === "number"
  }

  static isJson(thing: ExplicitAny): thing is RandomJson {
    return typeof thing?.min === "number" && typeof thing?.max === "number"
  }

  /** Returns the midpoint of the range */
  center(): number {
    return 0.5 * (this.min + this.max);
  }

  /** Returns half the width of the range (distance from center to min or max) */
  delta(): number {
    return 0.5 * (this.max - this.min);
  }

  /**
   * Generate multiple random values at once
   * @example
   * ```ts
   * const rnd = Random.fromRange(0, 10);
   * console.log(rnd.sample(5)); // [1.23, 7.45, 0.98, ...] random numbers
   * ```
   */
  sample(count: number): number[] {
    return Array.from({ length: count }, () => Number(this));
  }

  /**
   * Infinite iterator producing random numbers
   * @example
   * ```ts
   * const dice = Random.fromRange(1, 6, 1);
   * for (const roll of dice) {
   *   console.log(roll);
   *   if (roll === 6) break;
   * }
   * ```
   */
  *[Symbol.iterator](): Generator<number, number, undefined> {
    while (true) yield Number(this);
  }

  get [Symbol.toStringTag](): string {
    return "Random";
  }

  /** Returns value as number, string, or RandomStruct depending on context */
  [Symbol.toPrimitive](hint: string): string | number | RandomJson {
    if (hint === "number") return this.take();
    if (hint === "string") return this.toString();
    if (hint === "default") return this.toJson();
    return this.take();
  }

  /** Get a random value as number */
  toNumber(): number {
    return this.take();
  }

  /** Serialize the instance to a JSON string */
  toString(): string {
    return JSON.stringify(this.toJson(), null, 2);
  }

  /** Returns the range as a tuple */
  toRange(): [number, number] {
    return [this.min, this.max];
  }

  toTuple = this.toRange

  /** Convert instance to a plain object */
  toJson(): RandomJson {
    return {
      min: this.min,
      max: this.max,
      step: this.step,
      usfpp: this.usfpp,
    };
  }

  json = this.toJson

  /**
   * Generate a single random value
   * - Continuous if step <= 0
   * - Discrete if step > 0
   * - Respects usfpp for floating-point precision
   */
  take(): number {
    const continuous = this.step <= 0;
    if (continuous) return Math.random() * (this.max - this.min) + this.min;

    const steps = Math.floor((this.max - this.min) / this.step) + 1;
    const idx = Math.floor(Math.random() * steps);
    const value = this.min + idx * this.step;

    if (!this.usfpp) {
      return value;
    }

    // Fix floating-point precision
    const decimals = (this.step.toString().split(".")[1] || "").length;
    return Number(value.toFixed(decimals));
  }
}
