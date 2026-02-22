/**
 * Client-side migration utility.
 * Run this in the browser console after logging in to migrate
 * localStorage data to the database.
 *
 * Usage: Copy-paste into browser console, then call migrateAll()
 */

async function migrateAll() {
  console.log("Starting localStorage migration...");

  // Migrate deals
  const dealsRaw = localStorage.getItem("justhousesErp_deals");
  if (dealsRaw) {
    try {
      const deals = JSON.parse(dealsRaw);
      console.log(`Found ${deals.length} deals to migrate`);

      const res = await fetch("/api/deals/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deals }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`Migrated ${data.imported} deals`);
      } else {
        const err = await res.json();
        console.error("Deal migration failed:", err);
      }
    } catch (e) {
      console.error("Error parsing deals:", e);
    }
  } else {
    console.log("No deals found in localStorage");
  }

  // Migrate tools
  const toolsRaw = localStorage.getItem("justhousesErp_toolLocker");
  if (toolsRaw) {
    try {
      const toolData = JSON.parse(toolsRaw);
      console.log(`Found ${toolData.tools?.length || 0} tools to migrate`);

      const res = await fetch("/api/tools/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toolData),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Migrated tools:", data.imported);
      } else {
        const err = await res.json();
        console.error("Tool migration failed:", err);
      }
    } catch (e) {
      console.error("Error parsing tools:", e);
    }
  } else {
    console.log("No tools found in localStorage");
  }

  console.log("Migration complete! Refresh the page to see your data.");
}

// Export for use
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).migrateAll = migrateAll;
}

export { migrateAll };
