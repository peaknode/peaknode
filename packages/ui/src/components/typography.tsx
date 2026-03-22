import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@bootleg/ui/lib/utils"

// ─── Text ─────────────────────────────────────────────────────────────────────
// 범용 인라인/블록 텍스트. size, weight, color, leading, tracking 조합 가능

const textVariants = cva("", {
  variants: {
    size: {
      "2xs": "text-[10px]",
      xs:   "text-xs",
      sm:   "text-sm",
      base: "text-base",
      lg:   "text-lg",
      xl:   "text-xl",
      "2xl":"text-2xl",
      "3xl":"text-3xl",
      "4xl":"text-4xl",
      "5xl":"text-5xl",
    },
    weight: {
      thin:      "font-thin",
      light:     "font-light",
      normal:    "font-normal",
      medium:    "font-medium",
      semibold:  "font-semibold",
      bold:      "font-bold",
      extrabold: "font-extrabold",
    },
    color: {
      default:     "text-foreground",
      muted:       "text-muted-foreground",
      primary:     "text-primary",
      destructive: "text-destructive",
      success:     "text-green-600 dark:text-green-400",
      warning:     "text-yellow-600 dark:text-yellow-400",
      inherit:     "text-inherit",
    },
    leading: {
      none:    "leading-none",
      tight:   "leading-tight",
      snug:    "leading-snug",
      normal:  "leading-normal",
      relaxed: "leading-relaxed",
      loose:   "leading-loose",
    },
    tracking: {
      tighter: "tracking-tighter",
      tight:   "tracking-tight",
      normal:  "tracking-normal",
      wide:    "tracking-wide",
      wider:   "tracking-wider",
      widest:  "tracking-widest",
    },
    align: {
      left:    "text-left",
      center:  "text-center",
      right:   "text-right",
      justify: "text-justify",
    },
    truncate: {
      true:  "truncate",
      false: "",
    },
    clamp: {
      "1": "line-clamp-1",
      "2": "line-clamp-2",
      "3": "line-clamp-3",
      "4": "line-clamp-4",
    },
  },
  defaultVariants: {
    size:    "base",
    weight:  "normal",
    color:   "default",
    leading: "normal",
  },
})

type TextProps = React.ComponentProps<"p"> &
  VariantProps<typeof textVariants> & {
    as?: React.ElementType
    asChild?: boolean
  }

function Text({
  className,
  size,
  weight,
  color,
  leading,
  tracking,
  align,
  truncate,
  clamp,
  as: Tag = "p",
  asChild = false,
  ...props
}: TextProps) {
  const Comp = asChild ? Slot.Root : Tag
  return (
    <Comp
      data-slot="text"
      className={cn(textVariants({ size, weight, color, leading, tracking, align, truncate, clamp, className }))}
      {...props}
    />
  )
}

// ─── Heading ──────────────────────────────────────────────────────────────────
// h1~h6 프리셋. asChild로 다른 태그로 렌더 가능

const headingVariants = cva("scroll-m-20 tracking-tight", {
  variants: {
    level: {
      1: "text-4xl font-bold lg:text-5xl",
      2: "text-3xl font-semibold",
      3: "text-2xl font-semibold",
      4: "text-xl font-semibold",
      5: "text-lg font-medium",
      6: "text-base font-medium",
    },
    color: {
      default:     "text-foreground",
      muted:       "text-muted-foreground",
      primary:     "text-primary",
      destructive: "text-destructive",
      inherit:     "text-inherit",
    },
  },
  defaultVariants: {
    level: 1,
    color: "default",
  },
})

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

type HeadingProps = React.ComponentProps<"h1"> &
  VariantProps<typeof headingVariants> & {
    level?: HeadingLevel
    asChild?: boolean
  }

function Heading({ className, level = 1, color, asChild = false, ...props }: HeadingProps) {
  const Tag = asChild ? Slot.Root : (`h${level}` as React.ElementType)
  return (
    <Tag
      data-slot="heading"
      className={cn(headingVariants({ level, color, className }))}
      {...props}
    />
  )
}

// 개별 단축 컴포넌트
const H1 = (props: Omit<HeadingProps, "level">) => <Heading level={1} {...props} />
const H2 = (props: Omit<HeadingProps, "level">) => <Heading level={2} {...props} />
const H3 = (props: Omit<HeadingProps, "level">) => <Heading level={3} {...props} />
const H4 = (props: Omit<HeadingProps, "level">) => <Heading level={4} {...props} />
const H5 = (props: Omit<HeadingProps, "level">) => <Heading level={5} {...props} />
const H6 = (props: Omit<HeadingProps, "level">) => <Heading level={6} {...props} />

H1.displayName = "H1"
H2.displayName = "H2"
H3.displayName = "H3"
H4.displayName = "H4"
H5.displayName = "H5"
H6.displayName = "H6"

// ─── Display ──────────────────────────────────────────────────────────────────
// 히어로/랜딩 섹션용 대형 텍스트

const displayVariants = cva("font-bold tracking-tighter text-foreground", {
  variants: {
    size: {
      sm: "text-4xl lg:text-5xl",
      md: "text-5xl lg:text-6xl",
      lg: "text-6xl lg:text-7xl",
      xl: "text-7xl lg:text-8xl",
    },
  },
  defaultVariants: { size: "md" },
})

type DisplayProps = React.ComponentProps<"h1"> & VariantProps<typeof displayVariants>

function Display({ className, size, ...props }: DisplayProps) {
  return (
    <h1
      data-slot="display"
      className={cn(displayVariants({ size, className }))}
      {...props}
    />
  )
}

// ─── Semantic helpers ─────────────────────────────────────────────────────────

/** 섹션 도입부 리드 문장. text-xl muted */
function Lead({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="lead"
      className={cn("text-xl text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  )
}

/** 강조된 큰 텍스트 */
function Large({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="large"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

/** 보조 작은 텍스트 */
function Small({ className, ...props }: React.ComponentProps<"small">) {
  return (
    <small
      data-slot="small"
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  )
}

/** 흐린 설명 텍스트 */
function Muted({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="muted"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/** 캡션 / 레이블 위 오버라인 */
function Caption({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="caption"
      className={cn("text-xs text-muted-foreground tracking-wide uppercase", className)}
      {...props}
    />
  )
}

// ─── 인라인 스타일 ─────────────────────────────────────────────────────────────

/** 인라인 코드 */
function InlineCode({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      data-slot="inline-code"
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
        className,
      )}
      {...props}
    />
  )
}

/** 키보드 단축키 */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

/** 인용구 */
function Blockquote({ className, ...props }: React.ComponentProps<"blockquote">) {
  return (
    <blockquote
      data-slot="blockquote"
      className={cn("mt-6 border-l-2 pl-6 italic text-muted-foreground", className)}
      {...props}
    />
  )
}

/** 강조 마크 */
function Mark({ className, ...props }: React.ComponentProps<"mark">) {
  return (
    <mark
      data-slot="mark"
      className={cn("bg-yellow-200 text-yellow-900 rounded-sm px-0.5 dark:bg-yellow-800 dark:text-yellow-100", className)}
      {...props}
    />
  )
}

export {
  // 범용
  Text,
  textVariants,
  // 헤딩
  Heading,
  headingVariants,
  H1, H2, H3, H4, H5, H6,
  // 디스플레이
  Display,
  displayVariants,
  // 시맨틱 헬퍼
  Lead,
  Large,
  Small,
  Muted,
  Caption,
  // 인라인
  InlineCode,
  Kbd,
  Blockquote,
  Mark,
}
