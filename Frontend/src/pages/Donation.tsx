import { useState } from 'react';

/* Donation products - these are the 5 preset donation amounts */
const DONATION_PRODUCTS = [
  { id: "supporter", name: "Supporter Donation", amount: 0.25, description: "Support the platform. Great for showing you care!" },
  { id: "small", name: "Small Donation", amount: 0.50, description: "A small contribution to help keep the platform running." },
  { id: "standard", name: "Standard Donation", amount: 1.00, description: "A standard contribution to support ongoing development." },
  { id: "generous", name: "Generous Donation", amount: 2.50, description: "A generous contribution greatly appreciated!" },
  { id: "maximum", name: "Maximum Donation", amount: 5.00, description: "The maximum donation amount. Thank you!" },
];

export default function Donation() {
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; amount: number; description: string } | null>(null);

  /* Show product grid if nothing selected yet */
  if (!selectedProduct) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Support Karlin_ux</h1>
          <p className="text-[var(--text-secondary)] mb-8">Help us continue our work by choosing a donation amount.</p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {DONATION_PRODUCTS.map((product) => {
              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="card p-6 hover:border-[var(--accent)]/30 transition-all duration-200 cursor-pointer"
                >
                  <div className="text-3xl font-bold text-[var(--accent)] mb-2">${product.amount}</div>
                  <h3 className="font-bold">{product.name}</h3>
                  <p className="text-[var(--text-secondary)] text-sm">{product.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* Product selected - show highlighting is no longer needed since product is selected */
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center card p-8">
        <h2 className="text-2xl font-bold mb-4">Thank You</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Donation of <strong>{selectedProduct?.amount}</strong> USD selected.
        </p>
        <p className="text-[var(--text-secondary)]">
          Please complete the payment through your chosen method.
        </p>
        <button onClick={() => setSelectedProduct(null)} className="text-sm text-[var(--text-muted)]">
          Choose different amount
        </button>
      </div>
    </div>
  );
}
