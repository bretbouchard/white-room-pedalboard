/**
 * JSON Serializer
 * Serializes and deserializes theory objects
 */

export class JSONSerializer {
  serialize(obj: any): string {
    return JSON.stringify(obj);
  }

  deserialize<T>(json: string): T {
    return JSON.parse(json) as T;
  }

  serializeToBytes(obj: any): Uint8Array {
    const str = this.serialize(obj);
    return new TextEncoder().encode(str);
  }

  deserializeFromBytes<T>(bytes: Uint8Array): T {
    const str = new TextDecoder().decode(bytes);
    return this.deserialize<T>(str);
  }
}
