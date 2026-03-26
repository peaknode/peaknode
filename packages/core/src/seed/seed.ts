/**
 * 로컬 개발용 시드 스크립트.
 *
 * TypeORM DataSource를 직접 생성해 단일 트랜잭션으로 시드 데이터를 삽입한다.
 * NestJS 부트스트랩 없이 실행되므로 2초 이내에 완료된다.
 *
 * @example
 * pnpm --filter @peaknode/core seed
 *
 * @remarks
 * 멱등성 보장: Product 데이터가 이미 존재하면 건너뜀.
 * 재실행하려면 DB를 초기화한 뒤 다시 실행한다.
 */
import "reflect-metadata";
import { DataSource, EntityManager } from "typeorm";
import { Administrator } from "src/entity/administrator/administrator.entity";
import { Role } from "src/entity/administrator/role.entity";
import { Address } from "src/entity/address/address.entity";
import { Asset } from "src/entity/asset/asset.entity";
import { Cart } from "src/entity/cart/cart.entity";
import { CartItem } from "src/entity/cart/cart-item.entity";
import { Customer } from "src/entity/customer/customer.entity";
import { Order } from "src/entity/order/order.entity";
import { OrderLine } from "src/entity/order/order-line.entity";
import { Payment } from "src/entity/order/payment.entity";
import { Fulfillment } from "src/entity/order/fulfillment.entity";
import { Collection } from "src/entity/product/collection.entity";
import { Facet } from "src/entity/product/facet.entity";
import { FacetValue } from "src/entity/product/facet-value.entity";
import { Product } from "src/entity/product/product.entity";
import { ProductAsset } from "src/entity/product/product-asset.entity";
import { ProductOption } from "src/entity/product/product-option.entity";
import { ProductOptionGroup } from "src/entity/product/product-option-group.entity";
import { ProductVariant } from "src/entity/product/product-variant.entity";
import { ProductVariantAsset } from "src/entity/product/product-variant-asset.entity";
import { Promotion } from "src/entity/promotion/promotion.entity";
import { ShippingMethod } from "src/entity/shipping/shipping-method.entity";
import { AuthenticationMethod } from "src/entity/user/authentication-method.entity";
import { User } from "src/entity/user/user.entity";
import { Wishlist } from "src/entity/wishlist/wishlist.entity";
import { WishlistItem } from "src/entity/wishlist/wishlist-item.entity";

/** 로컬 개발 DB DataSource */
const AppDataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 33061,
  username: "dev-peaknode",
  password: "dev-peaknode",
  database: "dev-peaknode",
  synchronize: false,
  entities: [
    Administrator,
    Role,
    Address,
    Asset,
    Cart,
    CartItem,
    Customer,
    Order,
    OrderLine,
    Payment,
    Fulfillment,
    Collection,
    Facet,
    FacetValue,
    Product,
    ProductAsset,
    ProductOption,
    ProductOptionGroup,
    ProductVariant,
    ProductVariantAsset,
    Promotion,
    ShippingMethod,
    AuthenticationMethod,
    User,
    Wishlist,
    WishlistItem,
  ],
});

/**
 * ProductOptionGroup과 ProductOption을 저장하고 저장된 옵션 목록을 반환한다.
 *
 * cascade 저장 후 ID가 할당된 Option 엔터티를 re-fetch한다.
 *
 * @param manager - 트랜잭션 EntityManager
 * @param groupData - 그룹 기본 데이터
 * @param optionsData - 옵션 값 목록
 * @returns 저장된 ProductOption 배열
 */
async function createOptionGroup(
  manager: EntityManager,
  groupData: { name: string; code: string; productId: string },
  optionsData: Array<{ name: string; code: string }>,
): Promise<{ group: ProductOptionGroup; options: ProductOption[] }> {
  const group = manager.create(ProductOptionGroup, groupData);
  group.options = optionsData.map((o) => manager.create(ProductOption, o));
  await manager.save(ProductOptionGroup, group);

  // cascade 저장 후 ID 할당된 상태로 re-fetch
  const saved = await manager.findOne(ProductOptionGroup, {
    where: { id: group.id },
    relations: ["options"],
  });

  return { group, options: saved!.options };
}

