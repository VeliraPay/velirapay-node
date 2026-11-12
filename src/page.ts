import type { ApiResource } from './resources/api-resource.ts';

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

    readonly #fetch: (page: number) => Promise<Page<T>>;

    constructor(data: T[], position: PagePosition, fetch: (page: number) => Promise<Page<T>>) {
        this.data = data;
        this.currentPage = position.currentPage;
        this.lastPage = position.lastPage;
        this.perPage = position.perPage;
        this.total = position.total;
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
