# @peaknode/core 구현 TODO

> 체크박스로 진행상황 추적. 컨텍스트 이어받을 때 이 파일을 먼저 확인.
> 계획 상세: `.claude/plans/greedy-squishing-toucan.md`

---

## 사전 작업: Entity GraphQL 데코레이터 추가

엔터티에 `@ObjectType()` / `@Field()` 없으면 리졸버 작성 불가.

- [x] `src/entity/asset/asset.entity.ts` — `@ObjectType()`, `@Field()` 추가
- [x] `src/entity/shipping/shipping-method.entity.ts` — `@ObjectType()`, `@Field()` 추가
- [x] `src/entity/cart/cart.entity.ts` — `@ObjectType()`, `@Field()` 추가
- [x] `src/entity/cart/cart-item.entity.ts` — `@ObjectType()`, `@Field()` 추가
- [x] `src/entity/order/order.entity.ts` — `@ObjectType()`, `@Field()`, `@registerEnumType(OrderState)` 추가
- [x] `src/entity/order/order-line.entity.ts` — `@ObjectType()`, `@Field()` 추가
- [x] `src/entity/order/payment.entity.ts` — `@ObjectType()`, `@Field()`, `@registerEnumType(PaymentState)` 추가
- [x] `src/entity/order/fulfillment.entity.ts` — `@ObjectType()`, `@Field()`, `@registerEnumType(FulfillmentState)` 추가
- [x] `src/entity/promotion/promotion.entity.ts` — `@ObjectType()`, `@Field()`, `@registerEnumType(DiscountType)` 추가
- [x] `src/entity/address/address.entity.ts` — `@ObjectType()`, `@Field()`, `customerId` 스칼라 FK 추가
- [x] `src/entity/wishlist/wishlist.entity.ts` — `@ObjectType()`, `@Field()`, `customerId` 스칼라 FK 추가
- [x] `src/entity/wishlist/wishlist-item.entity.ts` — `@ObjectType()`, `@Field()` 추가

---

## 1차 우선순위

### 1. Asset Upload (파일 업로드) ✅

- [x] `src/service/asset/asset.service.ts`
  - [x] `upload(file, tagIds?)` — MinIO 업로드 → Asset DB 저장
  - [x] `findAll(options)`, `findOne(id)`
  - [x] `delete(id)` — 사용 중인 경우 ConflictException
  - [x] `getUrl(source)` — objectKey → 공개 URL
- [x] `src/service/dto/asset/list-assets.dto.ts`
- [x] `src/service/dto/asset/update-asset.dto.ts`
- [x] `src/api/resolvers/admin/asset.resolver.ts` — 목록/단건/수정/삭제
- [x] `src/api/resolvers/admin/asset.controller.ts` — REST POST `/admin-api/assets/upload`
- [x] `src/api/types/asset-list-result.type.ts`
- [x] `src/service/service.module.ts` — `AssetService` 등록
- [x] `src/api/admin-api.module.ts` — `AssetResolver`, `AssetController` 등록
- [x] Bruno: `api-collection/에셋/어드민/` — 5개 파일 (업로드REST 포함)

### 2. ShippingMethod (배송 방법) ✅

- [x] `src/service/shipping/shipping-method.service.ts`
  - [x] `findAll(options)`, `findOne(id)`, `findByCode(code)`
  - [x] `create(dto)` — 코드 중복 체크
  - [x] `update(id, dto)`, `delete(id)` — 사용 중인 주문 ConflictException
  - [x] `calculateShipping(method, subTotal)` — CartService/OrderService 재사용
- [x] `src/service/dto/shipping/create-shipping-method.dto.ts`
- [x] `src/service/dto/shipping/update-shipping-method.dto.ts`
- [x] `src/service/dto/shipping/list-shipping-methods.dto.ts`
- [x] `src/api/resolvers/admin/shipping-method.resolver.ts`
- [x] `src/api/resolvers/shop/shop-shipping-method.resolver.ts` — `availableShippingMethods` (enabled=true)
- [x] `src/api/types/shipping-method-list-result.type.ts`
- [x] `src/common/permissions/permission.enum.ts` — `ShippingMethodCreate/Read/Update/Delete` 추가
- [x] 모듈 등록: `service.module.ts`, `admin-api.module.ts`, `shop-api.module.ts`
- [x] Bruno: `api-collection/배송방법/어드민/` 5개, `클라이언트/` 1개

