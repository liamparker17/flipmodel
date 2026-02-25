import { describe, it, expect } from "vitest";
import { validateStageTransition, STAGE_ORDER } from "../stageValidation";

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
      expect(validateStageTransition("analysing", "renovating")).toBeNull();
      expect(validateStageTransition("purchased", "listed")).toBeNull();
    });
  });

  describe("backward transitions", () => {
    it("allows moving backward by exactly one stage", () => {
      expect(validateStageTransition("analysing", "lead")).toBeNull();
      expect(validateStageTransition("offer_made", "analysing")).toBeNull();
      expect(validateStageTransition("purchased", "offer_made")).toBeNull();
      expect(validateStageTransition("renovating", "purchased")).toBeNull();
      expect(validateStageTransition("listed", "renovating")).toBeNull();
    });

    it("rejects moving backward by more than one stage", () => {
      expect(validateStageTransition("purchased", "lead")).not.toBeNull();
      expect(validateStageTransition("renovating", "analysing")).not.toBeNull();
      expect(validateStageTransition("listed", "purchased")).not.toBeNull();
      expect(validateStageTransition("listed", "lead")).not.toBeNull();
    });
  });

  describe("same stage", () => {
    it("allows staying on the same stage for non-sold stages", () => {
      for (const stage of STAGE_ORDER) {
        if (stage === "sold") continue;
        expect(validateStageTransition(stage, stage)).toBeNull();
      }
    });

    it("does not allow sold to sold (sold is fully locked)", () => {
      expect(validateStageTransition("sold", "sold")).toBe(
        "A sold deal cannot be moved to any other stage"
      );
    });
  });

  describe("sold stage restrictions", () => {
    it("prevents moving from sold to any other stage", () => {
      for (const stage of STAGE_ORDER) {
        if (stage === "sold") continue;
        const result = validateStageTransition("sold", stage);
        expect(result).toBe("A sold deal cannot be moved to any other stage");
      }
    });

    it("also blocks sold to sold", () => {
      expect(validateStageTransition("sold", "sold")).toBe(
        "A sold deal cannot be moved to any other stage"
      );
    });
  });

  describe("invalid stages", () => {
    it("returns error for unknown current stage", () => {
      const result = validateStageTransition("unknown", "lead");
      expect(result).toContain("Invalid stage");
    });

    it("returns error for unknown new stage", () => {
      const result = validateStageTransition("lead", "unknown");
      expect(result).toContain("Invalid stage");
    });

    it("returns error when both stages are unknown", () => {
      const result = validateStageTransition("foo", "bar");
      expect(result).toContain("Invalid stage");
    });
  });

  describe("STAGE_ORDER", () => {
    it("contains all expected stages in order", () => {
      expect(STAGE_ORDER).toEqual([
        "lead",
        "analysing",
        "offer_made",
        "purchased",
        "renovating",
        "listed",
        "sold",
      ]);
    });

    it("has 7 stages", () => {
      expect(STAGE_ORDER).toHaveLength(7);
    });
  });
});
