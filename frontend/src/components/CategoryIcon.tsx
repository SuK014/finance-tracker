import { categoryEmoji } from "@/lib/categoryIcon"

type Cat = { icon?: string | null; name?: string | null; type?: string | null; color?: string | null }

export default function CategoryIcon({ category, size }: { category: Cat | null | undefined; size?: "sm" | "lg" }) {
  return (
    <span
      className="cat-icon"
      data-size={size}
      aria-hidden="true"
      style={category?.color ? ({ ["--cat" as string]: category.color } as React.CSSProperties) : undefined}
    >
      {categoryEmoji(category)}
    </span>
  )
}
