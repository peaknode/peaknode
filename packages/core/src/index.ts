/**
 * @peaknode/core 공개 API.
 *
 * 외부 앱에서 이 패키지를 사용할 때 import하는 진입점.
 * 내부 구현 세부사항은 이 파일에서 노출하지 않는다.
 *
 * @example
 * // 외부 앱에서 사용
 * import { ProductService, Product, CreateProductDto } from '@peaknode/core';
 *
 * @module @peaknode/core
 */

// ---------------------------------------------------------------------------
// Modules — 외부 앱의 @Module imports에 사용
// ---------------------------------------------------------------------------
export { AppModule } from "./app.module";
export { DatabaseModule } from "./common/database/database.module";
export { ServiceModule } from "./service/service.module";
export { AdminApiModule } from "./api/admin-api.module";

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export { ProductService } from "./service/product/product.service";
export { ProductVariantService } from "./service/product/product-variant.service";
export { ProductOptionGroupService } from "./service/product/product-option-group.service";

// ---------------------------------------------------------------------------
// Transaction Infrastructure
// ---------------------------------------------------------------------------
export { TransactionConnection } from "./common/database/transaction-connection";
export { TransactionStore } from "./common/database/transaction-store";
export { Transactional } from "./common/database/transactional.decorator";
export type { TransactionalOptions } from "./common/database/transactional.decorator";

// ---------------------------------------------------------------------------
// Entities — Base
// ---------------------------------------------------------------------------
export { BaseEntity } from "./entity/base/base.entity";

// ---------------------------------------------------------------------------
// Entities — Product Domain
// ---------------------------------------------------------------------------
export { Product } from "./entity/product/product.entity";
export { ProductVariant } from "./entity/product/product-variant.entity";
export { ProductOptionGroup } from "./entity/product/product-option-group.entity";
export { ProductOption } from "./entity/product/product-option.entity";
export { ProductAsset } from "./entity/product/product-asset.entity";
export { ProductVariantAsset } from "./entity/product/product-variant-asset.entity";
export { Collection } from "./entity/product/collection.entity";
export { Facet } from "./entity/product/facet.entity";
export { FacetValue } from "./entity/product/facet-value.entity";

// ---------------------------------------------------------------------------
// Entities — User & Auth Domain
// ---------------------------------------------------------------------------
export { User } from "./entity/user/user.entity";
export { AuthenticationMethod } from "./entity/user/authentication-method.entity";

// ---------------------------------------------------------------------------
// Entities — Customer Domain
// ---------------------------------------------------------------------------
export { Customer } from "./entity/customer/customer.entity";
export { Address } from "./entity/address/address.entity";

// ---------------------------------------------------------------------------
// Entities — Administrator Domain
// ---------------------------------------------------------------------------
export { Administrator } from "./entity/administrator/administrator.entity";
export { Role } from "./entity/administrator/role.entity";

// ---------------------------------------------------------------------------
// Entities — Asset Domain
// ---------------------------------------------------------------------------
export { Asset, AssetType } from "./entity/asset/asset.entity";

// ---------------------------------------------------------------------------
// DTOs — Product
// ---------------------------------------------------------------------------
export { CreateProductDto } from "./service/dto/product/create-product.dto";
export { UpdateProductDto } from "./service/dto/product/update-product.dto";
export { ListProductsDto } from "./service/dto/product/list-products.dto";

// ---------------------------------------------------------------------------
// GraphQL Result Types
// ---------------------------------------------------------------------------
export { ProductListResult } from "./api/types/product-list-result.type";

// ---------------------------------------------------------------------------
// Common Types
// ---------------------------------------------------------------------------
export type { ListQueryOptions, SortParam, FilterParam } from "./common/types/common.type";
