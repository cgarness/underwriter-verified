import { LegalBrand } from "@/hooks/useLegalBrand";

export default function BrandContactBlock({ brand }: { brand: LegalBrand }) {
  return (
    <div className="text-sm text-muted-foreground leading-relaxed">
      {brand.agency ? <p>{brand.agency}</p> : null}
      {brand.name ? <p>{brand.name}</p> : null}
      {brand.addressLine1 ? <p>{brand.addressLine1}</p> : null}
      {brand.addressLine2 ? <p>{brand.addressLine2}</p> : null}
      {brand.phone ? <p className="mt-2">Phone: {brand.phone}</p> : null}
      <p>
        Email:{" "}
        <a href={`mailto:${brand.email}`} className="underline underline-offset-2 hover:text-accent">
          {brand.email}
        </a>
      </p>
    </div>
  );
}
