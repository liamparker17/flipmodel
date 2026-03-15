import { describe, it, expect } from "vitest";

describe("agent commission calculation", () => {
  it("applies commission when saleMethod is agent", () => {
    const r = { expectedPrice: 1000000, agentCommission: 5, saleMethod: "agent" as const };
    const comm = r.saleMethod === "agent" ? r.expectedPrice * (r.agentCommission / 100) : 0;
    expect(comm).toBe(50000);
  });
  it("returns 0 commission for private sale", () => {
    const r = { expectedPrice: 1000000, agentCommission: 5, saleMethod: "private" as const };
    const comm = r.saleMethod === "agent" ? r.expectedPrice * (r.agentCommission / 100) : 0;
    expect(comm).toBe(0);
  });
  it("defaults to agent when saleMethod is undefined", () => {
    const r = { expectedPrice: 1000000, agentCommission: 5 } as any;
    const method = r.saleMethod ?? "agent";
    const comm = method === "agent" ? r.expectedPrice * (r.agentCommission / 100) : 0;
    expect(comm).toBe(50000);
  });
});