### 3. Cart (장바구니)

- [ ] `src/service/cart/cart.service.ts`
  - [ ] `getOrCreateCart(token, customerId?)` — 게스트/회원 공용
  - [ ] `addItem(token, productVariantId, quantity)` — 재고 검증 + 수량 병합
  - [ ] `updateItemQuantity(token, cartItemId, quantity)` — 0이면 삭제
  - [ ] `removeItem(token, cartItemId)`, `clearCart(token)`
  - [ ] `mergeGuestCart(guestToken, customerId)` — 로그인 시 병합
  - [ ] `calculateCartTotals(cart)` — 순수 함수
- [ ] `src/service/dto/cart/add-cart-item.dto.ts`
- [ ] `src/service/dto/cart/update-cart-item.dto.ts`
- [ ] `src/api/shop-api/cart/shop-cart.resolver.ts`
  - [ ] `cart(token)` — 공개 쿼리
  - [ ] `addItemToCart`, `updateCartItemQuantity`, `removeCartItem`, `clearCart`
  - [ ] `mergeCart(guestToken)` — JwtAuthGuard
- [ ] 모듈 등록: `service.module.ts`, `shop-api.module.ts`
- [ ] Bruno: `api-collection/장바구니/클라이언트/` 6개

### 4. Order/Checkout (주문) — Cart + ShippingMethod 완료 후 진행

- [ ] `src/service/order/order.service.ts`
  - [ ] `checkout(cartToken, dto)` — Cart→Order 변환, 재고 확정(stockAllocated)
  - [ ] `transitionToState(id, state)` — 상태 전환 검증 + 재고 복원(취소)
  - [ ] `addPayment(orderId, dto)`, `settlePayment(paymentId, transactionId)`
  - [ ] `createFulfillment(orderId, dto)`, `updateFulfillment(id, dto)`
  - [ ] `findAll(options)`, `findOne(id)`, `findByCustomer(customerId, options)`
- [ ] `src/service/dto/order/checkout.dto.ts`
- [ ] `src/service/dto/order/list-orders.dto.ts`
- [ ] `src/service/dto/order/add-payment.dto.ts`
- [ ] `src/service/dto/order/create-fulfillment.dto.ts`
- [ ] `src/service/dto/order/update-fulfillment.dto.ts`
- [ ] `src/api/admin-api/order/order.resolver.ts` — 목록/단건/상태변경/결제/배송
- [ ] `src/api/shop-api/order/shop-order.resolver.ts` — `checkout`, `myOrders`, `myOrder`
- [ ] `src/api/types/order-list-result.type.ts`
- [ ] `src/api/types/order-address.type.ts`
- [ ] 모듈 등록: `service.module.ts`, `admin-api.module.ts`, `shop-api.module.ts`
- [ ] Bruno: `api-collection/주문/어드민/` 7개, `클라이언트/` 3개

---

## 2차 우선순위 (5~7 병렬 진행 가능)

### 5. Promotion/Coupon (프로모션)

- [ ] `src/service/promotion/promotion.service.ts`
  - [ ] `validateCoupon(code, subTotal, customerId?)` — 날짜/한도/고객별 제한
  - [ ] `calculateDiscount(promotion, subTotal)` — PERCENTAGE/FIXED_AMOUNT/FREE_SHIPPING
  - [ ] `incrementUsage(promotionId)` — 주문 완료 시 호출
  - [ ] CRUD: `findAll`, `findOne`, `create`, `update`, `delete`
