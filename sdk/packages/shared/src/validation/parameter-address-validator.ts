/** Simple validator to enforce ParameterAddress strings */
export function isValidParameterAddressString(addr: string): boolean {
  // Accept prefixes: /role/, /track/, /bus/, /instrument/, /global/
  return (
    typeof addr === "string" &&
    /^\/(role|track|bus|instrument|global)\/[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)*$/.test(
      addr,
    )
  );
}
