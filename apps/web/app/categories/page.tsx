import { api } from "@/lib/api";
import { CategoryCard } from "@/components/category-card";
import { SectionHeading } from "@/components/ui";

export default async function CategoriesPage() {
  const categories = await api.getCategories();

  return (
    <div className="container-shell py-8 md:py-10">
      <SectionHeading
        title="Browse categories"
        subtitle="Find what you need faster, from lecture notes to electronics and hostel essentials."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category, i) => (
          <CategoryCard key={category.name} category={category} index={i} />
        ))}
      </div>
    </div>
  );
}
