import { describe, it, expect } from "vitest";
import { AppError, ConfigError, ValidationError, LlmError, PipelineStepError } from "./app-error.js";

describe("AppError", () => {
  it("should create an error with code and message", () => {
    const err = new AppError("TEST_ERROR", "Something went wrong");
    expect(err.code).toBe("TEST_ERROR");
    expect(err.message).toBe("Something went wrong");
    expect(err.name).toBe("AppError");
  });

  it("should support optional details", () => {
    const err = new AppError("TEST_ERROR", "msg", { key: "value" });
    expect(err.details).toEqual({ key: "value" });
  });
});

describe("ConfigError", () => {
  it("should have CONFIG_ERROR code", () => {
    const err = new ConfigError("Config missing");
    expect(err.code).toBe("CONFIG_ERROR");
    expect(err.name).toBe("ConfigError");
  });
});

describe("ValidationError", () => {
  it("should have VALIDATION_ERROR code", () => {
    const err = new ValidationError("Invalid input");
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("LlmError", () => {
  it("should have LLM_ERROR code", () => {
    const err = new LlmError("API call failed");
    expect(err.code).toBe("LLM_ERROR");
  });
});

describe("PipelineStepError", () => {
  it("should include step name in details", () => {
    const err = new PipelineStepError("analyze", "Step failed");
    expect(err.code).toBe("PIPELINE_STEP_ERROR");
    expect(err.step).toBe("analyze");
    expect(err.details?.step).toBe("analyze");
  });
});
