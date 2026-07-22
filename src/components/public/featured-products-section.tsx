import Image from "next/image";

import type { Locale } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { t } from "@/lib/i18n";
import { productName, type Product } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ProductGrid({
  products,
  locale,
  empty,
}: {
  products: Product[];
  locale: Locale;
  empty: string;
}) {
  if (!products.length) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center">
        {empty}
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <Card key={product.id} className="group overflow-hidden">
          <div className="bg-muted relative aspect-square">
            {(product.images?.[0] || product.image_url) ? (
              <Image
                src={product.images?.[0] || product.image_url!}
                alt={productName(product, locale)}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                unoptimized
              />
            ) : null}
            {product.is_featured ? (
              <Badge className="absolute start-2 top-2">
                {t(locale, "common", "featured")}
              </Badge>
            ) : null}
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{productName(product, locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            {product.price != null ? (
              <p className="font-semibold">{formatPrice(product.price, product.price_currency)}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FeaturedProductsSection({
  products,
  locale,
}: {
  products: Product[];
  locale: Locale;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h2 className="mb-8 text-3xl font-bold">{t(locale, "sections", "featured")}</h2>
      <ProductGrid
        products={products}
        locale={locale}
        empty={t(locale, "common", "no_items")}
      />
    </section>
  );
}

export function LatestProductsSection({
  products,
  locale,
}: {
  products: Product[];
  locale: Locale;
}) {
  return (
    <section className="bg-muted/20 mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h2 className="mb-8 text-3xl font-bold">{t(locale, "sections", "latest")}</h2>
      <ProductGrid
        products={products}
        locale={locale}
        empty={t(locale, "common", "no_items")}
      />
    </section>
  );
}