- [ ] `src/service/dto/promotion/create-promotion.dto.ts`
- [ ] `src/service/dto/promotion/update-promotion.dto.ts`
- [ ] `src/service/dto/promotion/list-promotions.dto.ts`
- [ ] `src/api/admin-api/promotion/promotion.resolver.ts`
- [ ] `src/api/shop-api/promotion/shop-promotion.resolver.ts` — `applyCoupon` (공개)
- [ ] `src/api/types/promotion-list-result.type.ts`
- [ ] `src/api/types/promotion-preview.type.ts`
- [ ] `src/common/permissions/permission.enum.ts` — `PromotionCreate/Read/Update/Delete` 추가
- [ ] 모듈 등록
- [ ] Bruno: `api-collection/프로모션/어드민/` 5개, `클라이언트/` 1개

### 6. Collection (컬렉션)

- [ ] `src/service/collection/collection.service.ts`
  - [ ] `findAll(options)`, `findOne(id)`, `findBySlug(slug)`, `findTree()`
  - [ ] `create(dto)` — slug 중복 체크, 부모 검증
  - [ ] `update(id, dto)` — 트리 이동 가능
  - [ ] `delete(id)` — 자식 존재 시 ConflictException
  - [ ] `reorderChildren(parentId, collectionIds)` — position 업데이트
- [ ] `src/service/dto/collection/create-collection.dto.ts`
- [ ] `src/service/dto/collection/update-collection.dto.ts`
- [ ] `src/service/dto/collection/list-collections.dto.ts`
- [ ] `src/api/admin-api/collection/collection.resolver.ts`
- [ ] `src/api/shop-api/collection/shop-collection.resolver.ts` — isPrivate=false 필터
- [ ] `src/api/types/collection-list-result.type.ts`
- [ ] 모듈 등록
- [ ] Bruno: `api-collection/컬렉션/어드민/` 6개, `클라이언트/` 3개

### 7. Customer/Address (고객)

- [ ] `src/service/customer/customer.service.ts`
  - [ ] `findAll`, `findOne(id)`, `findByUserId(userId)`, `findByEmail(email)`
  - [ ] `update(id, dto)` — 커스텀 필드 검증 포함
  - [ ] `deactivate(id)` — `isActive=false`
  - [ ] `addAddress(customerId, dto)` — defaultAddress 설정 시 기존 default 해제
  - [ ] `updateAddress(addressId, dto)`, `deleteAddress(addressId)`
- [ ] `src/service/dto/customer/update-customer.dto.ts`
- [ ] `src/service/dto/customer/list-customers.dto.ts`
- [ ] `src/service/dto/customer/create-address.dto.ts`
- [ ] `src/service/dto/customer/update-address.dto.ts`
- [ ] `src/api/admin-api/customer/customer.resolver.ts`
- [ ] `src/api/shop-api/customer/shop-customer.resolver.ts` — `me()`, 주소 CRUD
- [ ] `src/api/types/customer-list-result.type.ts`
- [ ] 모듈 등록
- [ ] Bruno: `api-collection/고객/어드민/` 4개, `클라이언트/` 4개

### 8. Wishlist (위시리스트) — CustomerService 완료 후 진행

- [ ] `src/service/wishlist/wishlist.service.ts`
  - [ ] `getWishlist(customerId)` — Lazy creation
  - [ ] `addItem(customerId, dto)` — 중복 체크, Variant 검증
  - [ ] `removeItem(customerId, wishlistItemId)` — 소유권 검증
  - [ ] `convertToCart(customerId, cartToken)` — Wishlist → Cart 변환
- [ ] `src/service/dto/wishlist/add-wishlist-item.dto.ts`
- [ ] `src/api/shop-api/wishlist/shop-wishlist.resolver.ts` — 모두 JwtAuthGuard
- [ ] 모듈 등록
- [ ] Bruno: `api-collection/위시리스트/클라이언트/` 4개

---

## 검증 체크리스트 (기능별 완료 시)

- [ ] `pnpm --filter @peaknode/core build` — 타입 에러 없음
- [ ] `pnpm --filter @peaknode/core test` — 유닛 테스트 통과
- [ ] Bruno 직접 실행으로 API 응답 검증