/**
 * ProductVariant를 생성하고 저장한다.
 *
 * @param manager - 트랜잭션 EntityManager
 * @param data - Variant 기본 데이터
 * @param selectedOptions - 이 Variant가 선택한 ProductOption 배열
 */
async function createVariant(
  manager: EntityManager,
  data: { name: string; sku: string; price: number; stockOnHand: number; productId: string },
  selectedOptions: ProductOption[],
): Promise<ProductVariant> {
  const variant = manager.create(ProductVariant, {
    ...data,
    enabled: true,
    stockAllocated: 0,
    trackInventory: true,
    outOfStockThreshold: 0,
    featuredAssetId: null,
    options: selectedOptions,
  });
  return manager.save(ProductVariant, variant);
}

async function seed() {
  await AppDataSource.initialize();
  console.log("✓ DB 연결됨");

  await AppDataSource.transaction(async (manager) => {
    // 멱등성 체크
    const existingCount = await manager.count(Product);
    if (existingCount > 0) {
      console.log(`시드 데이터가 이미 존재합니다 (Product ${existingCount}개). 건너뜁니다.`);
      return;
    }

    // -------------------------------------------------------------------------
    // 1. Facet + FacetValue (cascade 저장)
    // -------------------------------------------------------------------------

    const brandFacet = manager.create(Facet, { name: "브랜드", code: "brand", isPrivate: false });
    brandFacet.values = [
      manager.create(FacetValue, { name: "나이키", code: "nike" }),
      manager.create(FacetValue, { name: "아디다스", code: "adidas" }),
      manager.create(FacetValue, { name: "뉴발란스", code: "new-balance" }),
    ];
    await manager.save(Facet, brandFacet);

    const materialFacet = manager.create(Facet, { name: "소재", code: "material", isPrivate: false });
    materialFacet.values = [
      manager.create(FacetValue, { name: "면", code: "cotton" }),
      manager.create(FacetValue, { name: "폴리에스터", code: "polyester" }),
      manager.create(FacetValue, { name: "혼방", code: "mixed" }),
    ];
    await manager.save(Facet, materialFacet);

    const [nikeFv, adidasFv] = brandFacet.values;
    const [cottonFv, polyesterFv, mixedFv] = materialFacet.values;

    console.log("✓ Facet + FacetValue 생성 완료");

    // -------------------------------------------------------------------------
    // 2. Collection 계층 (루트 → 패션 → 남성/여성/유니섹스)
    // -------------------------------------------------------------------------

    const rootCollection = manager.create(Collection, {
      name: "__루트__",
      slug: "__root__",
      isRoot: true,
      position: 0,
      isPrivate: true,
      description: null,
      parentId: null,
      featuredAssetId: null,
    });
    await manager.save(Collection, rootCollection);

    const fashionCollection = manager.create(Collection, {
      name: "패션",
      slug: "fashion",
      isRoot: false,
      position: 0,
      isPrivate: false,
      description: "패션 전체 컬렉션",
      parentId: rootCollection.id,
      featuredAssetId: null,
    });
    await manager.save(Collection, fashionCollection);

    const mensCollection = manager.create(Collection, {
      name: "남성",
      slug: "mens",
      isRoot: false,
      position: 0,
      isPrivate: false,
      description: "남성 의류 컬렉션",
      parentId: fashionCollection.id,
      featuredAssetId: null,
    });
    const womensCollection = manager.create(Collection, {
      name: "여성",
      slug: "womens",
      isRoot: false,
      position: 1,
      isPrivate: false,
      description: "여성 의류 컬렉션",
      parentId: fashionCollection.id,
      featuredAssetId: null,
    });
    const unisexCollection = manager.create(Collection, {
      name: "유니섹스",
      slug: "unisex",
      isRoot: false,
      position: 2,
      isPrivate: false,
      description: "남녀 공용 의류",
      parentId: fashionCollection.id,
      featuredAssetId: null,
    });
    await manager.save(Collection, [mensCollection, womensCollection, unisexCollection]);

    console.log("✓ Collection 계층 생성 완료");

    // -------------------------------------------------------------------------
    // 3. Product 1 — 베이직 반팔 티셔츠 (남성/유니섹스)
    // -------------------------------------------------------------------------

    const tee = manager.create(Product, {
      name: "베이직 반팔 티셔츠",
      slug: "basic-short-sleeve-tee",
      description: "어느 계절에나 부담없이 입기 좋은 베이직 반팔 티셔츠입니다.",
      enabled: true,
      featuredAssetId: null,
    });
    await manager.save(Product, tee);

    const { options: teeColors } = await createOptionGroup(
      manager,
      { name: "색상", code: "color", productId: tee.id },
      [
        { name: "흰색", code: "white" },
        { name: "검정", code: "black" },
        { name: "회색", code: "gray" },
      ],
    );
    const { options: teeSizes } = await createOptionGroup(
      manager,
      { name: "사이즈", code: "size", productId: tee.id },
      [
        { name: "S", code: "s" },
        { name: "M", code: "m" },
        { name: "L", code: "l" },
        { name: "XL", code: "xl" },
      ],
    );

    const [teeWhite, teeBlack, teeGray] = teeColors;
    const [teeS, teeM, teeL, teeXL] = teeSizes;

    await Promise.all([
      createVariant(manager, { name: "흰색 / S", sku: "TEE-WHITE-S", price: 29000, stockOnHand: 50, productId: tee.id }, [teeWhite, teeS]),
      createVariant(manager, { name: "흰색 / M", sku: "TEE-WHITE-M", price: 29000, stockOnHand: 80, productId: tee.id }, [teeWhite, teeM]),
      createVariant(manager, { name: "흰색 / L", sku: "TEE-WHITE-L", price: 29000, stockOnHand: 60, productId: tee.id }, [teeWhite, teeL]),
      createVariant(manager, { name: "검정 / S", sku: "TEE-BLACK-S", price: 29000, stockOnHand: 40, productId: tee.id }, [teeBlack, teeS]),
      createVariant(manager, { name: "검정 / M", sku: "TEE-BLACK-M", price: 29000, stockOnHand: 70, productId: tee.id }, [teeBlack, teeM]),
      createVariant(manager, { name: "회색 / M", sku: "TEE-GRAY-M", price: 29000, stockOnHand: 30, productId: tee.id }, [teeGray, teeM]),
      createVariant(manager, { name: "회색 / XL", sku: "TEE-GRAY-XL", price: 29000, stockOnHand: 20, productId: tee.id }, [teeGray, teeXL]),
    ]);

    tee.facetValues = [nikeFv, cottonFv];
    tee.collections = [mensCollection, unisexCollection];
    await manager.save(Product, tee);

    // -------------------------------------------------------------------------
    // 4. Product 2 — 오버핏 후드 집업 (남성)
    // -------------------------------------------------------------------------

    const hoodie = manager.create(Product, {
      name: "오버핏 후드 집업",
      slug: "overfit-hoodie-zip-up",
      description: "루즈한 실루엣으로 편안하게 입을 수 있는 후드 집업입니다.",
      enabled: true,
      featuredAssetId: null,
    });
    await manager.save(Product, hoodie);

    const { options: hoodieColors } = await createOptionGroup(
      manager,
      { name: "색상", code: "color", productId: hoodie.id },
      [
        { name: "베이지", code: "beige" },
        { name: "올리브", code: "olive" },
      ],
    );
    const { options: hoodieSizes } = await createOptionGroup(
      manager,
      { name: "사이즈", code: "size", productId: hoodie.id },
      [
        { name: "M", code: "m" },
        { name: "L", code: "l" },
        { name: "XL", code: "xl" },
      ],
    );

    const [hoodieBeige, hoodieOlive] = hoodieColors;
    const [hoodieM, hoodieL, hoodieXL] = hoodieSizes;

    await Promise.all([
      createVariant(manager, { name: "베이지 / M", sku: "HOODIE-BEIGE-M", price: 69000, stockOnHand: 25, productId: hoodie.id }, [hoodieBeige, hoodieM]),
      createVariant(manager, { name: "베이지 / L", sku: "HOODIE-BEIGE-L", price: 69000, stockOnHand: 30, productId: hoodie.id }, [hoodieBeige, hoodieL]),
      createVariant(manager, { name: "베이지 / XL", sku: "HOODIE-BEIGE-XL", price: 69000, stockOnHand: 15, productId: hoodie.id }, [hoodieBeige, hoodieXL]),
      createVariant(manager, { name: "올리브 / M", sku: "HOODIE-OLIVE-M", price: 69000, stockOnHand: 20, productId: hoodie.id }, [hoodieOlive, hoodieM]),
      createVariant(manager, { name: "올리브 / L", sku: "HOODIE-OLIVE-L", price: 69000, stockOnHand: 35, productId: hoodie.id }, [hoodieOlive, hoodieL]),
    ]);

    hoodie.facetValues = [adidasFv, mixedFv];
    hoodie.collections = [mensCollection];
    await manager.save(Product, hoodie);

    // -------------------------------------------------------------------------
    // 5. Product 3 — 크롭 니트 가디건 (여성/유니섹스)
    // -------------------------------------------------------------------------

    const cardigan = manager.create(Product, {
      name: "크롭 니트 가디건",
      slug: "crop-knit-cardigan",
      description: "부드러운 니트 소재의 크롭 기장 가디건입니다. 봄/가을에 레이어드하기 좋습니다.",
      enabled: true,
      featuredAssetId: null,
    });
    await manager.save(Product, cardigan);

    const { options: cardiganColors } = await createOptionGroup(
      manager,
      { name: "색상", code: "color", productId: cardigan.id },
      [
        { name: "아이보리", code: "ivory" },
        { name: "버건디", code: "burgundy" },
        { name: "카멜", code: "camel" },
      ],
    );
    const { options: cardiganSizes } = await createOptionGroup(
      manager,
      { name: "사이즈", code: "size", productId: cardigan.id },
      [
        { name: "S/M", code: "sm" },
        { name: "L/XL", code: "lxl" },
      ],
    );

    const [cardiganIvory, cardiganBurgundy, cardiganCamel] = cardiganColors;
    const [cardiganSM, cardiganLXL] = cardiganSizes;

    await Promise.all([
      createVariant(manager, { name: "아이보리 / S/M", sku: "CARD-IVORY-SM", price: 59000, stockOnHand: 40, productId: cardigan.id }, [cardiganIvory, cardiganSM]),
      createVariant(manager, { name: "아이보리 / L/XL", sku: "CARD-IVORY-LXL", price: 59000, stockOnHand: 30, productId: cardigan.id }, [cardiganIvory, cardiganLXL]),
      createVariant(manager, { name: "버건디 / S/M", sku: "CARD-BURG-SM", price: 59000, stockOnHand: 25, productId: cardigan.id }, [cardiganBurgundy, cardiganSM]),
      createVariant(manager, { name: "버건디 / L/XL", sku: "CARD-BURG-LXL", price: 59000, stockOnHand: 20, productId: cardigan.id }, [cardiganBurgundy, cardiganLXL]),
      createVariant(manager, { name: "카멜 / S/M", sku: "CARD-CAMEL-SM", price: 59000, stockOnHand: 15, productId: cardigan.id }, [cardiganCamel, cardiganSM]),
    ]);

    cardigan.facetValues = [nikeFv, polyesterFv];
    cardigan.collections = [womensCollection, unisexCollection];
    await manager.save(Product, cardigan);

    console.log("✓ Product 3개 생성 완료 (티셔츠, 후드집업, 가디건)");
    console.log("  - Variant: 티셔츠 7개, 후드집업 5개, 가디건 5개");
    console.log("  - FacetValue 연결: 브랜드/소재 각 1개씩");
    console.log("  - Collection 연결: 남성/여성/유니섹스");
  });

  await AppDataSource.destroy();
  console.log("\n✅ 시드 완료! GraphQL Playground에서 확인하세요:");
  console.log("   http://localhost:3000/admin-api");
  console.log("   query { products { total items { id name slug } } }");
}

seed().catch((e) => {
  console.error("❌ 시드 실패:", e);
  process.exit(1);
});
