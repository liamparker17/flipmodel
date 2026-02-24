import { describe, it, expect } from "vitest";
import { validateStageTransition, STAGE_ORDER } from "../../../utils/stageValidation";

describe("validateStageTransition", () => {
  describe("forward transitions", () => {
    it("allows moving forward by one stage", () => {
      expect(validateStageTransition("lead", "analysing")).toBeNull();
      expect(validateStageTransition("analysing", "offer_made")).toBeNull();
      expect(validateStageTransition("offer_made", "purchased")).toBeNull();
      expect(validateStageTransition("purchased", "renovating")).toBeNull();
      expect(validateStageTransition("renovating", "listed")).toBeNull();
      expect(validateStageTransition("listed", "sold")).toBeNull();
    });

    it("allows skipping stages forward", () => {
      expect(validateStageTransition("lead", "purchased")).toBeNull();
      expect(validateStageTransition("lead", "sold")).toBeNull();
      expect(validateStageTransition("analysing", "listed")).toBeNull();
    });
  });

  describe("backward transitions", () => {
    it("allows moving backward by exactly one stage", () => {
      expect(validateStageTransition("analysing", "lead")).toBeNull();
      expect(validateStageTransition("offer_made", "analysing")).toBeNull();
      expect(validateStageTransition("renovating", "purchased")).toBeNull();
    });

    it("rejects moving backward by more than one stage", () => {
      const result = validateStageTransition("purchased", "lead");
      expect(result).not.toBeNull();
      expect(result).toContain("Cannot move from");
    });

    it("rejects moving backward by two stages", () => {
      const result = validateStageTransition("renovating", "analysing");
      expect(result).not.toBeNull();
      expect(result).toContain("backward by one stage");
    });
  });

  describe("sold deals", () => {
    it("prevents sold deals from being moved to any stage", () => {
      for (const stage of STAGE_ORDER) {
        if (stage === "sold") continue;
        const result = validateStageTransition("sold", stage);
        expect(result).toBe("A sold deal cannot be moved to any other stage");
      }
    });
  });

  describe("same stage", () => {
    it("allows staying on the same stage (no-op)", () => {
      for (const stage of STAGE_ORDER) {
        // "sold" to "sold" is blocked by the sold check first
        if (stage === "sold") continue;
        expect(validateStageTransition(stage, stage)).toBeNull();
      }
    });
  });

  describe("invalid stage names", () => {
    it("rejects an invalid new stage", () => {
      const result = validateStageTransition("lead", "nonexistent");
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid stage");
      expect(result).toContain("nonexistent");
    });

    it("rejects an invalid current stage", () => {
      const result = validateStageTransition("fake_stage", "lead");
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid stage");
    });

    it("rejects when both stages are invalid", () => {
      const result = validateStageTransition("abc", "xyz");
      expect(result).not.toBeNull();
      expect(result).toContain("Invalid stage");
    });
  });
});
