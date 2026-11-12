import type { Currency, Mode, OrString } from './enums.ts';
import { nullableString, strings, type ApiResource, type Attributes } from './resources/api-resource.ts';
import type { SupportedAsset } from './resources/supported-asset.ts';

/** Where a page sits in its list. */
export interface PagePosition {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
}

/** One page of a list, able to fetch the pages after it. */
export class Page<T extends ApiResource> implements Iterable<T> {
    /** The objects on this page. */
    readonly data: T[];

    /** The number of this page, from 1. */
    readonly currentPage: number;

    /** The number of the last page. */
    readonly lastPage: number;

    /** How many objects a page holds. */
    readonly perPage: number;

    /** How many objects the whole list holds. */
    readonly total: number;

    /** What the answer said about the list besides its objects, as the API sent it: its position, and anything else, such as its mode. */
    readonly meta: Attributes;

    /** The mode the list is in, for the lists whose answer says it, such as the coins on offer and the activity log; null for the others. */
    readonly mode: OrString<Mode> | null;

    readonly #fetch: (page: number) => Promise<Page<T>>;

    constructor(data: T[], position: PagePosition, fetch: (page: number) => Promise<Page<T>>, meta: Attributes = {}) {
        this.data = data;
        this.currentPage = position.currentPage;
        this.lastPage = position.lastPage;
        this.perPage = position.perPage;
        this.total = position.total;
        this.meta = meta;
        this.mode = nullableString(meta, 'mode');
        this.#fetch = fetch;
    }

    /** Whether there are pages after this one. */
    hasMore(): boolean {
        return this.currentPage < this.lastPage;
    }

    /** Fetch the next page, or null when this is the last. */
    async nextPage(): Promise<Page<T> | null> {
        return this.hasMore() ? this.#fetch(this.currentPage + 1) : null;
    }

    /** Iterate over the objects on this page and every page after it, fetching each as it is reached. */
    async *autoPagingIterator(): AsyncGenerator<T, void, undefined> {
        const seen = new Set<string>();
        let page: Page<T> = this;

        while (true) {
            for (const object of page.data) {
                const id = object.get('id');

                // A record created while paging pushes older ones onto the next page, so they can come round twice.
                if (typeof id === 'string') {
                    if (seen.has(id)) {
                        continue;
                    }

                    seen.add(id);
                }

                yield object;
            }

            const next = await page.nextPage();

            if (next === null || next.currentPage <= page.currentPage) {
                return;
            }

            page = next;
        }
    }

    /** Iterate over the objects on this page. */
    [Symbol.iterator](): Iterator<T> {
        return this.data[Symbol.iterator]();
    }

    /** Whether this page holds no objects. */
    isEmpty(): boolean {
        return this.data.length === 0;
    }
}

/** The coins on offer, which assets.list() answers with in a single page, with the currencies their prices can be asked in. */
export class AssetPage extends Page<SupportedAsset> {
    /** The currencies assets.list() can give prices in, which its currency parameter takes. */
    readonly currencies: OrString<Currency>[];

    constructor(data: SupportedAsset[], position: PagePosition, fetch: (page: number) => Promise<Page<SupportedAsset>>, meta: Attributes = {}) {
        super(data, position, fetch, meta);

        this.currencies = strings(meta, 'currencies');
    }
}
