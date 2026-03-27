# 커스텀 필드 시스템 설계

> **작성일:** 2026-03-27
> **맥락:** Peaknode는 로우코드 커머스 솔루션을 지향한다. 판매자마다 요구하는 도메인 모델이 다르기 때문에, 코드 수정 없이 엔터티를 확장할 수 있는 메커니즘이 필요했다.

---

## 배경: 왜 커스텀 필드가 필요한가

커머스 플랫폼을 만들 때 가장 자주 부딪히는 문제 중 하나는 **도메인 다양성**이다.

의류 쇼핑몰은 `Product`에 `material`(소재), `washing_instruction`(세탁 방법)이 필요하다. 전자제품 쇼핑몰은 `warranty_period`(보증 기간), `voltage`(전압)가 필요하다. B2B 플랫폼은 `customer`에 `company_registration_number`(사업자등록번호)가 필요하다.

이걸 모두 엔터티 컬럼으로 미리 정의해두는 건 불가능하다. Shopify, Vendure 같은 상용 플랫폼이 "Custom Fields" 혹은 "Metafields" 기능을 제공하는 이유다.

---

## 설계 옵션 검토

### Option A: 별도 Key-Value 테이블

```
custom_field_value
  id, entity_id, entity_type, field_name, field_value (varchar)
```

가장 전통적인 EAV(Entity-Attribute-Value) 패턴이다.

**장점:** 스키마 변경 없이 필드 추가 가능
**단점:**
- 타입 정보가 사라진다. 모든 값이 문자열로 저장되어 `2`와 `"2"`를 구분할 수 없다.
- JOIN 비용. `Product`와 커스텀 필드를 함께 조회하려면 항상 JOIN이 필요하다.
- 조회 쿼리가 복잡해진다. 특정 커스텀 필드로 필터링하려면 서브쿼리나 동적 pivot이 필요하다.

### Option B: JSONB 컬럼 (PostgreSQL)

엔터티에 `custom_fields jsonb` 컬럼 하나를 추가하고, 모든 커스텀 필드를 JSON으로 저장한다.

**장점:** 조회가 단순하다. `Product`를 가져오면 `customFields`도 같이 온다.
**단점:** MySQL에서 JSONB가 없다. 인덱싱 제한.

### Option C: simple-json + 별도 정의 테이블 (채택)

현재 스택이 MySQL이고, 커스텀 필드를 인덱싱해서 검색하는 요구사항은 없다고 판단했다. 따라서 TypeORM의 `type: "simple-json"`을 사용해 TEXT 컬럼에 JSON을 직렬화/역직렬화하는 방식을 선택했다.

타입 안전성은 런타임 검증으로 보완한다. 별도의 `custom_field_definition` 테이블에 각 필드의 타입 정보를 저장하고, 엔터티 저장 전 서비스 레이어에서 검증한다.

---

## 구조

```
custom_field_definition (테이블)
  id              UUID PK
  entity_name     enum (Product | Customer | User | Administrator)
  name            string  -- 필드 키 이름, snake_case 권장
  type            enum (string | int | float | boolean | datetime | text)
  label           string?  -- UI 표시용
  required        boolean
  list            boolean  -- true면 배열 타입
  default_value   simple-json?

  UNIQUE(entity_name, name)
  INDEX(entity_name)
```

```
product (테이블)
  ...기존 컬럼들...
  custom_fields   TEXT (JSON 직렬화)
```

---

## 데이터 흐름

```
관리자 → CustomFieldsService.create()
  → custom_field_definition 레코드 생성
  → 이후 Product 생성/수정 시 customFields 값 허용

판매자 → ProductService.create({ ..., customFields: { warranty_period: "2년" } })
  → CustomFieldsService.validate("Product", customFields)
      1. 미정의 키 거부 (whitelist)
      2. required 필드 누락 체크
      3. 타입 검증 (assertSingleValue / assertFieldType)
  → Product 저장
```

---

## 핵심 설계 결정

### 1. type은 immutable

커스텀 필드 타입은 **생성 후 변경할 수 없다.** `string`으로 만든 필드를 `int`로 바꾸면 이미 저장된 데이터가 타입 불일치 상태가 된다. 이를 방지하기 위해 `UpdateCustomFieldDefinitionDto`에서 `type`을 제외했다.

```typescript
// update DTO에는 type이 없다
export class UpdateCustomFieldDefinitionDto {
  label?: string | null;
  required?: boolean;
  list?: boolean;
  defaultValue?: unknown | null;
}
```

### 2. list 플래그로 배열 지원

별도의 `ArrayType`을 만드는 대신 `list: boolean` 플래그로 배열 여부를 분리했다. `type: "string"` + `list: true`이면 `string[]`이다. 이렇게 하면 타입 enum을 단순하게 유지하면서 배열 지원이 가능하다.

```typescript
// 검증 시 list 여부 분기
private assertFieldType(key, value, def) {
  if (def.list) {
    if (!Array.isArray(value)) throw ...;
    for (const item of value) this.assertSingleValue(key, item, def.type);
  } else {
    this.assertSingleValue(key, value, def.type);
  }
}
```

### 3. whitelist 검증

미정의 키를 허용하지 않는다. 정의에 없는 키가 들어오면 `BadRequestException`을 던진다. 이렇게 하면 오타로 인한 잘못된 데이터 저장을 방지하고, 커스텀 필드 데이터가 항상 정의와 동기화된 상태를 유지한다.

### 4. 새 엔터티 추가 비용이 낮다

새 엔터티에 커스텀 필드를 추가하는 절차:

1. 엔터티에 컬럼 추가
   ```typescript
   @Column({ name: "custom_fields", type: "simple-json", nullable: true })
   customFields: Record<string, unknown> | null;
   ```
2. `CustomFieldEntityName` enum에 이름 추가
3. 해당 엔터티의 create/update 서비스에서 `validate()` 호출

스키마 마이그레이션 한 줄, enum 한 줄, 서비스 호출 한 줄이다. 기존 로직에는 거의 영향을 주지 않는다.

---

## 한계와 트레이드오프

| 항목 | 현재 접근 | 대안 |
|---|---|---|
| 커스텀 필드로 검색/필터링 | 어렵다 (JSON 풀스캔) | PostgreSQL JSONB + GIN 인덱스 |
| 타입 안전성 | 런타임 검증 | 별도 typed value 테이블 |
| 필드 삭제 시 기존 데이터 | 남아있음 (孤立) | 삭제 시 데이터 정리 job 필요 |
| 커스텀 필드 수 제한 | 없음 (TEXT 크기 제한) | — |

커스텀 필드를 조건으로 상품을 검색하는 요구사항이 생기면, 검색 엔진(Elasticsearch 등)으로 분리하는 것이 현실적이다. MySQL에서 JSON 컬럼 풀스캔으로 처리하는 것은 규모가 커지면 한계가 명확하다.

---

## 참고

- [Vendure Custom Fields](https://docs.vendure.io/guides/developer-guide/custom-fields/) — 이 프로젝트의 커스텀 필드 설계에 가장 큰 영향을 준 레퍼런스
- [TypeORM simple-json](https://typeorm.io/entities#column-types-for-mysql--mariadb) — TEXT 컬럼에 JSON 직렬화
- 구현 파일:
  - 엔터티: `packages/core/src/entity/custom-field/custom-field-definition.entity.ts`
  - 서비스: `packages/core/src/service/custom-field/custom-field.service.ts`
