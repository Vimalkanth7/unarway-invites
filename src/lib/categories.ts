export type CategorySlug = "marriage" | "reception" | "birthday" | "other";

export interface Category {
  slug: CategorySlug;
  label: string;
}

export const categories: Category[] = [
  { slug: "marriage", label: "Marriage" },
  { slug: "reception", label: "Reception" },
  { slug: "birthday", label: "Birthday" },
  { slug: "other", label: "Other" },
];

export function isCategorySlug(value: string): value is CategorySlug {
  return categories.some((c) => c.slug === value);
}
