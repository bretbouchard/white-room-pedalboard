import { isValidParameterAddressString } from "../validation/parameter-address-validator";

describe("ParameterAddress validator", () => {
  it("accepts hierarchical addresses", () => {
    expect(isValidParameterAddressString("/role/bass/volume")).toBe(true);
    expect(
      isValidParameterAddressString("/instrument/lead/filter/cutoff"),
    ).toBe(true);
  });
  it("rejects plain names and indices", () => {
    expect(isValidParameterAddressString("cutoff")).toBe(false);
    expect(isValidParameterAddressString("param[3]")).toBe(false);
  });
});
