import type { Page } from '../page.ts';
import type { CouponCreateParams, CouponListParams, CouponUpdateParams, RequestOptions } from '../params.ts';
import { Coupon } from '../resources/coupon.ts';
import { path, Service, withDecimalAmounts } from './service.ts';

/** The /v1/coupons endpoints, where a coupon's id is its code. */
export class CouponService extends Service {
    /** Create a coupon taking either percent_off or amount_off; currency is required with amount_off or min_amount. */
    async create(params: CouponCreateParams, options?: RequestOptions): Promise<Coupon> {
        return new Coupon(await this.request('POST', '/v1/coupons', withDecimalAmounts(params, 'percent_off', 'amount_off', 'min_amount'), options));
    }

    /** Retrieve a coupon by its code, in any case. */
    async retrieve(id: string): Promise<Coupon> {
        return new Coupon(await this.request('GET', path('/v1/coupons/%s', id)));
    }

    /** Change a coupon's limits; its code, discount, currency and minimum price cannot change. */
    async update(id: string, params: CouponUpdateParams, options?: RequestOptions): Promise<Coupon> {
        return new Coupon(await this.request('PATCH', path('/v1/coupons/%s', id), params, options));
    }

    /** List coupons, newest first. */
    async list(params: CouponListParams = {}): Promise<Page<Coupon>> {
        return this.page('/v1/coupons', params, (coupon) => new Coupon(coupon));
    }

    /** Iterate over every coupon, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<CouponListParams, 'page'> = {}): AsyncGenerator<Coupon, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }

    /** Delete a coupon; charges that used it keep its code and their discount. */
    async delete(id: string, options?: RequestOptions): Promise<void> {
        await this.respond('DELETE', path('/v1/coupons/%s', id), undefined, options);
    }
}
