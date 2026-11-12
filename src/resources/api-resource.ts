/** The attributes of an object, as the API sent them. */
export type Attributes = Record<string, unknown>;

/** An object returned by the API, keeping every attribute it was sent with. */
export abstract class ApiResource {
    readonly #attributes: Attributes;

    constructor(attributes: Attributes) {
        this.#attributes = attributes;
    }

    /** One attribute as the API sent it, including any this library does not know yet. */
    get(key: string): unknown {
        return Object.hasOwn(this.#attributes, key) ? this.#attributes[key] : undefined;
    }

    /** The attributes as the API sent them, which JSON.stringify() also gives. */
    toJSON(): Attributes {
        return this.#attributes;
    }
}

/** Whether a value is a JSON object rather than an array or a scalar. */
export function isRecord(value: unknown): value is Attributes {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Read a string attribute. */
export function string(data: Attributes, key: string, fallback = ''): string {
    return nullableString(data, key) ?? fallback;
}

/** Read a string attribute that may be null. */
export function nullableString(data: Attributes, key: string): string | null {
    const value = data[key];

    if (typeof value === 'string') {
        return value;
    }

    return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
}

/** Read a boolean attribute. */
export function bool(data: Attributes, key: string, fallback = false): boolean {
    return nullableBool(data, key) ?? fallback;
}

/** Read a boolean attribute that may be null. */
export function nullableBool(data: Attributes, key: string): boolean | null {
    const value = data[key];

    return typeof value === 'boolean' ? value : null;
}

/** Read an integer attribute. */
export function int(data: Attributes, key: string, fallback = 0): number {
    return nullableInt(data, key) ?? fallback;
}

/** Read an integer attribute that may be null. */
export function nullableInt(data: Attributes, key: string): number | null {
    const value = data[key];

    if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
    }

    return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : null;
}

/** Read a number attribute that may be null. */
export function nullableNumber(data: Attributes, key: string): number | null {
    const value = data[key];

    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Read a timestamp or a date, which is taken as midnight UTC. */
export function date(data: Attributes, key: string): Date | null {
    const value = data[key];

    if (typeof value !== 'string' || value === '') {
        return null;
    }

    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Read a list of strings. */
export function strings(data: Attributes, key: string): string[] {
    return nullableStrings(data, key) ?? [];
}

/** Read a list of strings that may be null. */
export function nullableStrings(data: Attributes, key: string): string[] | null {
    const value = data[key];

    if (!Array.isArray(value)) {
        return null;
    }

    return value.flatMap((item: unknown) => {
        if (typeof item === 'string') {
            return [item];
        }

        return typeof item === 'number' && Number.isFinite(item) ? [String(item)] : [];
    });
}

/** Read an object attribute; an empty map arrives from the API as an empty array. */
export function map(data: Attributes, key: string): Attributes {
    const value = data[key];

    if (isRecord(value)) {
        return value;
    }

    return Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};
}

/** Read a list of objects. */
export function records(data: Attributes, key: string): Attributes[] {
    const value = data[key];

    return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** Read a list of objects into resources. */
export function objects<T>(data: Attributes, key: string, hydrate: (attributes: Attributes) => T): T[] {
    return records(data, key).map(hydrate);
}

/** Read an object attribute into a resource. */
export function object<T>(data: Attributes, key: string, hydrate: (attributes: Attributes) => T): T | null {
    const value = data[key];

    return isRecord(value) ? hydrate(value) : null;
}

/** Read the code of a related object, sent either as the code itself or as an object carrying it. */
export function reference(data: Attributes, key: string): string | null {
    const value = data[key];
    const code = isRecord(value) ? (value['id'] ?? value['code']) : value;

    return typeof code === 'string' && code !== '' ? code : null;
}

/** Read a value only when it is one of the given ones. */
export function oneOf<T extends string>(values: Record<string, T>, value: unknown): T | null {
    return Object.values(values).find((known) => known === value) ?? null;
}
