"use client";

import { theme, fmt, styles } from "../../components/theme";
import useDeals from "../../hooks/api/useApiDeals";
import useIsMobile from "../../hooks/useIsMobile";
import useOrgContext from "../../hooks/useOrgContext";

export default function ListingsPage() {
  const { deals, loaded } = useDeals();
  const isMobile = useIsMobile();
  const { role } = useOrgContext();
  const pageHeading = role === "project_manager" ? "Completed Projects" : role === "finance_manager" ? "Property Sales" : role === "viewer" ? "Investment Exits" : "Property Listings";

  const listedDeals = deals.filter((d) => d.stage === "listed" || d.stage === "sold");

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: 0, marginBottom: 20 }}>{pageHeading}</h1>

      {listedDeals.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: theme.textDim }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#127968;</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>No listings yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Move a deal to the &ldquo;Listed&rdquo; stage to see it here</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {listedDeals.map((deal) => {
            const profit = deal.expectedSalePrice - deal.purchasePrice - deal.expenses.reduce((s, e) => s + (e.isProjected ? 0 : e.amount), 0);
            return (
              <div key={deal.id} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: 6, background: deal.stage === "sold" ? theme.green : theme.accent }} />
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>{deal.name}</div>
                      <div style={{ fontSize: 12, color: theme.textDim, marginTop: 2 }}>{deal.address}</div>
                    </div>
                    <span style={{
                      padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      color: deal.stage === "sold" ? theme.green : theme.orange,
                      background: deal.stage === "sold" ? `${theme.green}15` : `${theme.orange}15`,
                    }}>
                      {deal.stage === "sold" ? "SOLD" : "LISTED"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: theme.textDim }}>Asking Price</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{fmt(deal.expectedSalePrice)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: theme.textDim }}>Purchase Price</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{fmt(deal.purchasePrice)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${theme.cardBorder}` }}>
                    <div>
                      <div style={{ fontSize: 11, color: theme.textDim }}>Est. Profit</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: profit > 0 ? theme.green : theme.textDim }}>{fmt(profit)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: theme.textDim }}>Property</div>
                      <div style={{ fontSize: 13, color: theme.text }}>
                        {deal.data.prop.bedrooms} bed, {deal.data.prop.bathrooms} bath, {deal.data.prop.totalSqm}m&sup2;
                      </div>
                    </div>
                  </div>

                  {deal.listedDate && (
                    <div style={{ fontSize: 11, color: theme.textDim, marginTop: 10 }}>
                      Listed: {new Date(deal.listedDate).toLocaleDateString("en-ZA")}
                      {deal.soldDate && ` | Sold: ${new Date(deal.soldDate).toLocaleDateString("en-ZA")}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
